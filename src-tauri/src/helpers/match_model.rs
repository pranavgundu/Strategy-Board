//! Native match domain model and the legacy positional packet codec.
//!
//! Packet layout is deliberately kept identical to `strategy-core` in the
//! previous application: `[name, r1, r2, r3, b1, b2, b3, id, body, ...]`.

use std::fmt;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{json, Value};

use super::manager::{robot_positions_for_year, RobotPositions};

pub const DEFAULT_ROBOT_WIDTH: f64 = 152.4;
pub const DEFAULT_ROBOT_HEIGHT: f64 = 152.4;

#[derive(Debug, Clone, PartialEq)]
pub struct RobotPosition {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub r: f64,
}
#[derive(Debug, Clone, PartialEq)]
pub struct PhaseData {
    pub red_one_robot: RobotPosition,
    pub red_two_robot: RobotPosition,
    pub red_three_robot: RobotPosition,
    pub blue_one_robot: RobotPosition,
    pub blue_two_robot: RobotPosition,
    pub blue_three_robot: RobotPosition,
    pub drawing: Value,
    pub drawing_bbox: Value,
    pub checkboxes: Value,
}
#[derive(Debug, Clone, PartialEq)]
pub struct RobotPose {
    pub x: f64,
    pub y: f64,
    pub r: f64,
}
#[derive(Debug, Clone, PartialEq)]
pub struct Dimensions {
    pub w: f64,
    pub h: f64,
}
#[derive(Debug, Clone, PartialEq)]
pub struct MatchDimensions {
    pub r1: Dimensions,
    pub r2: Dimensions,
    pub r3: Dimensions,
    pub b1: Dimensions,
    pub b2: Dimensions,
    pub b3: Dimensions,
}
#[derive(Debug, Clone, PartialEq)]
pub struct PhaseOptions {
    pub r1: RobotPose,
    pub r2: RobotPose,
    pub r3: RobotPose,
    pub b1: RobotPose,
    pub b2: RobotPose,
    pub b3: RobotPose,
    pub drawing: Value,
    pub drawing_bbox: Value,
    pub checkboxes: Option<Value>,
}
#[derive(Debug, Clone, PartialEq)]
pub struct MatchOptions {
    pub dimensions: MatchDimensions,
    pub auto: PhaseOptions,
    pub teleop: PhaseOptions,
    pub endgame: PhaseOptions,
    pub notes: Option<PhaseOptions>,
    pub transition: Option<PhaseOptions>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Match {
    pub match_name: String,
    pub red_one: String,
    pub red_two: String,
    pub red_three: String,
    pub blue_one: String,
    pub blue_two: String,
    pub blue_three: String,
    pub id: String,
    pub tba_event_key: Option<String>,
    pub tba_match_key: Option<String>,
    pub tba_year: Option<f64>,
    /// Kept as JSON so optional future metadata keys remain lossless.
    pub field_metadata: Option<Value>,
    pub auto: PhaseData,
    pub teleop: PhaseData,
    pub transition: PhaseData,
    pub endgame: PhaseData,
    pub notes: PhaseData,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PacketError(pub String);
impl fmt::Display for PacketError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for PacketError {}

impl Match {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        match_name: impl Into<String>,
        red_one: impl Into<String>,
        red_two: impl Into<String>,
        red_three: impl Into<String>,
        blue_one: impl Into<String>,
        blue_two: impl Into<String>,
        blue_three: impl Into<String>,
        id: Option<String>,
        options: Option<MatchOptions>,
        tba_event_key: Option<String>,
        tba_match_key: Option<String>,
        tba_year: Option<f64>,
    ) -> Self {
        let positions = robot_positions_for_year(tba_year);
        let mut result = Self {
            match_name: match_name.into(),
            red_one: red_one.into(),
            red_two: red_two.into(),
            red_three: red_three.into(),
            blue_one: blue_one.into(),
            blue_two: blue_two.into(),
            blue_three: blue_three.into(),
            id: id.unwrap_or_else(generate_id),
            tba_event_key,
            tba_match_key,
            tba_year,
            field_metadata: None,
            auto: default_phase(positions),
            teleop: default_phase(positions),
            transition: default_phase(positions),
            endgame: default_phase(positions),
            notes: default_phase(positions),
        };
        if let Some(options) = options {
            result.apply_options(&options);
        }
        result
    }

    pub fn basic(
        match_name: impl Into<String>,
        red_one: impl Into<String>,
        red_two: impl Into<String>,
        red_three: impl Into<String>,
        blue_one: impl Into<String>,
        blue_two: impl Into<String>,
        blue_three: impl Into<String>,
    ) -> Self {
        Self::new(
            match_name, red_one, red_two, red_three, blue_one, blue_two, blue_three, None, None,
            None, None, None,
        )
    }

    pub fn update_info(
        &mut self,
        match_name: impl Into<String>,
        red: [String; 3],
        blue: [String; 3],
    ) {
        self.match_name = match_name.into();
        [self.red_one, self.red_two, self.red_three] = red;
        [self.blue_one, self.blue_two, self.blue_three] = blue;
    }

    pub fn is_from_tba(&self) -> bool {
        self.tba_event_key.as_deref().is_some_and(|v| !v.is_empty())
            && self.tba_match_key.as_deref().is_some_and(|v| !v.is_empty())
            && self.tba_year.is_some_and(|v| v != 0.0 && !v.is_nan())
    }

    pub fn robot_from_array_packet(array: &[Value]) -> Result<RobotPose, PacketError> {
        Ok(RobotPose {
            x: number_at(array, 0, "robot")?,
            y: number_at(array, 1, "robot")?,
            r: number_at(array, 2, "robot")?,
        })
    }

    /// Serializes exactly to the existing browser/Firestore packet schema.
    pub fn get_as_packet(&self) -> Value {
        let dims = &[
            &self.auto.red_one_robot,
            &self.auto.red_two_robot,
            &self.auto.red_three_robot,
            &self.auto.blue_one_robot,
            &self.auto.blue_two_robot,
            &self.auto.blue_three_robot,
        ];
        json!([
            self.match_name,
            self.red_one,
            self.red_two,
            self.red_three,
            self.blue_one,
            self.blue_two,
            self.blue_three,
            self.id,
            [
                dims.iter()
                    .map(|r| json!([js_to_fixed(r.w, 1), js_to_fixed(r.h, 1)]))
                    .collect::<Vec<_>>(),
                phase_packet(&self.auto),
                phase_packet(&self.teleop),
                phase_packet(&self.endgame),
                phase_packet(&self.notes),
                phase_packet(&self.transition),
            ],
            self.tba_event_key,
            self.tba_match_key,
            self.tba_year,
            self.field_metadata,
        ])
    }

    pub fn from_packet(packet: &Value) -> Result<Self, PacketError> {
        let p = array(packet, "packet")?;
        let body = array(value_at(p, 8), "packet[8]")?;
        let dims = array(value_at(body, 0), "dimensions")?;
        let dimension = |i| dimensions(value_at(dims, i));
        let match_dims = MatchDimensions {
            r1: dimension(0)?,
            r2: dimension(1)?,
            r3: dimension(2)?,
            b1: dimension(3)?,
            b2: dimension(4)?,
            b3: dimension(5)?,
        };
        let options = MatchOptions {
            dimensions: match_dims,
            auto: phase_options(value_at(body, 1), "auto")?,
            teleop: phase_options(value_at(body, 2), "teleop")?,
            endgame: phase_options(value_at(body, 3), "endgame")?,
            notes: if truthy(value_at(body, 4)) {
                Some(phase_options(value_at(body, 4), "notes")?)
            } else {
                None
            },
            transition: if truthy(value_at(body, 5)) {
                Some(phase_options(value_at(body, 5), "transition")?)
            } else {
                None
            },
        };
        let mut result = Self::new(
            string(value_at(p, 0), "matchName")?,
            string(value_at(p, 1), "redOne")?,
            string(value_at(p, 2), "redTwo")?,
            string(value_at(p, 3), "redThree")?,
            string(value_at(p, 4), "blueOne")?,
            string(value_at(p, 5), "blueTwo")?,
            string(value_at(p, 6), "blueThree")?,
            optional_string(value_at(p, 7), "id")?,
            Some(options),
            optional_string(value_at(p, 9), "tbaEventKey")?,
            optional_string(value_at(p, 10), "tbaMatchKey")?,
            optional_number(value_at(p, 11), "tbaYear")?,
        );
        result.field_metadata = (!value_at(p, 12).is_null()).then(|| value_at(p, 12).clone());
        Ok(result)
    }

    fn apply_options(&mut self, options: &MatchOptions) {
        apply_phase(&mut self.auto, &options.auto, &options.dimensions);
        apply_phase(&mut self.teleop, &options.teleop, &options.dimensions);
        apply_phase(&mut self.endgame, &options.endgame, &options.dimensions);
        if let Some(notes) = &options.notes {
            apply_phase(&mut self.notes, notes, &options.dimensions);
        }
        if let Some(transition) = &options.transition {
            apply_phase(&mut self.transition, transition, &options.dimensions);
        }
    }
}

fn default_phase(p: RobotPositions) -> PhaseData {
    let r = |point: super::manager::Point| RobotPosition {
        x: point.x,
        y: point.y,
        w: DEFAULT_ROBOT_WIDTH,
        h: DEFAULT_ROBOT_HEIGHT,
        r: 0.0,
    };
    PhaseData {
        red_one_robot: r(p.red.one),
        red_two_robot: r(p.red.two),
        red_three_robot: r(p.red.three),
        blue_one_robot: r(p.blue.one),
        blue_two_robot: r(p.blue.two),
        blue_three_robot: r(p.blue.three),
        drawing: json!([]),
        drawing_bbox: json!([]),
        checkboxes: json!([]),
    }
}
fn apply_phase(target: &mut PhaseData, source: &PhaseOptions, d: &MatchDimensions) {
    let robot = |p: &RobotPose, d: &Dimensions| RobotPosition {
        x: p.x,
        y: p.y,
        r: p.r,
        w: d.w,
        h: d.h,
    };
    target.red_one_robot = robot(&source.r1, &d.r1);
    target.red_two_robot = robot(&source.r2, &d.r2);
    target.red_three_robot = robot(&source.r3, &d.r3);
    target.blue_one_robot = robot(&source.b1, &d.b1);
    target.blue_two_robot = robot(&source.b2, &d.b2);
    target.blue_three_robot = robot(&source.b3, &d.b3);
    target.drawing = source.drawing.clone();
    target.drawing_bbox = source.drawing_bbox.clone();
    target.checkboxes = source.checkboxes.clone().unwrap_or_else(|| json!([]));
}
fn phase_packet(p: &PhaseData) -> Value {
    let robot = |r: &RobotPosition| json!([r.x, r.y, js_to_fixed(r.r, 2)]);
    json!([
        robot(&p.red_one_robot),
        robot(&p.red_two_robot),
        robot(&p.red_three_robot),
        robot(&p.blue_one_robot),
        robot(&p.blue_two_robot),
        robot(&p.blue_three_robot),
        p.drawing,
        p.drawing_bbox,
        p.checkboxes
    ])
}

// This is the old Rust codec's implementation of JavaScript `toFixed`-style
// rounding, including its negative-tie behaviour. Keeping it avoids packet
// drift for existing Firestore/QR exports.
fn js_to_fixed(x: f64, digits: usize) -> f64 {
    if !x.is_finite() || x == 0.0 || x.abs() >= 1e15 {
        return x;
    }
    let negative = x < 0.0;
    let s = format!("{:.60}", x.abs());
    let dot = s.find('.').expect("float decimal");
    let int_part = &s[..dot];
    let frac_part = &s[dot + 1..];
    let frac = frac_part.as_bytes();
    let next = if frac.len() > digits {
        frac[digits] - b'0'
    } else {
        0
    };
    let rest = frac.len() > digits + 1 && frac[digits + 1..].iter().any(|&b| b != b'0');
    let mut mantissa: u128 = format!("{}{}", int_part, &frac_part[..digits.min(frac_part.len())])
        .parse()
        .expect("numeric mantissa");
    if next > 5 || (next == 5 && (rest || !negative)) {
        mantissa += 1;
    }
    let output = mantissa as f64 / 10_f64.powi(digits as i32);
    if negative {
        -output
    } else {
        output
    }
}

fn value_at(values: &[Value], index: usize) -> &Value {
    values.get(index).unwrap_or(&Value::Null)
}
fn array<'a>(value: &'a Value, context: &str) -> Result<&'a Vec<Value>, PacketError> {
    value
        .as_array()
        .ok_or_else(|| PacketError(format!("invalid match packet: {context} is not an array")))
}
fn number(value: &Value, context: &str) -> Result<f64, PacketError> {
    value
        .as_f64()
        .ok_or_else(|| PacketError(format!("invalid match packet: {context} is not a number")))
}
fn number_at(values: &[Value], index: usize, context: &str) -> Result<f64, PacketError> {
    number(value_at(values, index), context)
}
fn string(value: &Value, context: &str) -> Result<String, PacketError> {
    value
        .as_str()
        .map(str::to_owned)
        .ok_or_else(|| PacketError(format!("invalid match packet: {context} is not a string")))
}
fn optional_string(value: &Value, context: &str) -> Result<Option<String>, PacketError> {
    if value.is_null() {
        Ok(None)
    } else {
        string(value, context).map(Some)
    }
}
fn optional_number(value: &Value, context: &str) -> Result<Option<f64>, PacketError> {
    if value.is_null() {
        Ok(None)
    } else {
        number(value, context).map(Some)
    }
}
fn dimensions(value: &Value) -> Result<Dimensions, PacketError> {
    let v = array(value, "dimensions")?;
    Ok(Dimensions {
        w: number_at(v, 0, "dimension width")?,
        h: number_at(v, 1, "dimension height")?,
    })
}
fn pose(value: &Value, context: &str) -> Result<RobotPose, PacketError> {
    Match::robot_from_array_packet(array(value, context)?)
}
fn phase_options(value: &Value, context: &str) -> Result<PhaseOptions, PacketError> {
    let v = array(value, context)?;
    Ok(PhaseOptions {
        r1: pose(value_at(v, 0), context)?,
        r2: pose(value_at(v, 1), context)?,
        r3: pose(value_at(v, 2), context)?,
        b1: pose(value_at(v, 3), context)?,
        b2: pose(value_at(v, 4), context)?,
        b3: pose(value_at(v, 5), context)?,
        drawing: value_at(v, 6).clone(),
        drawing_bbox: value_at(v, 7).clone(),
        checkboxes: (!value_at(v, 8).is_null()).then(|| value_at(v, 8).clone()),
    })
}
fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0 && !f.is_nan()),
        Value::String(s) => !s.is_empty(),
        _ => true,
    }
}
static ID_COUNTER: AtomicU64 = AtomicU64::new(0);
fn generate_id() -> String {
    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64;
    let value = time ^ ID_COUNTER.fetch_add(1, Ordering::Relaxed).rotate_left(17);
    format!(
        "{:08x}-{:04x}-4{:03x}-8{:03x}-{:012x}",
        (value >> 32) as u32,
        (value >> 16) as u16,
        value as u16 & 0x0fff,
        (value >> 12) as u16 & 0x0fff,
        value & 0x0000_ffff_ffff_ffff
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    fn m(id: &str) -> Match {
        Match::new(
            "Q1",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            Some(id.into()),
            None,
            None,
            None,
            None,
        )
    }

    #[test]
    fn construction_uses_year_defaults_and_generates_distinct_ids() {
        let y26 = Match::new(
            "Q1",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            Some("id".into()),
            None,
            None,
            None,
            Some(2026.0),
        );
        let y25 = Match::new(
            "Q1",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            Some("id2".into()),
            None,
            None,
            None,
            Some(2025.0),
        );
        assert_eq!(
            (y26.auto.red_one_robot.x, y26.auto.blue_one_robot.x),
            (2680.0, 830.0)
        );
        assert_eq!(
            (y25.auto.red_one_robot.x, y25.auto.blue_one_robot.x),
            (2055.0, 1455.0)
        );
        for phase in [
            &y26.auto,
            &y26.teleop,
            &y26.transition,
            &y26.endgame,
            &y26.notes,
        ] {
            assert_eq!(phase.drawing, json!([]));
            assert_eq!(phase.drawing_bbox, json!([]));
            assert_eq!(phase.checkboxes, json!([]));
        }
        for robot in [
            &y26.auto.red_one_robot,
            &y26.auto.red_two_robot,
            &y26.auto.red_three_robot,
            &y26.auto.blue_one_robot,
            &y26.auto.blue_two_robot,
            &y26.auto.blue_three_robot,
        ] {
            assert_eq!((robot.w, robot.h, robot.r), (152.4, 152.4, 0.0));
        }
        assert_ne!(
            Match::basic("Q", "1", "2", "3", "4", "5", "6").id,
            Match::basic("Q", "1", "2", "3", "4", "5", "6").id
        );
    }

    #[test]
    fn packet_roundtrip_preserves_all_legacy_data_and_defaults_optional_fields() {
        let mut original = Match::new(
            "Final",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            Some("packet-id".into()),
            None,
            Some("2026miket".into()),
            Some("2026miket_qm1".into()),
            Some(2026.0),
        );
        original.auto.red_one_robot.r = 12.3456;
        original.teleop.drawing = json!([[0, [10, 11], [12, 13]]]);
        original.teleop.drawing_bbox = json!([[1, 2, 3, 4]]);
        original.notes.checkboxes = json!([[10, 20, 1, true]]);
        original.field_metadata = Some(json!({"selectedFieldYear": 2026}));
        let packet = original.get_as_packet();
        let parsed = Match::from_packet(&packet).unwrap();
        assert_eq!(parsed.id, "packet-id");
        assert_eq!(parsed.teleop.drawing, original.teleop.drawing);
        assert_eq!(parsed.teleop.drawing_bbox, original.teleop.drawing_bbox);
        assert_eq!(parsed.notes.checkboxes, original.notes.checkboxes);
        assert_eq!(parsed.field_metadata, original.field_metadata);
        assert_eq!(parsed.auto.red_one_robot.r, 12.35);
        let legacy_source = m("legacy").get_as_packet();
        let legacy = Value::Array(legacy_source.as_array().unwrap()[..12].to_vec());
        let parsed_legacy = Match::from_packet(&legacy).unwrap();
        assert_eq!(parsed_legacy.notes.checkboxes, json!([]));
        assert_eq!(parsed_legacy.field_metadata, None);
        let mut no_checkboxes = packet;
        for i in 1..=5 {
            no_checkboxes.as_array_mut().unwrap()[8]
                .as_array_mut()
                .unwrap()[i]
                .as_array_mut()
                .unwrap()[8] = Value::Null;
        }
        let parsed = Match::from_packet(&no_checkboxes).unwrap();
        for phase in [
            &parsed.auto,
            &parsed.teleop,
            &parsed.endgame,
            &parsed.notes,
            &parsed.transition,
        ] {
            assert_eq!(phase.checkboxes, json!([]));
        }
    }

    #[test]
    fn packet_rounding_metadata_and_tba_cases_match_typescript() {
        for (input, expected) in [
            (0.001, 0.0),
            (0.0049, 0.0),
            (0.005, 0.01),
            (1.234, 1.23),
            (1.235, 1.24),
            (-1.234, -1.23),
            (-1.235, -1.24),
            (89.999, 90.0),
            (180.126, 180.13),
            (359.994, 359.99),
        ] {
            assert_eq!(js_to_fixed(input, 2), expected);
        }
        for (input, expected) in [
            (152.44, 152.4),
            (152.45, 152.4),
            (152.46, 152.5),
            (0.04, 0.0),
            (0.05, 0.1),
            (1.14, 1.1),
            (1.15, 1.1),
            (1.16, 1.2),
            (300.04, 300.0),
            (300.05, 300.1),
        ] {
            assert_eq!(js_to_fixed(input, 1), expected);
        }
        let mut x = m("x");
        x.auto.red_one_robot.w = 123.456;
        x.auto.red_one_robot.h = 78.951;
        x.auto.red_one_robot.r = 1.234567;
        let packet = x.get_as_packet();
        assert_eq!(packet[8][0][0], json!([123.5, 79.0]));
        assert_eq!(packet[8][1][0][2], json!(1.23));
        assert!(packet[12].is_null());
        for (event, key, year, expected) in [
            (None, None, None, false),
            (Some("ev"), None, Some(2026.0), false),
            (Some("ev"), Some("mk"), Some(0.0), false),
            (Some(""), Some("mk"), Some(2026.0), false),
            (Some("ev"), Some("mk"), Some(2026.0), true),
        ] {
            assert_eq!(
                Match::new(
                    "M",
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    Some("id".into()),
                    None,
                    event.map(str::to_owned),
                    key.map(str::to_owned),
                    year
                )
                .is_from_tba(),
                expected
            );
        }
    }

    #[test]
    fn update_and_custom_options_preserve_unrelated_state() {
        let dims = MatchDimensions {
            r1: Dimensions { w: 100.0, h: 100.0 },
            r2: Dimensions { w: 110.0, h: 110.0 },
            r3: Dimensions { w: 120.0, h: 120.0 },
            b1: Dimensions { w: 130.0, h: 130.0 },
            b2: Dimensions { w: 140.0, h: 140.0 },
            b3: Dimensions { w: 150.0, h: 150.0 },
        };
        let phase = |x| PhaseOptions {
            r1: RobotPose { x, y: 20.0, r: 0.5 },
            r2: RobotPose {
                x: 0.0,
                y: 0.0,
                r: 0.0,
            },
            r3: RobotPose {
                x: 0.0,
                y: 0.0,
                r: 0.0,
            },
            b1: RobotPose {
                x: 0.0,
                y: 0.0,
                r: 0.0,
            },
            b2: RobotPose {
                x: 0.0,
                y: 0.0,
                r: 0.0,
            },
            b3: RobotPose {
                x: 0.0,
                y: 0.0,
                r: 0.0,
            },
            drawing: json!([[1, [5, 5]]]),
            drawing_bbox: json!([[0, 0, 10, 10]]),
            checkboxes: Some(json!([[10, 20, 0, true]])),
        };
        let opt = MatchOptions {
            dimensions: dims,
            auto: phase(10.0),
            teleop: phase(0.0),
            endgame: phase(0.0),
            notes: None,
            transition: None,
        };
        let mut match_ = Match::new(
            "Old",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            Some("stable".into()),
            Some(opt),
            Some("ev".into()),
            Some("mk".into()),
            Some(2026.0),
        );
        assert_eq!(
            (
                match_.auto.red_one_robot.x,
                match_.auto.red_one_robot.y,
                match_.auto.red_one_robot.r,
                match_.auto.red_one_robot.w,
                match_.auto.blue_three_robot.w
            ),
            (10.0, 20.0, 0.5, 100.0, 150.0)
        );
        assert_eq!(match_.auto.drawing, json!([[1, [5, 5]]]));
        match_.update_info(
            "New",
            ["10".into(), "20".into(), "30".into()],
            ["40".into(), "50".into(), "60".into()],
        );
        assert_eq!(
            (
                match_.match_name.as_str(),
                match_.red_one.as_str(),
                match_.blue_three.as_str(),
                match_.id.as_str()
            ),
            ("New", "10", "60", "stable")
        );
        assert_eq!(match_.tba_event_key.as_deref(), Some("ev"));
    }

    #[test]
    fn invalid_packets_are_rejected() {
        assert!(Match::from_packet(&json!("not a packet")).is_err());
    }
}
