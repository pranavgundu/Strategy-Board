//! Persistence primitives and Statbotics cache policy.
//!
//! A concrete Tauri persistence plugin can implement [`KeyValueStore`].  The
//! cache deliberately works with `serde_json::Value`: the Statbotics response
//! schema is owned by the remote API and should not be silently narrowed here.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const STATBOTICS_CACHE_PREFIX: &str = "statbotics_";
pub const DEFAULT_STATBOTICS_TTL_MS: u64 = 24 * 60 * 60 * 1_000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StorageError {
    Backend(String),
    InvalidCacheEntry(String),
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Backend(message) => write!(formatter, "storage backend error: {message}"),
            Self::InvalidCacheEntry(message) => write!(formatter, "invalid cache entry: {message}"),
        }
    }
}

impl std::error::Error for StorageError {}

/// Minimal synchronous interface suitable for an in-memory store, a database
/// transaction, or a Tauri command backed by a persistence plugin.
pub trait KeyValueStore {
    fn get(&self, key: &str) -> Result<Option<Value>, StorageError>;
    fn get_many(&self, keys: &[String]) -> Result<Vec<Option<Value>>, StorageError> {
        keys.iter().map(|key| self.get(key)).collect()
    }
    fn set(&mut self, key: &str, value: Value) -> Result<(), StorageError>;
    fn delete(&mut self, key: &str) -> Result<(), StorageError>;
    fn clear(&mut self) -> Result<(), StorageError>;
    fn entries(&self) -> Result<Vec<(String, Value)>, StorageError>;
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CachedStatboticsData {
    pub data: Value,
    #[serde(rename = "timestamp", alias = "timestamp_ms")]
    pub timestamp_ms: u64,
    #[serde(rename = "matchKey", alias = "match_key")]
    pub match_key: String,
}

pub fn statbotics_cache_key(match_key: &str) -> String {
    format!("{STATBOTICS_CACHE_PREFIX}{match_key}")
}

pub fn cache_statbotics<S: KeyValueStore>(
    store: &mut S,
    match_key: &str,
    data: Value,
    now_ms: u64,
) -> Result<(), StorageError> {
    let cache_entry = CachedStatboticsData {
        data,
        timestamp_ms: now_ms,
        match_key: match_key.to_owned(),
    };
    let value = serde_json::to_value(cache_entry)
        .map_err(|error| StorageError::InvalidCacheEntry(error.to_string()))?;
    store.set(&statbotics_cache_key(match_key), value)
}

pub fn get_cached_statbotics<S: KeyValueStore>(
    store: &mut S,
    match_key: &str,
    now_ms: u64,
    max_age_ms: u64,
) -> Result<Option<Value>, StorageError> {
    let key = statbotics_cache_key(match_key);
    let Some(value) = store.get(&key)? else {
        return Ok(None);
    };
    let cached: CachedStatboticsData = serde_json::from_value(value)
        .map_err(|error| StorageError::InvalidCacheEntry(error.to_string()))?;

    // Saturating subtraction treats a clock that moved backwards as a fresh
    // entry, matching the legacy `Date.now() - timestamp` behavior.
    if now_ms.saturating_sub(cached.timestamp_ms) > max_age_ms {
        store.delete(&key)?;
        return Ok(None);
    }
    Ok(Some(cached.data))
}

pub fn get_statbotics_timestamp<S: KeyValueStore>(
    store: &S,
    match_key: &str,
) -> Result<Option<u64>, StorageError> {
    let Some(value) = store.get(&statbotics_cache_key(match_key))? else {
        return Ok(None);
    };
    let cached: CachedStatboticsData = serde_json::from_value(value)
        .map_err(|error| StorageError::InvalidCacheEntry(error.to_string()))?;
    Ok(Some(cached.timestamp_ms))
}

/// Clears just the API cache; application settings and other persisted values
/// are intentionally left untouched.
pub fn clear_statbotics_cache<S: KeyValueStore>(store: &mut S) -> Result<usize, StorageError> {
    let keys: Vec<String> = store
        .entries()?
        .into_iter()
        .map(|(key, _)| key)
        .filter(|key| key.starts_with(STATBOTICS_CACHE_PREFIX))
        .collect();
    let count = keys.len();
    for key in keys {
        store.delete(&key)?;
    }
    Ok(count)
}

/// Test-friendly implementation. Production code should wrap the selected
/// desktop/mobile persistence backend behind the trait above.
#[derive(Debug, Default, Clone)]
pub struct MemoryStore {
    values: BTreeMap<String, Value>,
}

impl KeyValueStore for MemoryStore {
    fn get(&self, key: &str) -> Result<Option<Value>, StorageError> {
        Ok(self.values.get(key).cloned())
    }

    fn set(&mut self, key: &str, value: Value) -> Result<(), StorageError> {
        self.values.insert(key.to_owned(), value);
        Ok(())
    }

    fn delete(&mut self, key: &str) -> Result<(), StorageError> {
        self.values.remove(key);
        Ok(())
    }

    fn clear(&mut self) -> Result<(), StorageError> {
        self.values.clear();
        Ok(())
    }

