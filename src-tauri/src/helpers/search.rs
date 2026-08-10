use serde::{Deserialize, Serialize};

const SCORE_EXACT_MATCH: i32 = 100;
const SCORE_STARTS_WITH: i32 = 50;
const SCORE_WORD_BOUNDARY: i32 = 30;
const SCORE_CONSECUTIVE_BONUS: i32 = 15;
const SCORE_CAMEL_CASE_MATCH: i32 = 20;
const SCORE_CHARACTER_MATCH: i32 = 10;
const SCORE_GAP_PENALTY: i32 = -3;
const SCORE_FIRST_CHAR_BONUS: i32 = 15;
const SCORE_NAME_FIELD_BONUS: i32 = 20;

#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MatchResult {
    pub score: i32,
    pub matched_indices: Vec<u32>,
}

#[derive(Debug, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BatchItem {
    pub name: String,
    pub name_lower: String,
    pub details: String,
    pub details_lower: String,
    pub key: String,
    pub key_lower: String,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BatchMatch {
    pub index: u32,
    pub score: i32,
    pub matched_indices: Vec<u32>,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SearchableRecord {
    pub searchable_text: String,
    pub name: String,
    pub details: String,
    pub key: String,
}

pub fn event_record(
    name: Option<&str>,
    details: Option<&str>,
    key: Option<&str>,
) -> SearchableRecord {
    let name = name.unwrap_or_default().to_owned();
    let details = details.unwrap_or_default().to_owned();
    let key = key.unwrap_or_default().to_owned();
    SearchableRecord {
        searchable_text: format!("{name} {details} {key}").to_lowercase(),
        name,
        details,
        key,
    }
}

pub fn team_record(team_number: Option<&str>, text: Option<&str>) -> SearchableRecord {
    let key = team_number.unwrap_or_default().to_owned();
    let name = text.unwrap_or_default().to_owned();
    SearchableRecord {
        searchable_text: name.to_lowercase(),
        name,
        details: String::new(),
        key,
    }
}

pub fn fuzzy_match(
    search_term: &str,
    target: &str,
    original_target: Option<&str>,
) -> Option<MatchResult> {
    if search_term.is_empty() {
        return Some(MatchResult {
            score: 0,
            matched_indices: vec![],
        });
    }
    if target.is_empty() {
        return None;
    }

    let search: Vec<u16> = search_term.encode_utf16().collect();
    let target_units: Vec<u16> = target.encode_utf16().collect();
    let original: Vec<u16> = original_target.unwrap_or(target).encode_utf16().collect();

    if target_units == search {
        return Some(MatchResult {
            score: SCORE_EXACT_MATCH + search.len() as i32 * SCORE_CHARACTER_MATCH,
            matched_indices: (0..search.len() as u32).collect(),
        });
    }

    if let Some(exact_index) = find_substring(&target_units, &search) {
        let len = search.len() as i32;
        let mut score = SCORE_CHARACTER_MATCH * len + SCORE_CONSECUTIVE_BONUS * (len - 1);
        if exact_index == 0 {
            score += SCORE_STARTS_WITH;
        }
        if exact_index == 0 || is_word_boundary(&target_units, exact_index) {
            score += SCORE_WORD_BOUNDARY;
        }
        return Some(MatchResult {
            score,
            matched_indices: (exact_index as u32..(exact_index + search.len()) as u32).collect(),
        });
    }

    calculate_fuzzy_score(&search, &target_units, &original)
}

fn find_substring(haystack: &[u16], needle: &[u16]) -> Option<usize> {
    if needle.len() > haystack.len() {
        return None;
    }
    haystack.windows(needle.len()).position(|w| w == needle)
}

fn is_word_boundary(units: &[u16], index: usize) -> bool {
    if index == 0 {
        return true;
    }
    matches!(
        units[index - 1],
        0x20 | 0x2D | 0x5F | 0x2E | 0x2C | 0x28 | 0x29 | 0x2F | 0x5C
    )
}

fn is_camel_case_boundary(original: &[u16], index: usize) -> bool {
    if index == 0 || index >= original.len() {
        return false;
    }
    let ch = original[index];
    let prev = original[index - 1];
    (0x41..=0x5A).contains(&ch) && (0x61..=0x7A).contains(&prev)
}

fn calculate_fuzzy_score(search: &[u16], target: &[u16], original: &[u16]) -> Option<MatchResult> {
    let search_len = search.len();
    let target_len = target.len();

    if search_len > target_len {
        return None;
    }

    let mut matched: Vec<usize> = Vec::with_capacity(search_len);
    let mut search_idx = 0usize;
    for (i, &unit) in target.iter().enumerate() {
        if search_idx >= search_len {
            break;
        }
        if unit == search[search_idx] {
            matched.push(i);
            search_idx += 1;
        }
    }

    if search_idx != search_len {
        return None;
    }

    let mut score = 0i32;
    let mut consecutive_count = 0i32;
    let mut prev_match_idx: i64 = -2;

    for (i, &match_idx) in matched.iter().enumerate() {
        score += SCORE_CHARACTER_MATCH;

        if i == 0 && match_idx == 0 {
            score += SCORE_FIRST_CHAR_BONUS;
        }

        if is_word_boundary(target, match_idx) {
            score += SCORE_WORD_BOUNDARY;
        }

        if is_camel_case_boundary(original, match_idx) {
            score += SCORE_CAMEL_CASE_MATCH;
        }

        if match_idx as i64 == prev_match_idx + 1 {
            consecutive_count += 1;
            score += SCORE_CONSECUTIVE_BONUS * consecutive_count;
        } else {
            consecutive_count = 0;
            if i > 0 {
                let gap = (match_idx as i64 - prev_match_idx - 1) as i32;
                score += SCORE_GAP_PENALTY * gap.min(5);
            }
        }

        prev_match_idx = match_idx as i64;
    }

    score += (20 - (target_len as i32 - search_len as i32)).max(0);

    Some(MatchResult {
        score,
        matched_indices: matched.iter().map(|&i| i as u32).collect(),
    })
}

pub fn fuzzy_search_batch(
    items: &[BatchItem],
    search_lower: &str,
    min_score: i32,
) -> Vec<BatchMatch> {
    let mut matches: Vec<BatchMatch> = Vec::new();

    for (index, item) in items.iter().enumerate() {
        let name_match = fuzzy_match(search_lower, &item.name_lower, Some(&item.name));
        let details_match = fuzzy_match(search_lower, &item.details_lower, Some(&item.details));
        let key_match = fuzzy_match(search_lower, &item.key_lower, Some(&item.key));

        let mut best: Option<MatchResult> = None;

        if let Some(m) = name_match {
            best = Some(MatchResult {
                score: m.score + SCORE_NAME_FIELD_BONUS,
                matched_indices: m.matched_indices,
            });
        }
        if let Some(m) = details_match {
            if best.as_ref().is_none_or(|b| m.score > b.score) {
                best = Some(m);
            }
        }
        if let Some(m) = key_match {
            if best.as_ref().is_none_or(|b| m.score > b.score) {
                best = Some(m);
            }
        }

        if let Some(b) = best {
            if b.score >= min_score {
                matches.push(BatchMatch {
                    index: index as u32,
                    score: b.score,
                    matched_indices: b.matched_indices,
                });
            }
        }
    }

    matches.sort_by_key(|m| std::cmp::Reverse(m.score));
    matches
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(name: &str, details: &str, key: &str) -> BatchItem {
        BatchItem {
            name: name.to_owned(),
            name_lower: name.to_lowercase(),
            details: details.to_owned(),
            details_lower: details.to_lowercase(),
            key: key.to_owned(),
            key_lower: key.to_lowercase(),
        }
    }

    #[test]
    fn exact_matches_have_indices_and_a_strong_score() {
        for term in [
            "a",
            "qm",
            "event",
            "strategy",
            "board",
            "2026miket",
            "alpha-beta",
            "frc2056",
            "semis",
            "finals",
        ] {
            let result = fuzzy_match(term, term, None).unwrap();
            assert_eq!(
                result.matched_indices,
                (0..term.encode_utf16().count() as u32).collect::<Vec<_>>()
            );
            assert!(result.score > 100);
        }
    }

    #[test]
    fn impossible_and_empty_matches_follow_the_typescript_contract() {
        for (term, target) in [
            ("abc", ""),
            ("abcd", "abc"),
            ("xyz", "event"),
            ("zz", "quals"),
            ("999", "frc111"),
        ] {
            assert_eq!(fuzzy_match(term, target, None), None);
        }

        for target in ["", "2026", "quals", "team 1114"] {
            assert_eq!(
                fuzzy_match("", target, None),
                Some(MatchResult {
                    score: 0,
                    matched_indices: vec![],
                })
            );
        }
    }

    #[test]
    fn start_consecutive_and_first_character_matches_score_higher() {
        assert!(
            fuzzy_match("det", "detroit michigan", None).unwrap().score
                > fuzzy_match("det", "the detroit area", None).unwrap().score
        );
        assert!(
            fuzzy_match("abc", "abcdef", None).unwrap().score
                > fuzzy_match("abc", "axbxcx", None).unwrap().score
        );
        assert!(
            fuzzy_match("ab", "abcd", None).unwrap().score
                > fuzzy_match("ab", "xabcd", None).unwrap().score
        );
    }

    #[test]
    fn every_legacy_word_separator_gets_the_boundary_bonus() {
        for target in [
            "ef schedule",
            "x-ef schedule",
            "x_ef schedule",
            "x.ef schedule",
            "x,ef schedule",
            "x(ef schedule",
            "x)ef schedule",
            "x/ef schedule",
            "x\\ef schedule",
        ] {
            assert!(
                fuzzy_match("ef", target, None).unwrap().score
                    > fuzzy_match("ef", "xxefyy", None).unwrap().score,
                "missing boundary bonus for {target}"
            );
        }
    }

    #[test]
    fn camel_case_boundaries_in_the_original_text_increase_score() {
        for (term, lower, original) in [
            ("sb", "strategyboard", "StrategyBoard"),
            ("tb", "thebluealliance", "TheBlueAlliance"),
            ("mr", "matchreport", "MatchReport"),
            ("cv", "codeviewer", "CodeViewer"),
            ("dt", "drivetrain", "DriveTrain"),
            ("pg", "pathgenerator", "PathGenerator"),
            ("ra", "robotanalysis", "RobotAnalysis"),
            ("qd", "quickdraw", "QuickDraw"),
            ("wm", "whiteboardmanager", "WhiteboardManager"),
            ("cp", "cloudprovider", "CloudProvider"),
        ] {
            let camel = fuzzy_match(term, lower, Some(original)).unwrap();
            let plain = fuzzy_match(term, lower, Some(lower)).unwrap();
            assert!(
                camel.score > plain.score,
                "missing camel bonus for {original}"
            );
        }
    }

    #[test]
    fn numeric_and_single_character_searches_preserve_indices() {
        assert_eq!(
            fuzzy_match("1114", "1114 simbotics", None)
                .unwrap()
                .matched_indices,
            vec![0, 1, 2, 3]
        );
        assert_eq!(
            fuzzy_match("a", "abcdef", None).unwrap().matched_indices,
            vec![0]
        );
    }

    #[test]
    fn batch_search_sorts_filters_and_boosts_names() {
        let items = vec![
            item("General Item", "Strategy Board planning", "abc123"),
            item("Strategy Board", "General details", "zzz999"),
        ];
        let matches = fuzzy_search_batch(&items, "strategy", 0);
        assert_eq!(matches[0].index, 1);

        let key_items = vec![
            item("Some Event", "Info", "2026abc"),
            item("Michigan", "", "2026miket"),
        ];
        let matches = fuzzy_search_batch(&key_items, "2026miket", 0);
        assert_eq!(matches[0].index, 1);

        assert!(fuzzy_search_batch(&[item("Alpha", "Bravo", "charlie")], "zz", 999).is_empty());
        assert_eq!(
            fuzzy_search_batch(&[item("A", "", "1"), item("B", "", "2")], "", 0).len(),
            2
        );
    }

    #[test]
    fn batch_search_finds_each_legacy_field_case() {
        for (term, name, details, key) in [
            ("strategy", "Strategy Board", "General planning", "abc"),
            ("planning", "General board", "Planning details", "abc"),
            ("254", "General board", "No team here", "frc254"),
            ("miket", "Michigan Event", "Week 2", "2026miket"),
            ("semis", "Semis 1", "Playoffs", "sf1"),
            ("canada", "Ontario Regional", "Toronto, Canada", "cada"),
            ("quals", "Quals 3", "Schedule", "qm3"),
            ("district", "District Event", "Week 1", "dist"),
            ("team", "Team Picker", "Select team", "tp"),
            ("1114", "Simbotics", "Legend team", "1114"),
        ] {
            let items = vec![item("Other", "Elsewhere", "zzz"), item(name, details, key)];
            let matches = fuzzy_search_batch(&items, term, 1);
            assert_eq!(matches.len(), 1, "unexpected result count for {term}");
            assert_eq!(matches[0].index, 1, "wrong top match for {term}");
        }
    }

    #[test]
    fn event_and_team_records_preserve_the_dom_extraction_contract() {
        let complete = event_record(Some("Michigan Event"), Some("Week 2"), Some("2026miket"));
        assert_eq!(complete.name, "Michigan Event");
        assert_eq!(complete.details, "Week 2");
        assert_eq!(complete.key, "2026miket");
        assert!(complete.searchable_text.contains("michigan event"));

        let incomplete = event_record(Some("Canada Event"), None, Some("2026cada"));
        assert_eq!(incomplete.details, "");

        for (number, label) in [
            ("1114", "1114 - Simbotics"),
            ("2056", "2056 - OP Robotics"),
            ("254", "254 - Cheesy Poofs"),
            ("1678", "1678 - Citrus Circuits"),
            ("148", "148 - Robowranglers"),
            ("971", "971 - Spartan Robotics"),
            ("118", "118 - Robonauts"),
            ("1323", "1323 - Madtown"),
            ("2910", "2910 - Jack in the Bot"),
            ("4414", "4414 - HighTide"),
        ] {
            let record = team_record(Some(number), Some(label));
            assert_eq!(record.key, number);
            assert!(record.name.contains(number));
            assert!(record.searchable_text.contains(number));
        }
    }
}
