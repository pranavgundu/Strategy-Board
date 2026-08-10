//! Field artwork selection and year-specific starting robot locations.

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AlliancePositions {
    pub one: Point,
    pub two: Point,
    pub three: Point,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RobotPositions {
    pub red: AlliancePositions,
    pub blue: AlliancePositions,
}

const YEARS: [u32; 2] = [2025, 2026];
const IMAGE_2025: &str = "images/2025.png";
const IMAGE_2026: &str = "images/2026.png";

const POSITIONS_2025: RobotPositions = RobotPositions {
    red: AlliancePositions {
        one: Point {
            x: 2055.0,
            y: 455.0,
        },
        two: Point {
            x: 2055.0,
            y: 805.0,
        },
        three: Point {
            x: 2055.0,
            y: 1155.0,
        },
    },
    blue: AlliancePositions {
        one: Point {
            x: 1455.0,
            y: 455.0,
        },
        two: Point {
            x: 1455.0,
            y: 805.0,
        },
        three: Point {
            x: 1455.0,
            y: 1155.0,
        },
    },
};
const POSITIONS_2026: RobotPositions = RobotPositions {
    red: AlliancePositions {
        one: Point {
            x: 2680.0,
            y: 205.0,
        },
        two: Point {
            x: 2680.0,
            y: 805.0,
        },
        three: Point {
            x: 2680.0,
            y: 1405.0,
        },
    },
    blue: AlliancePositions {
        one: Point { x: 830.0, y: 205.0 },
        two: Point { x: 830.0, y: 805.0 },
        three: Point {
            x: 830.0,
            y: 1405.0,
        },
    },
};

pub fn available_field_years() -> &'static [u32] {
    &YEARS
}
pub fn latest_field_year() -> u32 {
    2026
}
pub fn has_field_for_year(year: u32) -> bool {
    YEARS.contains(&year)
}
pub fn year_from_field_image(image: &str) -> Option<u32> {
    match image {
        IMAGE_2025 => Some(2025),
        IMAGE_2026 => Some(2026),
        _ => None,
    }
}

/// The returned paths are logical image paths; map them to Tauri's asset URL
/// at the UI boundary. They replace Vite's runtime-generated import URLs.
pub fn field_image_for_year(year: Option<f64>) -> &'static str {
    match select_year(year) {
        2025 => IMAGE_2025,
        _ => IMAGE_2026,
    }
}
pub fn robot_positions_for_year(year: Option<f64>) -> RobotPositions {
    match select_year(year) {
        2025 => POSITIONS_2025,
        _ => POSITIONS_2026,
    }
}

// `0`, NaN, and an omitted optional argument are falsy in the TypeScript API,
// so they choose the newest field before normal fallback selection begins.
fn select_year(year: Option<f64>) -> u32 {
    let Some(year) = year else {
        return latest_field_year();
    };
    if year == 0.0 || year.is_nan() {
        return latest_field_year();
    }
    if year < 2025.0 {
        2025
    } else if year >= 2026.0 {
        2026
    } else {
        2025
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn field_selection_covers_exact_fallback_and_lookup_cases() {
        assert_eq!(available_field_years(), &[2025, 2026]);
        assert_eq!(latest_field_year(), 2026);
        for (year, image) in [
            (None, IMAGE_2026),
            (Some(1900.0), IMAGE_2025),
            (Some(2024.0), IMAGE_2025),
            (Some(2025.0), IMAGE_2025),
            (Some(2025.1), IMAGE_2025),
            (Some(2025.999), IMAGE_2025),
            (Some(2026.0), IMAGE_2026),
            (Some(2026.1), IMAGE_2026),
            (Some(9999.0), IMAGE_2026),
            (Some(-100.0), IMAGE_2025),
            (Some(0.0), IMAGE_2026),
            (Some(f64::NAN), IMAGE_2026),
        ] {
            assert_eq!(field_image_for_year(year), image);
        }
        assert_eq!(year_from_field_image(IMAGE_2025), Some(2025));
        assert_eq!(year_from_field_image(IMAGE_2026), Some(2026));
        for url in ["/unknown.png", "/assets/not-real.png", "", "2025.png"] {
            assert_eq!(year_from_field_image(url), None);
        }
        assert!(has_field_for_year(2025) && has_field_for_year(2026));
        for year in [2024, 2027, 2030, 0] {
            assert!(!has_field_for_year(year));
        }
    }

    #[test]
    fn positions_cover_exact_fallback_and_field_invariants() {
        let p25 = robot_positions_for_year(Some(2025.0));
        let p26 = robot_positions_for_year(Some(2026.0));
        for (year, expected) in [
            (None, p26),
            (Some(2025.2), p25),
            (Some(2025.9), p25),
            (Some(1900.0), p25),
            (Some(2100.0), p26),
            (Some(0.0), p26),
            (Some(f64::NAN), p26),
        ] {
            assert_eq!(robot_positions_for_year(year), expected);
        }
        assert!(
            p26.red.one.x > p26.blue.one.x
                && p26.red.two.x > p26.blue.two.x
                && p26.red.three.x > p26.blue.three.x
        );
        assert_ne!(p25.red.one.x, p26.red.one.x);
        assert_eq!(
            [p26.red.one.y, p26.red.two.y, p26.red.three.y],
            [205.0, 805.0, 1405.0]
        );
        assert_eq!(p25.red.one.y, p25.blue.one.y);
        assert_eq!(p25.red.two.y, p25.blue.two.y);
        assert_eq!(p26.red.three.y, p26.blue.three.y);
    }
}