    fn entries(&self) -> Result<Vec<(String, Value)>, StorageError> {
        Ok(self
            .values
            .iter()
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn store_round_trip_and_get_many_preserve_missing_keys() {
        let mut store = MemoryStore::default();
        store.set("one", json!(1)).unwrap();
        let values = store
            .get_many(&["one".to_owned(), "missing".to_owned()])
            .unwrap();
        assert_eq!(values, vec![Some(json!(1)), None]);
        store.delete("one").unwrap();
        assert_eq!(store.get("one").unwrap(), None);
        store.set("two", json!(2)).unwrap();
        store.clear().unwrap();
        assert!(store.entries().unwrap().is_empty());
    }

    #[test]
    fn cache_uses_prefix_and_preserves_response_data() {
        let mut store = MemoryStore::default();
        cache_statbotics(&mut store, "2026miket_qm1", json!({"score": 99}), 1_000).unwrap();
        let raw = store.get("statbotics_2026miket_qm1").unwrap().unwrap();
        assert_eq!(raw["data"], json!({"score": 99}));
        // Field names intentionally retain the IndexedDB schema from db.ts.
        assert_eq!(raw["timestamp"], json!(1_000));
        assert_eq!(raw["matchKey"], json!("2026miket_qm1"));
        assert_eq!(
            get_statbotics_timestamp(&store, "2026miket_qm1").unwrap(),
            Some(1_000)
        );
    }

    #[test]
    fn fresh_cache_is_returned_and_expired_cache_is_deleted() {
        let mut store = MemoryStore::default();
        cache_statbotics(&mut store, "fresh", json!({"ok": true}), 9_500).unwrap();
        assert_eq!(
            get_cached_statbotics(&mut store, "fresh", 10_000, 1_000).unwrap(),
            Some(json!({"ok": true}))
        );
        assert!(store.get("statbotics_fresh").unwrap().is_some());

        cache_statbotics(&mut store, "old", json!({"ok": true}), 0).unwrap();
        assert_eq!(
            get_cached_statbotics(&mut store, "old", 10_000, 1_000).unwrap(),
            None
        );
        assert_eq!(store.get("statbotics_old").unwrap(), None);
    }

    #[test]
    fn default_ttl_is_twenty_four_hours_and_boundary_is_fresh() {
        let mut store = MemoryStore::default();
        cache_statbotics(&mut store, "m1", json!({"ok": true}), 1_000).unwrap();
        assert_eq!(
            get_cached_statbotics(
                &mut store,
                "m1",
                1_000 + DEFAULT_STATBOTICS_TTL_MS,
                DEFAULT_STATBOTICS_TTL_MS
            )
            .unwrap(),
            Some(json!({"ok": true}))
        );
        // A backwards clock must not evict a valid entry.
        assert!(
            get_cached_statbotics(&mut store, "m1", 500, DEFAULT_STATBOTICS_TTL_MS)
                .unwrap()
                .is_some()
        );
    }

    #[test]
    fn missing_and_malformed_cache_entries_are_distinguished() {
        let mut store = MemoryStore::default();
        assert_eq!(
            get_cached_statbotics(&mut store, "none", 0, 1).unwrap(),
            None
        );
        store
            .set("statbotics_bad", json!({"timestamp": "nope"}))
            .unwrap();
        assert!(matches!(
            get_cached_statbotics(&mut store, "bad", 0, 1),
            Err(StorageError::InvalidCacheEntry(_))
        ));
    }

    #[test]
    fn clear_only_removes_statbotics_entries() {
        let mut store = MemoryStore::default();
        store.set("statbotics_a", json!({})).unwrap();
        store.set("appData", json!({})).unwrap();
        store.set("statbotics_b", json!({})).unwrap();
        assert_eq!(clear_statbotics_cache(&mut store).unwrap(), 2);
        assert_eq!(store.get("statbotics_a").unwrap(), None);
        assert_eq!(store.get("statbotics_b").unwrap(), None);
        assert_eq!(store.get("appData").unwrap(), Some(json!({})));
    }

    #[test]
    fn legacy_indexeddb_cache_schema_deserializes_without_migration() {
        let mut store = MemoryStore::default();
        store
            .set(
                "statbotics_legacy",
                json!({"data": {"epa": 12.3}, "timestamp": 5, "matchKey": "legacy"}),
            )
            .unwrap();
        assert_eq!(
            get_cached_statbotics(&mut store, "legacy", 5, 1).unwrap(),
            Some(json!({"epa": 12.3}))
        );
    }

    #[derive(Default)]
    struct FailingStore;

    impl KeyValueStore for FailingStore {
        fn get(&self, _: &str) -> Result<Option<Value>, StorageError> {
            Err(StorageError::Backend("read failed".into()))
        }
        fn set(&mut self, _: &str, _: Value) -> Result<(), StorageError> {
            Err(StorageError::Backend("write failed".into()))
        }
        fn delete(&mut self, _: &str) -> Result<(), StorageError> {
            Err(StorageError::Backend("delete failed".into()))
        }
        fn clear(&mut self) -> Result<(), StorageError> {
            Err(StorageError::Backend("clear failed".into()))
        }
        fn entries(&self) -> Result<Vec<(String, Value)>, StorageError> {
            Err(StorageError::Backend("entries failed".into()))
        }
    }

    #[test]
    fn backend_failures_are_returned_to_the_tauri_command_layer() {
        let mut store = FailingStore;
        assert!(matches!(
            cache_statbotics(&mut store, "m", json!({}), 0),
            Err(StorageError::Backend(_))
        ));
        assert!(matches!(
            get_cached_statbotics(&mut store, "m", 0, 1),
            Err(StorageError::Backend(_))
        ));
        assert!(matches!(
            clear_statbotics_cache(&mut store),
            Err(StorageError::Backend(_))
        ));
    }
}
