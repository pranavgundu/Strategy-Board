//! Static field configuration shared by the native helpers.

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
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn has_valid_field_dimensions_and_station_coordinates() {
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
    }
}
