//! Contributor and team-list helper with a mockable GitHub/content boundary.

use serde::{Deserialize, Serialize};

pub const CONTRIBUTORS_URL: &str =
    "https://api.github.com/repos/pranavgundu/Strategy-Board/contributors?per_page=100";
pub const GITHUB_USERS_BASE: &str = "https://api.github.com/users";

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Contributor {
    pub login: String,
    pub avatar_url: String,
    pub html_url: String,
    pub contributions: u32,
    pub name: Option<String>,
    pub bio: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct LastCommit {
    pub sha: String,
    pub message: String,
    pub author: String,
    pub date: String,
    pub url: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct GithubContributor {
    pub login: String,
    pub avatar_url: String,
    pub html_url: String,
    pub contributions: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct GithubUser {
    pub name: Option<String>,
    pub bio: Option<String>,
}

pub trait ContributorsSource {
    fn contributors_text(&self) -> Result<String, String>;
    fn contributors(&self) -> Result<Vec<GithubContributor>, String>;
    fn user(&self, login: &str) -> Result<GithubUser, String>;
}

#[derive(Clone, Debug, Default)]
pub struct ContributorsService {
    contributors: Vec<Contributor>,
    teams: Vec<String>,
    is_loading: bool,
    has_error: bool,
    last_commit: Option<LastCommit>,
}
impl ContributorsService {
    pub fn teams_request_path() -> &'static str {
        "/contributors.txt"
    }
    pub fn contributors_request_url() -> &'static str {
        CONTRIBUTORS_URL
    }
    pub fn user_request_url(login: &str) -> String {
        format!("{GITHUB_USERS_BASE}/{login}")
    }
    pub fn fetch_teams<S: ContributorsSource>(&mut self, source: &S) -> Vec<String> {
        if !self.teams.is_empty() {
            return self.teams.clone();
        }
        match source.contributors_text() {
            Ok(text) => {
                self.teams = parse_teams(&text);
                self.teams.clone()
            }
            Err(_) => vec![],
        }
    }
    pub fn fetch_contributors<S: ContributorsSource>(
        &mut self,
        source: &S,
    ) -> Result<Vec<Contributor>, String> {
        if !self.contributors.is_empty() {
            return Ok(self.contributors.clone());
        }
        self.is_loading = true;
        self.has_error = false;
        let result = source.contributors().map(|contributors| {
            contributors
                .into_iter()
                .filter(|contributor| !is_dependabot(&contributor.login))
                .map(|contributor| {
                    let user = source.user(&contributor.login).ok();
                    Contributor {
                        login: contributor.login,
                        avatar_url: contributor.avatar_url,
                        html_url: contributor.html_url,
                        contributions: contributor.contributions,
                        name: user.as_ref().and_then(|user| user.name.clone()),
                        bio: user.and_then(|user| user.bio),
                    }
                })
                .collect::<Vec<_>>()
        });
        self.is_loading = false;
        match result {
            Ok(contributors) => {
                self.contributors = contributors.clone();
                Ok(contributors)
            }
            Err(error) => {
                self.has_error = true;
                Err(error)
            }
        }
    }
    pub fn get_recent_contributors(&self, count: usize) -> Vec<Contributor> {
        self.contributors.iter().take(count).cloned().collect()
    }
    pub fn is_loading_contributors(&self) -> bool {
        self.is_loading
    }
    pub fn has_load_error(&self) -> bool {
        self.has_error
    }
    pub fn fetch_last_commit(
        &mut self,
        build_commit: impl FnOnce() -> Result<LastCommit, String>,
    ) -> Option<LastCommit> {
        if self.last_commit.is_none() {
            self.last_commit = build_commit().ok();
        }
        self.last_commit.clone()
    }
}

pub fn parse_teams(text: &str) -> Vec<String> {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(Into::into)
        .collect()
}
pub fn is_dependabot(login: &str) -> bool {
    matches!(
        login.to_ascii_lowercase().as_str(),
        "dependabot[bot]" | "dependabot"
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;
    struct Source {
        text: Result<String, String>,
        contributors: Result<Vec<GithubContributor>, String>,
        user: Result<GithubUser, String>,
        text_calls: Cell<u32>,
        contributors_calls: Cell<u32>,
        user_calls: Cell<u32>,
    }
    impl ContributorsSource for Source {
        fn contributors_text(&self) -> Result<String, String> {
            self.text_calls.set(self.text_calls.get() + 1);
            self.text.clone()
        }
        fn contributors(&self) -> Result<Vec<GithubContributor>, String> {
            self.contributors_calls
                .set(self.contributors_calls.get() + 1);
            self.contributors.clone()
        }
        fn user(&self, _: &str) -> Result<GithubUser, String> {
            self.user_calls.set(self.user_calls.get() + 1);
            self.user.clone()
        }
    }
    fn source() -> Source {
        Source {
            text: Ok("1114\n2056\n\n  254  ".into()),
            contributors: Ok(vec![
                GithubContributor {
                    login: "alice".into(),
                    avatar_url: "a".into(),
                    html_url: "ha".into(),
                    contributions: 10,
                },
                GithubContributor {
                    login: "dependabot[bot]".into(),
                    avatar_url: "b".into(),
                    html_url: "hb".into(),
                    contributions: 1,
                },
            ]),
            user: Ok(GithubUser {
                name: Some("Alice".into()),
                bio: Some("Builder".into()),
            }),
            text_calls: Cell::new(0),
            contributors_calls: Cell::new(0),
            user_calls: Cell::new(0),
        }
    }
    #[test]
    fn teams_are_trimmed_and_cached() {
        let source = source();
        let mut service = ContributorsService::default();
        assert_eq!(service.fetch_teams(&source), ["1114", "2056", "254"]);
        service.fetch_teams(&source);
        assert_eq!(source.text_calls.get(), 1);
    }
    #[test]
    fn failed_team_request_returns_empty_list() {
        let mut source = source();
        source.text = Err("network".into());
        assert!(ContributorsService::default()
            .fetch_teams(&source)
            .is_empty());
    }
    #[test]
    fn contributors_filter_bots_enrich_users_and_cache() {
        let source = source();
        let mut service = ContributorsService::default();
        let result = service.fetch_contributors(&source).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name.as_deref(), Some("Alice"));
        assert_eq!(service.get_recent_contributors(1).len(), 1);
        service.fetch_contributors(&source).unwrap();
        assert_eq!(source.contributors_calls.get(), 1);
        assert_eq!(source.user_calls.get(), 1);
    }
    #[test]
    fn api_failure_sets_error_and_loading_resets() {
        let mut source = source();
        source.contributors = Err("GitHub API error: 500".into());
        let mut service = ContributorsService::default();
        assert_eq!(
            service.fetch_contributors(&source).unwrap_err(),
            "GitHub API error: 500"
        );
        assert!(service.has_load_error());
        assert!(!service.is_loading_contributors());
    }
    #[test]
    fn commit_and_request_boundaries_are_cacheable_and_stable() {
        let mut service = ContributorsService::default();
        let commit = LastCommit {
            sha: "s".into(),
            message: "m".into(),
            author: "a".into(),
            date: "d".into(),
            url: "https://github.com/x".into(),
        };
        assert_eq!(
            service.fetch_last_commit(|| Ok(commit.clone())),
            Some(commit)
        );
        assert_eq!(
            ContributorsService::user_request_url("alice"),
            "https://api.github.com/users/alice"
        );
    }
}
