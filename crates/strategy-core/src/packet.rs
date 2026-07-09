use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Deserialize)]
pub struct RobotPos {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub r: f64,
}

#[derive(Deserialize)]
pub struct PhaseState {
    #[serde(rename = "redOneRobot")]
    pub red_one: RobotPos,
    #[serde(rename = "redTwoRobot")]
    pub red_two: RobotPos,
    #[serde(rename = "redThreeRobot")]
    pub red_three: RobotPos,
    #[serde(rename = "blueOneRobot")]
    pub blue_one: RobotPos,
    #[serde(rename = "blueTwoRobot")]
    pub blue_two: RobotPos,
    #[serde(rename = "blueThreeRobot")]
    pub blue_three: RobotPos,
    #[serde(default)]
    pub drawing: Value,
    #[serde(default, rename = "drawingBBox")]
    pub drawing_bbox: Value,
    #[serde(default)]
    pub checkboxes: Value,
}

#[derive(Deserialize)]
pub struct MatchState {
    #[serde(rename = "matchName")]
    pub match_name: Value,
    #[serde(rename = "redOne")]
    pub red_one: Value,
    #[serde(rename = "redTwo")]
    pub red_two: Value,
    #[serde(rename = "redThree")]
    pub red_three: Value,
    #[serde(rename = "blueOne")]
    pub blue_one: Value,
    #[serde(rename = "blueTwo")]
    pub blue_two: Value,
    #[serde(rename = "blueThree")]
    pub blue_three: Value,
    pub id: Value,
    pub auto: PhaseState,
    pub teleop: PhaseState,
    pub transition: PhaseState,
    pub endgame: PhaseState,
    pub notes: PhaseState,
    #[serde(default, rename = "tbaEventKey")]
    pub tba_event_key: Value,
    #[serde(default, rename = "tbaMatchKey")]
    pub tba_match_key: Value,
    #[serde(default, rename = "tbaYear")]
    pub tba_year: Value,
    #[serde(default, rename = "fieldMetadata")]
    pub field_metadata: Value,
}

fn js_to_fixed(x: f64, digits: usize) -> f64 {
    if !x.is_finite() || x == 0.0 {
        return x;
    }

    if x.abs() >= 1e15 {
        return x;
    }
    let negative = x < 0.0;

    let s = format!("{:.60}", x.abs());
    let dot = s.find('.').expect("formatted float has a decimal point");
    let int_part = &s[..dot];
    let frac_part = &s[dot + 1..];
    let frac = frac_part.as_bytes();

    let next_digit = if frac.len() > digits {
        frac[digits] - b'0'
    } else {
        0
    };
    let rest_nonzero = frac.len() > digits + 1 && frac[digits + 1..].iter().any(|&b| b != b'0');

    let round_up = next_digit > 5 || (next_digit == 5 && (rest_nonzero || !negative));

    let kept = &frac_part[..digits.min(frac_part.len())];
    let mut mantissa: u128 = format!("{int_part}{kept}")
        .parse()
        .expect("digits parse as an integer");
    if round_up {
        mantissa += 1;
    }
    let result = mantissa as f64 / 10f64.powi(digits as i32);
    if negative {
        -result
    } else {
        result
    }
}

fn robot_packet(r: &RobotPos) -> Value {
    json!([r.x, r.y, js_to_fixed(r.r, 2)])
}

fn phase_packet(p: &PhaseState) -> Value {
    json!([
        robot_packet(&p.red_one),
        robot_packet(&p.red_two),
        robot_packet(&p.red_three),
        robot_packet(&p.blue_one),
        robot_packet(&p.blue_two),
        robot_packet(&p.blue_three),
        p.drawing,
        p.drawing_bbox,
        p.checkboxes,
    ])
}

fn dim_packet(r: &RobotPos) -> Value {
    json!([js_to_fixed(r.w, 1), js_to_fixed(r.h, 1)])
}

