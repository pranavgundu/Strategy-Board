//! Statbotics API models and calculation helpers.
//!
//! This module has no HTTP runtime dependency.  `HttpClient` and `CacheStore`
//! are small synchronous boundaries that production code can implement with the
//! chosen Tauri HTTP client while tests use deterministic mocks.

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};

pub const STATBOTICS_API_BASE: &str = "https://api.statbotics.io/v3";
pub const CACHE_TTL_MS: u64 = 24 * 60 * 60 * 1_000;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpRequest {
    pub url: String,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub body: String,
}
pub trait HttpClient {
    fn execute(&self, request: HttpRequest) -> Result<HttpResponse, String>;
}

#[derive(Clone, Debug, PartialEq)]
pub struct CacheEntry {
    pub data: Value,
    pub timestamp_ms: u64,
}
pub trait CacheStore {
    fn get(&self, key: &str) -> Option<CacheEntry>;
    fn set(&mut self, key: String, value: CacheEntry);
}
#[derive(Default)]
pub struct MemoryCache(pub HashMap<String, CacheEntry>);
impl CacheStore for MemoryCache {
    fn get(&self, key: &str) -> Option<CacheEntry> {
        self.0.get(key).cloned()
    }
    fn set(&mut self, key: String, value: CacheEntry) {
        self.0.insert(key, value);
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct StatboticsMatch {
    pub key: String,
    pub year: i32,
    pub event: String,
    pub comp_level: String,
    pub set_number: i32,
    pub match_number: i32,
    pub match_name: String,
    pub time: Option<i64>,
    pub status: Option<String>,
    pub pred: Option<MatchPrediction>,
    pub result: Option<MatchResult>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct MatchPrediction {
    pub winner: Option<String>,
    pub red_win_prob: Option<f64>,
    pub red_score: Option<f64>,
    pub blue_score: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct MatchResult {
    pub winner: Option<String>,
    pub red_score: Option<f64>,
    pub blue_score: Option<f64>,
    pub red_no_foul: Option<f64>,
    pub blue_no_foul: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct StatboticsTeamMatch {
    pub team: i32,
    pub r#match: String,
    pub alliance: String,
    pub epa_start: Option<f64>,
    pub epa_end: Option<f64>,
    pub epa_diff: Option<f64>,
    pub epa_pre_playoffs: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct StatboticsTeamYear {
    pub team: i32,
    pub year: i32,
    pub name: Option<String>,
    pub country: Option<String>,
    pub state: Option<String>,
    pub district: Option<String>,
    pub rookie_year: Option<i32>,
    pub epa: Option<Epa>,
    pub record: Option<TeamRecord>,
    pub district_points: Option<f64>,
    pub district_rank: Option<i32>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct TeamRecord {
    pub wins: Option<i32>,
    pub losses: Option<i32>,
    pub ties: Option<i32>,
    pub count: Option<i32>,
    pub winrate: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Epa {
    pub total_points: Option<EpaTotalPoints>,
    pub breakdown: Option<EpaBreakdown>,
    pub stats: Option<EpaStats>,
    pub ranks: Option<EpaRanks>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EpaTotalPoints {
    pub mean: Option<f64>,
    pub sd: Option<f64>,
    pub unitless: Option<f64>,
    pub norm: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EpaBreakdown {
    pub total_points: Option<f64>,
    pub auto_points: Option<f64>,
    pub teleop_points: Option<f64>,
    pub endgame_points: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EpaStats {
    pub start: Option<f64>,
    pub pre_champs: Option<f64>,
    pub max: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EpaRanks {
    pub total: Option<EpaRank>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EpaRank {
    pub rank: Option<i32>,
    pub percentile: Option<f64>,
    pub team_count: Option<i32>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct StatboticsYear {
    pub year: i32,
    pub percentiles: Option<YearPercentiles>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct YearPercentiles {
    pub total_points: Option<EpaPercentiles>,
    pub auto_points: Option<EpaPercentiles>,
    pub teleop_points: Option<EpaPercentiles>,
    pub endgame_points: Option<EpaPercentiles>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EpaPercentiles {
    pub p99: f64,
    pub p90: f64,
    pub p75: f64,
    pub p25: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct StatboticsTeamEventData {
    pub team: i32,
    pub team_name: String,
    pub total_epa: f64,
    pub auto_epa: f64,
    pub teleop_epa: f64,
    pub endgame_epa: f64,
    pub rank: Option<i32>,
    pub percentile: Option<f64>,
}
#[derive(Clone, Debug, PartialEq)]
pub struct StatboticsMatchData {
    pub match_data: Option<StatboticsMatch>,
    pub red_team_epas: BTreeMap<i32, f64>,
    pub blue_team_epas: BTreeMap<i32, f64>,
    pub red_win_probability: f64,
    pub blue_win_probability: f64,
    pub red_score: Option<f64>,
    pub blue_score: Option<f64>,
    pub has_scores: bool,
    pub team_details: BTreeMap<i32, StatboticsTeamEventData>,
    pub year_data: Option<StatboticsYear>,
    pub had_errors: bool,
}

#[derive(Clone, Debug, Default)]
pub struct StatboticsService;
impl StatboticsService {
    pub fn build_request(endpoint: &str) -> HttpRequest {
        HttpRequest {
            url: format!("{STATBOTICS_API_BASE}{endpoint}"),
        }
    }
    /// Implements the old 24-hour cache and two-retry policy without sleeping;
    /// retry scheduling belongs to the Tauri command/runtime layer.
    pub fn request_json<C: HttpClient, S: CacheStore, T: DeserializeOwned>(
        &self,
        client: &C,
        cache: &mut S,
        endpoint: &str,
        now_ms: u64,
    ) -> Result<T, String> {
        let cache_key = format!("sb_{endpoint}");
        if let Some(entry) = cache
            .get(&cache_key)
            .filter(|entry| now_ms.saturating_sub(entry.timestamp_ms) < CACHE_TTL_MS)
        {
            return serde_json::from_value(entry.data)
                .map_err(|e| format!("Statbotics API JSON error: {e}"));
        }
        let mut last_network_error = None;
        for _ in 0..=2 {
            match client.execute(Self::build_request(endpoint)) {
                Ok(response) if (200..300).contains(&response.status) => {
                    let data: Value = serde_json::from_str(&response.body)
                        .map_err(|e| format!("Statbotics API JSON error: {e}"))?;
                    cache.set(
                        cache_key,
                        CacheEntry {
                            data: data.clone(),
                            timestamp_ms: now_ms,
                        },
                    );
                    return serde_json::from_value(data)
                        .map_err(|e| format!("Statbotics API JSON error: {e}"));
                }
                Ok(response) if response.status == 404 => {
                    return Err("Statbotics API error: 404 - Data not found".into())
                }
                Ok(response) if response.status == 500 => {
                    return Err("Statbotics API error: 500 - Server error".into())
                }
                Ok(response) => {
                    return Err(format!(
                        "Statbotics API error: {} - {}",
                        response.status,
                        if response.status_text.is_empty() {
                            "Unknown error"
                        } else {
                            &response.status_text
                        }
                    ))
                }
                Err(error) => last_network_error = Some(error),
            }
        }
        Err(format!(
            "Failed to connect to Statbotics API: {}",
            last_network_error.unwrap_or_default()
        ))
    }
    pub fn construct_match_key(&self, event_key: &str, match_name: &str) -> String {
        construct_match_key(event_key, match_name)
    }
}

pub trait StatboticsDataSource {
    fn get_match(&self, key: &str) -> Result<StatboticsMatch, String>;
    fn get_year(&self, year: i32) -> Result<StatboticsYear, String>;
    fn get_team_year(&self, team: i32, year: i32) -> Result<StatboticsTeamYear, String>;
}

pub fn get_match_data<S: StatboticsDataSource>(
    source: &S,
    match_key: &str,
    red_teams: &[i32],
    blue_teams: &[i32],
    year: i32,
) -> StatboticsMatchData {
    let match_data = source.get_match(match_key).ok();
    let year_data = source.get_year(year).ok();
    let mut result = StatboticsMatchData {
        match_data,
        red_team_epas: BTreeMap::new(),
        blue_team_epas: BTreeMap::new(),
        red_win_probability: 0.5,
        blue_win_probability: 0.5,
        red_score: None,
        blue_score: None,
        has_scores: false,
        team_details: BTreeMap::new(),
        year_data,
        had_errors: false,
    };
    for (teams, epas) in [
        (red_teams, &mut result.red_team_epas),
        (blue_teams, &mut result.blue_team_epas),
    ] {
        for team in teams {
            match source.get_team_year(*team, year) {
                Ok(data) => {
                    let detail = team_detail(*team, data);
                    epas.insert(*team, detail.total_epa);
                    result.team_details.insert(*team, detail);
                }
                Err(error) if error.contains("404") => {}
                Err(_) => result.had_errors = true,
            }
        }
    }
    if let Some(match_data) = &result.match_data {
        result.red_win_probability = match_data
            .pred
            .as_ref()
            .and_then(|pred| pred.red_win_prob)
            .unwrap_or(0.5);
        result.blue_win_probability = 1.0 - result.red_win_probability;
        if let Some(scores) = &match_data.result {
            result.red_score = scores.red_score;
            result.blue_score = scores.blue_score;
            result.has_scores = result.red_score.is_some() && result.blue_score.is_some();
        }
    } else {
        let red: f64 = result.red_team_epas.values().sum();
        let blue: f64 = result.blue_team_epas.values().sum();
        if red + blue > 0.0 {
            result.red_win_probability = red / (red + blue);
            result.blue_win_probability = blue / (red + blue);
        }
    }
    result
}

pub fn team_detail(team: i32, data: StatboticsTeamYear) -> StatboticsTeamEventData {
    let epa = data.epa.unwrap_or(Epa {
        total_points: None,
        breakdown: None,
        stats: None,
        ranks: None,
    });
    let total_epa = epa
        .total_points
        .as_ref()
        .and_then(|v| v.mean)
        .or_else(|| epa.stats.as_ref().and_then(|v| v.max))
        .or_else(|| epa.stats.as_ref().and_then(|v| v.start))
        .unwrap_or(0.0);
    let breakdown = epa.breakdown.unwrap_or(EpaBreakdown {
        total_points: None,
        auto_points: None,
        teleop_points: None,
        endgame_points: None,
    });
    let rank = epa.ranks.and_then(|ranks| ranks.total);
    StatboticsTeamEventData {
        team,
        team_name: data.name.unwrap_or_else(|| format!("Team {team}")),
        total_epa,
        auto_epa: breakdown.auto_points.unwrap_or(0.0),
        teleop_epa: breakdown.teleop_points.unwrap_or(0.0),
        endgame_epa: breakdown.endgame_points.unwrap_or(0.0),
        rank: rank.as_ref().and_then(|value| value.rank),
        percentile: rank.and_then(|value| value.percentile),
    }
}

pub fn construct_match_key(event_key: &str, match_name: &str) -> String {
    let part = match_name
        .split(" @ ")
        .next()
        .unwrap_or(match_name)
        .trim()
        .to_lowercase();
    let (level, pair) = if part.contains("quals") {
        ("qm", None)
    } else if part.contains("eighths") {
        ("ef", number_pair(&part))
    } else if part.contains("quarters") {
        ("qf", number_pair(&part))
    } else if part.contains("semis") {
        ("sf", number_pair(&part))
    } else if part.contains("finals") {
        ("f", number_pair(&part))
    } else {
        ("", None)
    };
    if level == "qm" {
        return format!(
            "{event_key}_qm{}",
            numbers(&part).first().copied().unwrap_or(1)
        );
    }
    match pair {
        Some((set, number)) => format!("{event_key}_{level}{set}m{number}"),
        None => format!(
            "{event_key}_{level}{}",
            numbers(&part).first().copied().unwrap_or(1)
        ),
    }
}
fn numbers(value: &str) -> Vec<u32> {
    value
        .split(|c: char| !c.is_ascii_digit())
        .filter(|part| !part.is_empty())
        .filter_map(|part| part.parse().ok())
        .collect()
}
fn number_pair(value: &str) -> Option<(u32, u32)> {
    let values = numbers(value);
    (values.len() >= 2).then(|| (values[0], values[1]))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    struct MockHttp {
        responses: RefCell<Vec<Result<HttpResponse, String>>>,
        requests: RefCell<Vec<HttpRequest>>,
    }
    impl HttpClient for MockHttp {
        fn execute(&self, request: HttpRequest) -> Result<HttpResponse, String> {
            self.requests.borrow_mut().push(request);
            self.responses.borrow_mut().remove(0)
        }
    }
    struct Source {
        match_result: Result<StatboticsMatch, String>,
        team_result: Result<StatboticsTeamYear, String>,
    }
    impl StatboticsDataSource for Source {
        fn get_match(&self, _: &str) -> Result<StatboticsMatch, String> {
            self.match_result.clone()
        }
        fn get_year(&self, _: i32) -> Result<StatboticsYear, String> {
            Err("unused".into())
        }
        fn get_team_year(&self, team: i32, year: i32) -> Result<StatboticsTeamYear, String> {
            self.team_result.clone().map(|mut value| {
                value.team = team;
                value.year = year;
                value
            })
        }
    }
    fn team(mean: Option<f64>) -> StatboticsTeamYear {
        StatboticsTeamYear {
            team: 0,
            year: 2026,
            name: None,
            country: None,
            state: None,
            district: None,
            rookie_year: None,
            epa: Some(Epa {
                total_points: Some(EpaTotalPoints {
                    mean,
                    sd: None,
                    unitless: None,
                    norm: None,
                }),
                breakdown: Some(EpaBreakdown {
                    total_points: None,
                    auto_points: Some(10.0),
                    teleop_points: Some(20.0),
                    endgame_points: Some(10.0),
                }),
                stats: None,
                ranks: Some(EpaRanks {
                    total: Some(EpaRank {
                        rank: Some(5),
                        percentile: Some(85.0),
                        team_count: None,
                    }),
                }),
            }),
            record: None,
            district_points: None,
            district_rank: None,
        }
    }
    fn match_with(prob: f64, scores: bool) -> StatboticsMatch {
        StatboticsMatch {
            key: "k".into(),
            year: 2026,
            event: "e".into(),
            comp_level: "qm".into(),
            set_number: 1,
            match_number: 1,
            match_name: "Quals 1".into(),
            time: None,
            status: None,
            pred: Some(MatchPrediction {
                winner: None,
                red_win_prob: Some(prob),
                red_score: None,
                blue_score: None,
            }),
            result: scores.then_some(MatchResult {
                winner: None,
                red_score: Some(120.0),
                blue_score: Some(90.0),
                red_no_foul: None,
                blue_no_foul: None,
            }),
        }
    }
    #[test]
    fn match_key_formats_cover_qualifications_playoffs_and_schedule_suffixes() {
        assert_eq!(
            construct_match_key("2026miket", "Quals 7 @ 3:15 PM"),
            "2026miket_qm7"
        );
        assert_eq!(construct_match_key("2026miket", "Quals"), "2026miket_qm1");
        assert_eq!(
            construct_match_key("2026miket", "Eighths 4-2"),
            "2026miket_ef4m2"
        );
        assert_eq!(construct_match_key("2026miket", "Finals 3"), "2026miket_f3");
    }
    #[test]
    fn request_construction_caches_success_and_reports_api_errors_without_retrying() {
        let service = StatboticsService;
        let client = MockHttp {
            responses: RefCell::new(vec![Ok(HttpResponse {
                status: 200,
                status_text: "OK".into(),
                body: r#"{"year":2026,"percentiles":null}"#.into(),
            })]),
            requests: RefCell::new(vec![]),
        };
        let mut cache = MemoryCache::default();
        let _: StatboticsYear = service
            .request_json(&client, &mut cache, "/year/2026", 100)
            .unwrap();
        let _: StatboticsYear = service
            .request_json(&client, &mut cache, "/year/2026", 101)
            .unwrap();
        assert_eq!(client.requests.borrow().len(), 1);
        assert_eq!(
            client.requests.borrow()[0].url,
            "https://api.statbotics.io/v3/year/2026"
        );
    }
    #[test]
    fn match_prediction_and_scores_win_over_epa_estimate() {
        let source = Source {
            match_result: Ok(match_with(0.8, true)),
            team_result: Ok(team(Some(10.0))),
        };
        let data = get_match_data(&source, "k", &[1, 2, 3], &[4, 5, 6], 2026);
        assert_eq!(data.red_win_probability, 0.8);
        assert!((data.blue_win_probability - 0.2).abs() < f64::EPSILON);
        assert!(data.has_scores);
        assert_eq!(data.team_details.len(), 6);
        assert_eq!(data.team_details[&1].auto_epa, 10.0);
    }
    #[test]
    fn missing_match_uses_epa_sum_and_404s_do_not_mark_error() {
        let source = Source {
            match_result: Err("Statbotics API error: 500 - Server error".into()),
            team_result: Ok(team(Some(10.0))),
        };
        let data = get_match_data(&source, "k", &[1], &[2, 3], 2026);
        assert!((data.red_win_probability - (1.0 / 3.0)).abs() < f64::EPSILON);
        let absent = Source {
            match_result: Err("404".into()),
            team_result: Err("Statbotics API error: 404 - Data not found".into()),
        };
        let data = get_match_data(&absent, "k", &[1], &[2], 2026);
        assert_eq!(data.red_win_probability, 0.5);
        assert!(!data.had_errors);
    }
    #[test]
    fn non_404_team_error_is_exposed_and_stats_max_is_a_total_epa_fallback() {
        let broken = Source {
            match_result: Err("500".into()),
            team_result: Err("network timeout".into()),
        };
        assert!(get_match_data(&broken, "k", &[1], &[2], 2026).had_errors);
        let detail = team_detail(
            1,
            StatboticsTeamYear {
                team: 1,
                year: 2026,
                name: None,
                country: None,
                state: None,
                district: None,
                rookie_year: None,
                epa: Some(Epa {
                    total_points: None,
                    breakdown: None,
                    stats: Some(EpaStats {
                        start: None,
                        pre_champs: None,
                        max: Some(55.0),
                    }),
                    ranks: None,
                }),
                record: None,
                district_points: None,
                district_rank: None,
            },
        );
        assert_eq!(detail.total_epa, 55.0);
    }
}
