//! Platform-neutral validation before handing a URL to Tauri's opener plugin.

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ExternalUrlError {
    Empty,
    ContainsWhitespaceOrControl,
    UnsupportedScheme,
    MissingAuthority,
    InvalidAuthority,
}

impl std::fmt::Display for ExternalUrlError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Empty => write!(formatter, "external URL is empty"),
            Self::ContainsWhitespaceOrControl => write!(
                formatter,
                "external URL contains whitespace or control characters"
            ),
            Self::UnsupportedScheme => write!(
                formatter,
                "only http and https URLs may be opened externally"
            ),
            Self::MissingAuthority => write!(formatter, "external URL has no host"),
            Self::InvalidAuthority => write!(formatter, "external URL host is malformed"),
        }
    }
}

impl std::error::Error for ExternalUrlError {}

/// Ensures a frontend-provided link is a real absolute HTTP(S) URL before it
/// is passed to `tauri-plugin-opener`. This is deliberately stricter than the
/// legacy `/^https?:/` check, which also matched `https:javascript:...`.
pub fn validate_external_url(url: &str) -> Result<&str, ExternalUrlError> {
    if url.is_empty() {
        return Err(ExternalUrlError::Empty);
    }
    if url
        .chars()
        .any(|character| character.is_whitespace() || character.is_control())
    {
        return Err(ExternalUrlError::ContainsWhitespaceOrControl);
    }
    let Some((scheme, after_scheme)) = url.split_once("://") else {
        return Err(ExternalUrlError::UnsupportedScheme);
    };
    if !(scheme.eq_ignore_ascii_case("http") || scheme.eq_ignore_ascii_case("https")) {
        return Err(ExternalUrlError::UnsupportedScheme);
    }
    let authority = after_scheme
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default();
    if authority.is_empty() {
        return Err(ExternalUrlError::MissingAuthority);
    }
    // User info is not needed for the app's public links and makes accidental
    // host spoofing easier to miss in a UI, so do not permit it.
    if authority.contains('@') || authority.starts_with('.') || authority.ends_with('.') {
        return Err(ExternalUrlError::InvalidAuthority);
    }
    if authority.starts_with('[') {
        let Some(end) = authority.find(']') else {
            return Err(ExternalUrlError::InvalidAuthority);
        };
        if authority[1..end].parse::<std::net::Ipv6Addr>().is_err() {
            return Err(ExternalUrlError::InvalidAuthority);
        }
        let suffix = &authority[end + 1..];
        if !suffix.is_empty() && !valid_port(suffix) {
            return Err(ExternalUrlError::InvalidAuthority);
        }
    } else {
        let (host, port) = authority.split_once(':').unwrap_or((authority, ""));
        if host.is_empty()
            || !host
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-'))
        {
            return Err(ExternalUrlError::InvalidAuthority);
        }
        if authority.contains(':') && (!valid_port(&format!(":{port}"))) {
            return Err(ExternalUrlError::InvalidAuthority);
        }
    }
    Ok(url)
}

fn valid_port(suffix: &str) -> bool {
    let Some(port) = suffix.strip_prefix(':') else {
        return false;
    };
    !port.is_empty() && port.parse::<u16>().is_ok()
}

pub fn is_safe_external_url(url: &str) -> bool {
    validate_external_url(url).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_absolute_http_and_https_urls() {
        assert_eq!(
            validate_external_url("https://www.thebluealliance.com/event/2026miket").unwrap(),
            "https://www.thebluealliance.com/event/2026miket"
        );
        assert!(is_safe_external_url(
            "HTTP://localhost:1420/path?mode=dev#section"
        ));
        assert!(is_safe_external_url("https://[::1]:1420/"));
    }

    #[test]
    fn rejects_non_external_or_ambiguous_schemes() {
        for value in [
            "",
            "/relative",
            "javascript:alert(1)",
            "tauri://open",
            "https:javascript:alert(1)",
            "ftp://example.com",
        ] {
            assert!(!is_safe_external_url(value), "{value} should be rejected");
        }
    }

    #[test]
    fn rejects_missing_or_malformed_authority() {
        for value in [
            "https://",
            "https:///path",
            "https://user@example.com",
            "https://.example.com",
            "https://example.com.",
            "https://exa mple.com",
            "https://example.com\n/path",
            "https://[::1/path",
            "https://example.com:not-a-port",
            "https://example.com:99999",
        ] {
            assert!(
                validate_external_url(value).is_err(),
                "{value} should be rejected"
            );
        }
    }
}
