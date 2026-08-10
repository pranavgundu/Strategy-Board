//! Firebase/Firestore-independent sharing helpers.
//!
//! The previous browser helper coupled packet serialization and Firestore calls.
//! Here the packet and store are explicit boundaries, so the Tauri integration can
//! use Firestore's REST API or a backend service without changing share semantics.

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const SHARE_CODE_ALPHABET: &str = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
pub const SHARE_CODE_LENGTH: usize = 6;
pub const SHARE_TTL_MS: u64 = 7 * 24 * 60 * 60 * 1_000;
pub const MAX_UPLOAD_ATTEMPTS: usize = 5;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SharedMatchRecord {
    pub data: String,
    pub created_at: u64,
    pub expires_at: u64,
    pub version: u8,
}

pub trait ShareCodeGenerator {
    fn next_code(&mut self) -> String;
}
pub trait CloudStore {
    /// A permission-denied error is treated as an occupied/colliding share code,
    /// mirroring the legacy Firestore rule behavior.
    fn set_match(&mut self, share_code: &str, record: SharedMatchRecord) -> Result<(), String>;
    fn get_match(&self, share_code: &str) -> Result<Option<SharedMatchRecord>, String>;
}

pub fn generate_share_code<I: Iterator<Item = usize>>(indices: I) -> String {
    let alphabet: Vec<char> = SHARE_CODE_ALPHABET.chars().collect();
    indices
        .take(SHARE_CODE_LENGTH)
        .map(|index| alphabet[index % alphabet.len()])
        .collect()
}

pub fn normalize_share_code(share_code: &str) -> Result<String, String> {
    let code = share_code.trim().to_ascii_uppercase();
    if code.len() != SHARE_CODE_LENGTH
        || !code
            .chars()
            .all(|character| SHARE_CODE_ALPHABET.contains(character))
    {
        return Err("Invalid share code format".into());
    }
    Ok(code)
}

/// Removes the local match ID at packet index seven before a packet leaves the device.
pub fn serialize_share_packet(packet: &[Value]) -> Result<String, String> {
    let mut packet_without_id = packet.to_vec();
    if let Some(id) = packet_without_id.get_mut(7) {
        *id = Value::Null;
    }
    serde_json::to_string(&packet_without_id).map_err(|error| error.to_string())
}

pub fn create_share_record(packet: &[Value], created_at: u64) -> Result<SharedMatchRecord, String> {
    Ok(SharedMatchRecord {
        data: serialize_share_packet(packet)?,
        created_at,
        expires_at: created_at + SHARE_TTL_MS,
        version: 1,
    })
}

pub fn upload_match<S: CloudStore, G: ShareCodeGenerator>(
    store: &mut S,
    generator: &mut G,
    packet: &[Value],
    created_at: u64,
) -> Result<String, String> {
    let record = create_share_record(packet, created_at)?;
    let mut last_error = None;
    for _ in 0..MAX_UPLOAD_ATTEMPTS {
        let code = generator.next_code();
        match store.set_match(&code, record.clone()) {
            Ok(()) => return Ok(code),
            Err(error) if error == "permission-denied" => last_error = Some(error),
            Err(error) => return Err(error),
        }
    }
    Err(format!(
        "Failed to allocate a unique share code after {MAX_UPLOAD_ATTEMPTS} attempts: {}",
        last_error.unwrap_or_default()
    ))
}

pub fn download_match<S: CloudStore>(
    store: &S,
    share_code: &str,
    now_ms: u64,
) -> Result<Option<Vec<Value>>, String> {
    let code = normalize_share_code(share_code)?;
    let Some(record) = store.get_match(&code)? else {
        return Ok(None);
    };
    if now_ms > record.expires_at {
        return Err("This share code has expired".into());
    }
    serde_json::from_str(&record.data)
        .map(Some)
        .map_err(|error| error.to_string())
}

pub fn check_share_code<S: CloudStore>(store: &S, share_code: &str) -> Result<bool, String> {
    let code = match normalize_share_code(share_code) {
        Ok(code) => code,
        Err(_) => return Ok(false),
    };
    store.get_match(&code).map(|record| record.is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::{HashMap, VecDeque};
    #[derive(Default)]
    struct Codes(VecDeque<String>);
    impl ShareCodeGenerator for Codes {
        fn next_code(&mut self) -> String {
            self.0.pop_front().unwrap()
        }
    }
    #[derive(Default)]
    struct Store {
        records: HashMap<String, SharedMatchRecord>,
        writes: usize,
        failures: VecDeque<String>,
    }
    impl CloudStore for Store {
        fn set_match(&mut self, code: &str, record: SharedMatchRecord) -> Result<(), String> {
            self.writes += 1;
            if let Some(error) = self.failures.pop_front() {
                return Err(error);
            }
            self.records.insert(code.into(), record);
            Ok(())
        }
        fn get_match(&self, code: &str) -> Result<Option<SharedMatchRecord>, String> {
            Ok(self.records.get(code).cloned())
        }
    }
    #[test]
    fn share_codes_use_the_legacy_unambiguous_alphabet() {
        assert_eq!(
            generate_share_code([0, 1, 2, 3, 4, 5].into_iter()),
            "ABCDEF"
        );
        assert!(!SHARE_CODE_ALPHABET.contains('I'));
        assert!(!SHARE_CODE_ALPHABET.contains('0'));
    }
    #[test]
    fn serialization_removes_only_local_packet_id() {
        let packet = (0..9).map(Value::from).collect::<Vec<_>>();
        let serialized = serialize_share_packet(&packet).unwrap();
        let parsed: Vec<Value> = serde_json::from_str(&serialized).unwrap();
        assert_eq!(parsed[7], Value::Null);
        assert_eq!(parsed[6], Value::from(6));
    }
    #[test]
    fn upload_retries_permission_denied_and_keeps_expiry_contract() {
        let mut store = Store {
            failures: VecDeque::from(["permission-denied".into()]),
            ..Default::default()
        };
        let mut codes = Codes(VecDeque::from(["AAAAAA".into(), "BBBBBB".into()]));
        let packet = vec![Value::from(1)];
        assert_eq!(
            upload_match(&mut store, &mut codes, &packet, 100).unwrap(),
            "BBBBBB"
        );
        assert_eq!(store.writes, 2);
        assert_eq!(store.records["BBBBBB"].expires_at, 100 + SHARE_TTL_MS);
    }
    #[test]
    fn download_normalizes_codes_and_enforces_format_and_expiry() {
        let mut store = Store::default();
        store.records.insert(
            "ABC234".into(),
            create_share_record(&[Value::from("x")], 100).unwrap(),
        );
        assert_eq!(
            download_match(&store, " abc234 ", 100).unwrap().unwrap(),
            vec![Value::from("x")]
        );
        assert_eq!(
            download_match(&store, "short", 100).unwrap_err(),
            "Invalid share code format"
        );
        assert_eq!(
            download_match(&store, "AB/CD!", 100).unwrap_err(),
            "Invalid share code format"
        );
        assert_eq!(
            download_match(&store, "ABC234", 100 + SHARE_TTL_MS + 1).unwrap_err(),
            "This share code has expired"
        );
    }
    #[test]
    fn existence_check_returns_false_for_invalid_and_missing_codes() {
        let store = Store::default();
        assert!(!check_share_code(&store, "short").unwrap());
        assert!(!check_share_code(&store, "ABC234").unwrap());
    }
}
