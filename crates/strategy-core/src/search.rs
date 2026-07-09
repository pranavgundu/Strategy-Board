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

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MatchResult {
    pub score: i32,
    pub matched_indices: Vec<u32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchItem {
    pub name: String,
    pub name_lower: String,
    pub details: String,
    pub details_lower: String,
    pub key: String,
    pub key_lower: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchMatch {
    pub index: u32,
    pub score: i32,
    pub matched_indices: Vec<u32>,
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
        0x20  | 0x2D  | 0x5F  | 0x2E  | 0x2C
        | 0x28  | 0x29  | 0x2F  | 0x5C
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