pub fn encode(state: &MatchState) -> Value {
    let field_metadata = if state.field_metadata.is_null() {
        Value::Null
    } else {
        state.field_metadata.clone()
    };
    json!([
        state.match_name,
        state.red_one,
        state.red_two,
        state.red_three,
        state.blue_one,
        state.blue_two,
        state.blue_three,
        state.id,
        [
            json!([
                dim_packet(&state.auto.red_one),
                dim_packet(&state.auto.red_two),
                dim_packet(&state.auto.red_three),
                dim_packet(&state.auto.blue_one),
                dim_packet(&state.auto.blue_two),
                dim_packet(&state.auto.blue_three),
            ]),
            phase_packet(&state.auto),
            phase_packet(&state.teleop),
            phase_packet(&state.endgame),
            phase_packet(&state.notes),
            phase_packet(&state.transition),
        ],
        state.tba_event_key,
        state.tba_match_key,
        state.tba_year,
        field_metadata,
    ])
}

fn at(v: &[Value], i: usize) -> Value {
    v.get(i).cloned().unwrap_or(Value::Null)
}

fn arr<'a>(v: &'a Value, ctx: &str) -> Result<&'a Vec<Value>, String> {
    v.as_array()
        .ok_or_else(|| format!("invalid match packet: {ctx} is not an array"))
}

fn robot_fields(v: &Value, ctx: &str) -> Result<Value, String> {
    let r = arr(v, ctx)?;
    Ok(json!({ "x": at(r, 0), "y": at(r, 1), "r": at(r, 2) }))
}

fn dim_fields(v: &Value, ctx: &str) -> Result<Value, String> {
    let d = arr(v, ctx)?;
    Ok(json!({ "w": at(d, 0), "h": at(d, 1) }))
}

fn phase_fields(v: &Value, ctx: &str) -> Result<Value, String> {
    let p = arr(v, ctx)?;
    let cb = at(p, 8);
    Ok(json!({
        "r1": robot_fields(&at(p, 0), ctx)?,
        "r2": robot_fields(&at(p, 1), ctx)?,
        "r3": robot_fields(&at(p, 2), ctx)?,
        "b1": robot_fields(&at(p, 3), ctx)?,
        "b2": robot_fields(&at(p, 4), ctx)?,
        "b3": robot_fields(&at(p, 5), ctx)?,
        "d": at(p, 6),
        "dx": at(p, 7),
        "cb": if cb.is_null() { json!([]) } else { cb },
    }))
}

fn is_truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().map(|f| f != 0.0 && !f.is_nan()).unwrap_or(true),
        Value::String(s) => !s.is_empty(),
        _ => true,
    }
}

pub fn decode(packet: &Value) -> Result<Value, String> {
    let p = arr(packet, "packet")?;
    let body_v = at(p, 8);
    let body = arr(&body_v, "packet[8]")?;
    let dims_v = at(body, 0);
    let dims = arr(&dims_v, "dimensions")?;
    let notes = at(body, 4);
    let transition = at(body, 5);

    Ok(json!({
        "matchName": at(p, 0),
        "redOne": at(p, 1),
        "redTwo": at(p, 2),
        "redThree": at(p, 3),
        "blueOne": at(p, 4),
        "blueTwo": at(p, 5),
        "blueThree": at(p, 6),
        "id": at(p, 7),
        "options": {
            "dim": {
                "r1": dim_fields(&at(dims, 0), "dimensions")?,
                "r2": dim_fields(&at(dims, 1), "dimensions")?,
                "r3": dim_fields(&at(dims, 2), "dimensions")?,
                "b1": dim_fields(&at(dims, 3), "dimensions")?,
                "b2": dim_fields(&at(dims, 4), "dimensions")?,
                "b3": dim_fields(&at(dims, 5), "dimensions")?,
            },
            "a": phase_fields(&at(body, 1), "auto")?,
            "t": phase_fields(&at(body, 2), "teleop")?,
            "e": phase_fields(&at(body, 3), "endgame")?,
            "n": if is_truthy(&notes) { phase_fields(&notes, "notes")? } else { Value::Null },
            "tr": if is_truthy(&transition) { phase_fields(&transition, "transition")? } else { Value::Null },
        },
        "tbaEventKey": at(p, 9),
        "tbaMatchKey": at(p, 10),
        "tbaYear": at(p, 11),
        "fieldMetadata": at(p, 12),
    }))
}
