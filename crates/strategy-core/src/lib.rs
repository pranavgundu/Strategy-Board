mod packet;
mod search;

use serde::Serialize;
use wasm_bindgen::prelude::*;

fn to_js<T: Serialize + ?Sized>(value: &T) -> Result<JsValue, JsValue> {
    let serializer = serde_wasm_bindgen::Serializer::json_compatible();
    value
        .serialize(&serializer)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

fn from_js<T: serde::de::DeserializeOwned>(value: JsValue) -> Result<T, JsValue> {
    serde_wasm_bindgen::from_value(value).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen(js_name = fuzzyMatchCore)]
pub fn fuzzy_match_core(
    search_term: &str,
    target: &str,
    original_target: Option<String>,
) -> Result<JsValue, JsValue> {
    match search::fuzzy_match(search_term, target, original_target.as_deref()) {
        Some(result) => to_js(&result),
        None => Ok(JsValue::NULL),
    }
}

#[wasm_bindgen(js_name = fuzzySearchBatch)]
pub fn fuzzy_search_batch(
    items: JsValue,
    search_lower: &str,
    min_score: i32,
) -> Result<JsValue, JsValue> {
    let items: Vec<search::BatchItem> = from_js(items)?;
    to_js(&search::fuzzy_search_batch(&items, search_lower, min_score))
}

#[wasm_bindgen(js_name = matchStateToPacket)]
pub fn match_state_to_packet(state: JsValue) -> Result<JsValue, JsValue> {
    let state: packet::MatchState = from_js(state)?;
    to_js(&packet::encode(&state))
}

#[wasm_bindgen(js_name = packetToMatchFields)]
pub fn packet_to_match_fields(value: JsValue) -> Result<JsValue, JsValue> {
    let value: serde_json::Value = from_js(value)?;
    let fields = packet::decode(&value).map_err(|e| JsValue::from_str(&e))?;
    to_js(&fields)
}
