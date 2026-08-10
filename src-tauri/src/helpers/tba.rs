//! The Blue Alliance helper.
//!
//! Networking is deliberately supplied by the caller.  This keeps Tauri commands
//! testable and lets the application choose its HTTP implementation (`reqwest`, a
//! Tauri plugin, or a platform-specific client) at the integration boundary.

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

pub const TBA_API_BASE: &str = "https://www.thebluealliance.com/api/v3";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpRequest {
    pub url: String,
    pub headers: Vec<(String, String)>,
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

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TbaError(pub String);

impl std::fmt::Display for TbaError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for TbaError {}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct TbaAlliance {
    pub team_keys: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct TbaAlliances {
    pub red: TbaAlliance,
    pub blue: TbaAlliance,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct TbaMatch {
    pub key: String,
    pub comp_level: String,
    pub set_number: u32,
    pub match_number: u32,
    pub alliances: TbaAlliances,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct TbaEvent {
    pub key: String,
    pub name: String,
    pub event_code: String,
    pub event_type: i32,
    pub start_date: String,
    pub end_date: String,
    pub year: i32,
    pub city: Option<String>,
    pub state_prov: Option<String>,
    pub country: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct TbaSimpleEvent {
    pub key: String,
    pub name: String,
    pub location: String,
    pub date_range: String,
    pub year: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct TbaSimpleMatch {
    pub match_name: String,
    pub red_teams: Vec<String>,
    pub blue_teams: Vec<String>,
    pub match_key: String,
}

#[derive(Clone, Debug, Default)]
pub struct TbaService {
    api_key: Option<String>,
    shared_api_key: Option<String>,
}

impl TbaService {
    pub fn new(shared_api_key: Option<String>) -> Self {
        Self {
            api_key: None,
            shared_api_key,
        }
    }
    pub fn set_api_key(&mut self, key: impl Into<String>) {
        self.api_key = Some(key.into());
    }
    pub fn has_api_key(&self) -> bool {
        self.api_key.as_deref().is_some_and(|key| !key.is_empty())
            || self
                .shared_api_key
                .as_deref()
                .is_some_and(|key| !key.is_empty())
    }
    pub fn api_key(&self) -> Option<&str> {
        self.api_key.as_deref().or(self.shared_api_key.as_deref())
    }

    /// Creates the exact authenticated request without performing I/O.
    pub fn build_request(&self, endpoint: &str) -> Result<HttpRequest, TbaError> {
        let key = self
            .api_key()
            .ok_or_else(|| TbaError("TBA API key not set".into()))?;
        Ok(HttpRequest {
            url: format!("{TBA_API_BASE}{endpoint}"),
            headers: vec![("X-TBA-Auth-Key".into(), key.into())],
        })
    }

    pub fn request_json<C: HttpClient, T: DeserializeOwned>(
        &self,
        client: &C,
        endpoint: &str,
    ) -> Result<T, TbaError> {
        let response = client
            .execute(self.build_request(endpoint)?)
            .map_err(TbaError)?;
        if !(200..300).contains(&response.status) {
            return Err(TbaError(format!(
                "TBA API error: {} {}",
                response.status, response.status_text
            )));
        }
        serde_json::from_str(&response.body)
            .map_err(|error| TbaError(format!("TBA API JSON error: {error}")))
    }

    pub fn get_events<C: HttpClient>(
        &self,
        client: &C,
        year: i32,
    ) -> Result<Vec<TbaEvent>, TbaError> {
        self.request_json(client, &format!("/events/{year}"))
    }
    pub fn get_matches_at_event<C: HttpClient>(
        &self,
        client: &C,
        event_key: &str,
    ) -> Result<Vec<TbaMatch>, TbaError> {
        self.request_json(client, &format!("/event/{event_key}/matches"))
    }
    pub fn get_team_matches_at_event<C: HttpClient>(
        &self,
        client: &C,
        team_key: &str,
        event_key: &str,
    ) -> Result<Vec<TbaMatch>, TbaError> {
        self.request_json(
            client,
            &format!(
                "/team/{}/event/{event_key}/matches",
                normalize_team_key(team_key)
            ),
        )
    }
    pub fn get_team_events<C: HttpClient>(
        &self,
        client: &C,
        team_key: &str,
        year: i32,
    ) -> Result<Vec<TbaEvent>, TbaError> {
        self.request_json(
            client,
            &format!("/team/{}/events/{year}", normalize_team_key(team_key)),
        )
    }
    pub fn get_teams_at_event<C: HttpClient>(
        &self,
        client: &C,
        event_key: &str,
    ) -> Result<Vec<String>, TbaError> {
        self.request_json(client, &format!("/event/{event_key}/teams/keys"))
    }
    /// Equivalent to the TypeScript team's-endpoint fallback, with the caller
    /// providing the failed primary request result rather than hiding network I/O.
    pub fn teams_at_event_or_matches<C: HttpClient>(
        &self,
        client: &C,
        event_key: &str,
    ) -> Result<Vec<String>, TbaError> {
        self.get_teams_at_event(client, event_key).or_else(|_| {
            self.get_matches_at_event(client, event_key)
                .map(|matches| teams_from_matches(&matches))
        })
    }

    /// The browser's public convenience method returns team numbers, not the
    /// `frc`-prefixed identifiers transported by TBA.
    pub fn fetch_teams_at_event<C: HttpClient>(
        &self,
        client: &C,
        event_key: &str,
    ) -> Result<Vec<String>, TbaError> {
        self.teams_at_event_or_matches(client, event_key)
            .map(|keys| {
                keys.into_iter()
                    .map(|key| key.strip_prefix("frc").unwrap_or(&key).to_owned())
                    .collect()
            })
    }

    pub fn fetch_and_parse_team_matches<C: HttpClient>(
        &self,
        client: &C,
        team_key: &str,
        event_key: &str,
    ) -> Result<Vec<TbaSimpleMatch>, TbaError> {
        self.get_team_matches_at_event(client, team_key, event_key)
            .map(|matches| parse_matches_to_simple(&matches))
    }

    pub fn fetch_and_parse_events<C: HttpClient>(
        &self,
        client: &C,
        year: i32,
    ) -> Result<Vec<TbaSimpleEvent>, TbaError> {
        self.get_events(client, year)
            .map(|events| parse_events_to_simple(&events))
    }

    pub fn fetch_and_parse_all_matches<C: HttpClient>(
        &self,
        client: &C,
        event_key: &str,
    ) -> Result<Vec<TbaSimpleMatch>, TbaError> {
        self.get_matches_at_event(client, event_key)
            .map(|matches| parse_matches_to_simple(&matches))
    }
}

pub fn normalize_team_key(team_key: &str) -> String {
    if team_key.starts_with("frc") {
        team_key.into()
    } else {
        format!("frc{team_key}")
    }
}

pub fn teams_from_matches(matches: &[TbaMatch]) -> Vec<String> {
    let mut teams = Vec::new();
    for key in matches.iter().flat_map(|m| {
        m.alliances
            .red
            .team_keys
            .iter()
            .chain(m.alliances.blue.team_keys.iter())
    }) {
        if !teams.contains(key) {
            teams.push(key.clone());
        }
    }
    teams
}

pub fn parse_events_to_simple(events: &[TbaEvent]) -> Vec<TbaSimpleEvent> {
    events
        .iter()
        .map(|event| TbaSimpleEvent {
            key: event.key.clone(),
            name: event.name.clone(),
            location: format_location(event),
            date_range: format_date_range(&event.start_date, &event.end_date).unwrap_or_default(),
            year: event.year,
        })
        .collect()
}

pub fn format_location(event: &TbaEvent) -> String {
    let mut location = match (&event.city, &event.state_prov) {
        (Some(city), Some(state)) => format!("{city}, {state}"),
        (Some(city), None) => city.clone(),
        (None, Some(state)) => state.clone(),
        (None, None) => String::new(),
    };
    if let Some(country) = event.country.as_deref().filter(|country| *country != "USA") {
        if !location.is_empty() {
            location.push_str(", ");
        }
        location.push_str(country);
    }
    location
}

pub fn format_date_range(start: &str, end: &str) -> Option<String> {
    let (start_month, start_day) = parse_iso_date(start)?;
    let (end_month, end_day) = parse_iso_date(end)?;
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    if start_month == end_month {
        Some(format!(
            "{} {}-{}",
            months[start_month - 1],
            start_day,
            end_day
        ))
    } else {
        Some(format!(
            "{} {} - {} {}",
            months[start_month - 1],
            start_day,
            months[end_month - 1],
            end_day
        ))
    }
}

pub fn parse_matches_to_simple(matches: &[TbaMatch]) -> Vec<TbaSimpleMatch> {
    let mut sorted = matches.to_vec();
    sorted.sort_by_key(|m| {
        (
            match_level_order(&m.comp_level),
            if m.comp_level == "qm" {
                0
            } else {
                m.set_number
            },
            m.match_number,
        )
    });
    sorted
        .into_iter()
        .map(|m| TbaSimpleMatch {
            match_name: format_match_name(&m.comp_level, m.set_number, m.match_number),
            red_teams: m
                .alliances
                .red
                .team_keys
                .iter()
                .map(|key| key.strip_prefix("frc").unwrap_or(key).into())
                .collect(),
            blue_teams: m
                .alliances
                .blue
                .team_keys
                .iter()
                .map(|key| key.strip_prefix("frc").unwrap_or(key).into())
                .collect(),
            match_key: m.key,
        })
        .collect()
}

pub fn format_match_name(level: &str, set: u32, number: u32) -> String {
    let name = match level {
        "qm" => "Quals",
        "ef" => "Eighths",
        "qf" => "Quarters",
        "sf" => "Semis",
        "f" => "Finals",
        _ => return format!("{} {set}-{number}", level.to_uppercase()),
    };
    if level == "qm" {
        format!("{name} {number}")
    } else {
        format!("{name} {set}-{number}")
    }
}

pub fn filter_and_sort_events(events: &[TbaSimpleEvent]) -> Vec<TbaSimpleEvent> {
    let mut filtered: Vec<_> = events
        .iter()
        .filter_map(|event| {
            parse_display_date(&event.date_range, event.year)
                .filter(|date| *date >= (2025, 1, 1))
                .map(|date| (date, event.clone()))
        })
        .collect();
    filtered.sort_by_key(|item| std::cmp::Reverse(item.0));
    filtered.into_iter().map(|(_, event)| event).collect()
}

fn parse_iso_date(value: &str) -> Option<(usize, u32)> {
    let mut parts = value.split('-');
    parts.next()?.parse::<i32>().ok()?;
    let month = parts.next()?.parse::<usize>().ok()?;
    let day = parts.next()?.parse::<u32>().ok()?;
    (1..=12).contains(&month).then_some((month, day))
}
fn parse_display_date(value: &str, year: i32) -> Option<(i32, usize, u32)> {
    let mut parts = value.split_whitespace();
    let month = match parts.next()? {
        "Jan" => 1,
        "Feb" => 2,
        "Mar" => 3,
        "Apr" => 4,
        "May" => 5,
        "Jun" => 6,
        "Jul" => 7,
        "Aug" => 8,
        "Sep" => 9,
        "Oct" => 10,
        "Nov" => 11,
        "Dec" => 12,
        _ => return None,
    };
    let day = parts.next()?.split('-').next()?.parse().ok()?;
    Some((year, month, day))
}
fn match_level_order(level: &str) -> u8 {
    match level {
        "qm" => 1,
        "ef" => 2,
        "qf" => 3,
        "sf" => 4,
        "f" => 5,
        _ => 99,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    struct MockClient(
        RefCell<Vec<Result<HttpResponse, String>>>,
        RefCell<Vec<HttpRequest>>,
    );
    impl HttpClient for MockClient {
        fn execute(&self, request: HttpRequest) -> Result<HttpResponse, String> {
            self.1.borrow_mut().push(request);
            self.0.borrow_mut().remove(0)
        }
    }
    fn event(
        start: &str,
        end: &str,
        city: Option<&str>,
        state: Option<&str>,
        country: Option<&str>,
    ) -> TbaEvent {
        TbaEvent {
            key: "e".into(),
            name: "Event".into(),
            event_code: "e".into(),
            event_type: 0,
            start_date: start.into(),
            end_date: end.into(),
            year: 2026,
            city: city.map(Into::into),
            state_prov: state.map(Into::into),
            country: country.map(Into::into),
        }
    }
    fn match_(key: &str, level: &str, set: u32, number: u32) -> TbaMatch {
        TbaMatch {
            key: key.into(),
            comp_level: level.into(),
            set_number: set,
            match_number: number,
            alliances: TbaAlliances {
                red: TbaAlliance {
                    team_keys: vec!["frc1".into()],
                },
                blue: TbaAlliance {
                    team_keys: vec!["frc2".into()],
                },
            },
        }
    }

    #[test]
    fn event_formatting_covers_locations_and_date_boundaries() {
        assert_eq!(
            format_location(&event(
                "2026-03-01",
                "2026-03-03",
                Some("Detroit"),
                Some("MI"),
                Some("USA")
            )),
            "Detroit, MI"
        );
        assert_eq!(
            format_location(&event(
                "2026-03-01",
                "2026-03-03",
                None,
                Some("ON"),
                Some("Canada")
            )),
            "ON, Canada"
        );
        assert_eq!(
            format_date_range("2026-03-30", "2026-04-01"),
            Some("Mar 30 - Apr 1".into())
        );
        assert_eq!(
            format_date_range("2026-12-31", "2027-01-02"),
            Some("Dec 31 - Jan 2".into())
        );
    }
    #[test]
    fn matches_sort_and_format_every_competition_level() {
        let output = parse_matches_to_simple(&[
            match_("f", "f", 1, 2),
            match_("q2", "qm", 1, 2),
            match_("e", "ef", 2, 1),
            match_("q1", "qm", 1, 1),
            match_("x", "xx", 1, 1),
        ]);
        assert_eq!(
            output
                .iter()
                .map(|m| m.match_name.as_str())
                .collect::<Vec<_>>(),
            ["Quals 1", "Quals 2", "Eighths 2-1", "Finals 1-2", "XX 1-1"]
        );
        assert_eq!(output[0].red_teams, ["1"]);
    }
    #[test]
    fn events_filter_from_2025_and_sort_newest_first() {
        let events = vec![
            TbaSimpleEvent {
                key: "old".into(),
                name: "".into(),
                location: "".into(),
                date_range: "Dec 1-2".into(),
                year: 2024,
            },
            TbaSimpleEvent {
                key: "jan".into(),
                name: "".into(),
                location: "".into(),
                date_range: "Jan 1-2".into(),
                year: 2025,
            },
            TbaSimpleEvent {
                key: "new".into(),
                name: "".into(),
                location: "".into(),
                date_range: "Mar 1-2".into(),
                year: 2026,
            },
            TbaSimpleEvent {
                key: "bad".into(),
                name: "".into(),
                location: "".into(),
                date_range: "???".into(),
                year: 2026,
            },
        ];
        assert_eq!(
            filter_and_sort_events(&events)
                .iter()
                .map(|e| e.key.as_str())
                .collect::<Vec<_>>(),
            ["new", "jan"]
        );
    }
    #[test]
    fn authenticated_request_normalizes_team_and_preserves_header() {
        let mut service = TbaService::default();
        service.set_api_key("abc");
        let client = MockClient(
            RefCell::new(vec![Ok(HttpResponse {
                status: 200,
                status_text: "OK".into(),
                body: "[]".into(),
            })]),
            RefCell::new(vec![]),
        );
        assert!(service
            .get_team_matches_at_event(&client, "254", "2026miket")
            .is_ok());
        let request = client.1.borrow().first().unwrap().clone();
        assert_eq!(
            request.url,
            "https://www.thebluealliance.com/api/v3/team/frc254/event/2026miket/matches"
        );
        assert_eq!(
            request.headers,
            vec![("X-TBA-Auth-Key".into(), "abc".into())]
        );
    }
    #[test]
    fn failed_team_endpoint_falls_back_to_deduplicated_match_teams() {
        let mut service = TbaService::default();
        service.set_api_key("abc");
        let body = r#"[{"key":"m","comp_level":"qm","set_number":1,"match_number":1,"alliances":{"red":{"team_keys":["frc1","frc2"]},"blue":{"team_keys":["frc3","frc2"]}}}]"#;
        let client = MockClient(
            RefCell::new(vec![
                Ok(HttpResponse {
                    status: 500,
                    status_text: "Error".into(),
                    body: "".into(),
                }),
                Ok(HttpResponse {
                    status: 200,
                    status_text: "OK".into(),
                    body: body.into(),
                }),
            ]),
            RefCell::new(vec![]),
        );
        assert_eq!(
            service
                .teams_at_event_or_matches(&client, "2026miket")
                .unwrap(),
            ["frc1", "frc2", "frc3"]
        );
    }
    #[test]
    fn api_errors_and_missing_keys_are_reported() {
        assert_eq!(
            TbaService::default()
                .build_request("/events/2026")
                .unwrap_err()
                .to_string(),
            "TBA API key not set"
        );
        let mut service = TbaService::default();
        service.set_api_key("x");
        let client = MockClient(
            RefCell::new(vec![Ok(HttpResponse {
                status: 403,
                status_text: "Forbidden".into(),
                body: "".into(),
            })]),
            RefCell::new(vec![]),
        );
        assert_eq!(
            service.get_events(&client, 2026).unwrap_err().to_string(),
            "TBA API error: 403 Forbidden"
        );
    }

    #[test]
    fn public_fetch_helpers_match_the_browser_convenience_api() {
        let mut service = TbaService::default();
        service.set_api_key("abc");
        let matches = r#"[{"key":"m","comp_level":"qm","set_number":1,"match_number":2,"alliances":{"red":{"team_keys":["frc1"]},"blue":{"team_keys":["frc2"]}}}]"#;
        let events = r#"[{"key":"e","name":"Event","event_code":"e","event_type":0,"start_date":"2026-03-01","end_date":"2026-03-03","year":2026,"city":"Detroit","state_prov":"MI","country":"USA"}]"#;
        let client = MockClient(
            RefCell::new(vec![
                Ok(HttpResponse {
                    status: 200,
                    status_text: "OK".into(),
                    body: r#"["frc1","frc2056"]"#.into(),
                }),
                Ok(HttpResponse {
                    status: 200,
                    status_text: "OK".into(),
                    body: matches.into(),
                }),
                Ok(HttpResponse {
                    status: 200,
                    status_text: "OK".into(),
                    body: events.into(),
                }),
                Ok(HttpResponse {
                    status: 200,
                    status_text: "OK".into(),
                    body: matches.into(),
                }),
            ]),
            RefCell::new(vec![]),
        );

        assert_eq!(
            service.fetch_teams_at_event(&client, "2026miket").unwrap(),
            ["1", "2056"]
        );
        assert_eq!(
            service
                .fetch_and_parse_team_matches(&client, "1", "2026miket")
                .unwrap()[0]
                .match_name,
            "Quals 2"
        );
        assert_eq!(
            service.fetch_and_parse_events(&client, 2026).unwrap()[0].date_range,
            "Mar 1-3"
        );
        assert_eq!(
            service
                .fetch_and_parse_all_matches(&client, "2026miket")
                .unwrap()[0]
                .red_teams,
            ["1"]
        );

        let requests = client.1.borrow();
        assert_eq!(
            requests[1].url,
            "https://www.thebluealliance.com/api/v3/team/frc1/event/2026miket/matches"
        );
        assert_eq!(
            requests[2].url,
            "https://www.thebluealliance.com/api/v3/events/2026"
        );
    }
}
