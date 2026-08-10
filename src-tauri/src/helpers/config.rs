//! Static field and release configuration shared by the native helpers.

#[derive(Debug, Clone, PartialEq)]
pub struct ReleaseAnnouncement {
    pub enabled: bool,
    pub id: &'static str,
    pub title: &'static str,
    pub message: &'static str,
    pub cta_label: &'static str,
    pub cta_url: &'static str,
    pub show_once: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Config {
    pub field_png_pixel_width: u32,
    pub field_png_pixel_height: u32,
    pub field_real_width_inches: f64,
    pub field_real_height_inches: f64,
    pub red_one_station_x: f64,
    pub red_one_station_y: f64,
    pub red_two_station_x: f64,
    pub red_two_station_y: f64,
    pub red_three_station_x: f64,
    pub red_three_station_y: f64,
    pub blue_one_station_x: f64,
    pub blue_one_station_y: f64,
    pub blue_two_station_x: f64,
    pub blue_two_station_y: f64,
    pub blue_three_station_x: f64,
    pub blue_three_station_y: f64,
    pub shared_tba_api_key: String,
    pub release_announcement: ReleaseAnnouncement,
}

impl Config {
    /// Native equivalent of the legacy `Config` object.  The API key is read
    /// from the process environment, rather than being compiled into a binary.
    pub fn current() -> Self {
        Self {
            field_png_pixel_width: 3510,
            field_png_pixel_height: 1610,
            field_real_width_inches: 690.875,
            field_real_height_inches: 317.0,
            red_one_station_x: 3575.0,
            red_one_station_y: 455.0,
            red_two_station_x: 3575.0,
            red_two_station_y: 805.0,
            red_three_station_x: 3575.0,
            red_three_station_y: 1155.0,
            blue_one_station_x: -65.0,
            blue_one_station_y: 455.0,
            blue_two_station_x: -65.0,
            blue_two_station_y: 805.0,
            blue_three_station_x: -65.0,
            blue_three_station_y: 1155.0,
            shared_tba_api_key: std::env::var("TBA_API_KEY")
                .or_else(|_| std::env::var("VITE_TBA_API_KEY"))
                .ok()
                .filter(|value| !value.is_empty())
                .or_else(|| option_env!("TBA_API_KEY").map(str::to_owned))
                .or_else(|| option_env!("VITE_TBA_API_KEY").map(str::to_owned))
                .unwrap_or_default(),
            release_announcement: ReleaseAnnouncement {
                enabled: false,
                id: "release-2026-2-0",
                title: "New update available",
                message: "We shipped a new release with fixes and improvements.",
                cta_label: "View release notes",
                cta_url: "https://github.com/pranavgundu/Strategy-Board/releases",
                show_once: true,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn has_valid_field_dimensions_station_coordinates_and_release_contract() {
        let config = Config::current();
        assert!(config.field_png_pixel_width > 0 && config.field_png_pixel_height > 0);
        assert!(config.field_real_width_inches > 0.0 && config.field_real_height_inches > 0.0);
        for x in [
            config.red_one_station_x,
            config.red_two_station_x,
            config.red_three_station_x,
            config.blue_one_station_x,
            config.blue_two_station_x,
            config.blue_three_station_x,
        ] {
            assert!(x.is_finite());
        }
        let release = config.release_announcement;
        assert!(!release.id.is_empty() && !release.title.is_empty() && !release.message.is_empty());
        assert!(!release.cta_label.is_empty() && !release.cta_url.is_empty());
        assert!(release.cta_url.starts_with("https://"));
    }
}
