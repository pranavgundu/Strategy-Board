//! Persistence-agnostic equivalent of the browser `Model` helper.
//!
//! Tauri adapters implement `MatchPersistence` with their chosen store
//! (plugin-store, SQLite, or a command-backed frontend store).  JSON values
//! are retained so the legacy `appData` packet payload is never reshaped.

use serde_json::{json, Value};

use super::match_model::Match;

pub const APP_DATA_KEY: &str = "appData";
pub const MATCH_IDS_KEY: &str = "matchIds";

pub trait MatchPersistence {
    type Error;
    fn get(&self, key: &str) -> Result<Option<Value>, Self::Error>;
    fn get_many(&self, keys: &[String]) -> Result<Option<Vec<Value>>, Self::Error>;
    fn set(&mut self, key: &str, value: Value) -> Result<(), Self::Error>;
    fn clear(&mut self) -> Result<(), Self::Error>;
}

#[derive(Debug)]
pub struct Model<S> {
    pub matches: Vec<Match>,
    match_ids: Vec<String>,
    pub analytics_events: Vec<Value>,
    pub persistence: S,
}

impl<S: MatchPersistence> Model<S> {
    pub fn new(persistence: S) -> Self {
        Self {
            matches: vec![],
            match_ids: vec![],
            analytics_events: vec![],
            persistence,
        }
    }
    pub fn match_ids(&self) -> &[String] {
        &self.match_ids
    }

    pub fn load_persistent_data(&mut self) -> Result<(), S::Error> {
        if let Some(app_data) = self.persistence.get(APP_DATA_KEY)? {
            if let Some(packets) = app_data.as_array() {
                for packet in packets {
                    self.push_packet(packet);
                }
            }
            return Ok(());
        }
        let Some(ids) = self.persistence.get(MATCH_IDS_KEY)? else {
            return Ok(());
        };
        let ids = ids
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(Value::as_str)
                    .map(str::to_owned)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        let Some(packets) = self.persistence.get_many(&ids)? else {
            return Ok(());
        };
        for packet in &packets {
            self.push_packet(packet);
        }
        self.persist()?;
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_new_match(
        &mut self,
        match_name: impl Into<String>,
        red_one: impl Into<String>,
        red_two: impl Into<String>,
        red_three: impl Into<String>,
        blue_one: impl Into<String>,
        blue_two: impl Into<String>,
        blue_three: impl Into<String>,
        tba_event_key: Option<String>,
        tba_match_key: Option<String>,
        tba_year: Option<f64>,
    ) -> Result<String, S::Error> {
        let match_ = Match::new(
            match_name,
            red_one,
            red_two,
            red_three,
            blue_one,
            blue_two,
            blue_three,
            None,
            None,
            tba_event_key,
            tba_match_key,
            tba_year,
        );
        self.add_match(match_)
    }

    pub fn add_match(&mut self, match_: Match) -> Result<String, S::Error> {
        let id = match_.id.clone();
        self.matches.push(match_);
        self.match_ids.push(id.clone());
        self.analytics_events
            .push(json!({ "event": "match_creation" }));
        self.persist()?;
        Ok(id)
    }
    pub fn delete_match(&mut self, id: &str) -> Result<(), S::Error> {
        let Some(index) = self.matches.iter().position(|match_| match_.id == id) else {
            return Ok(());
        };
        self.matches.remove(index);
        self.match_ids.remove(index);
        self.persist()
    }
    pub fn get_match(&self, id: &str) -> Option<&Match> {
        self.matches.iter().find(|match_| match_.id == id)
    }
    pub fn get_match_mut(&mut self, id: &str) -> Option<&mut Match> {
        self.matches.iter_mut().find(|match_| match_.id == id)
    }
    pub fn update_match(&mut self, id: &str) -> Result<(), S::Error> {
        if self.get_match(id).is_some() {
            self.persist()?;
        }
        Ok(())
    }
    pub fn clear(&mut self) -> Result<(), S::Error> {
        self.matches.clear();
        self.match_ids.clear();
        self.persistence.clear()
    }

    fn push_packet(&mut self, packet: &Value) {
        if let Ok(match_) = Match::from_packet(packet) {
            self.match_ids.push(match_.id.clone());
            self.matches.push(match_);
        }
    }
    fn persist(&mut self) -> Result<(), S::Error> {
        self.persistence.set(
            APP_DATA_KEY,
            Value::Array(self.matches.iter().map(Match::get_as_packet).collect()),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::BTreeMap;
    use std::convert::Infallible;
    use std::rc::Rc;

    #[derive(Clone, Default)]
    struct Memory {
        values: Rc<RefCell<BTreeMap<String, Value>>>,
        clears: Rc<RefCell<u32>>,
    }
    impl MatchPersistence for Memory {
        type Error = Infallible;
        fn get(&self, key: &str) -> Result<Option<Value>, Self::Error> {
            Ok(self.values.borrow().get(key).cloned())
        }
        fn get_many(&self, keys: &[String]) -> Result<Option<Vec<Value>>, Self::Error> {
            Ok(Some(
                keys.iter()
                    .filter_map(|key| self.values.borrow().get(key).cloned())
                    .collect(),
            ))
        }
        fn set(&mut self, key: &str, value: Value) -> Result<(), Self::Error> {
            self.values.borrow_mut().insert(key.into(), value);
            Ok(())
        }
        fn clear(&mut self) -> Result<(), Self::Error> {
            self.values.borrow_mut().clear();
            *self.clears.borrow_mut() += 1;
            Ok(())
        }
    }
    fn packet(id: &str) -> Value {
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
        .get_as_packet()
    }

    #[test]
    fn loads_consolidated_data_and_skips_corrupt_packets() {
        let mut store = Memory::default();
        store
            .set(
                APP_DATA_KEY,
                json!([packet("good"), "not a packet", packet("second")]),
            )
            .unwrap();
        let mut model = Model::new(store);
        model.load_persistent_data().unwrap();
        assert_eq!(model.matches.len(), 2);
        assert_eq!(model.matches[0].id, "good");
        assert_eq!(model.match_ids(), ["good", "second"]);
    }

    #[test]
    fn migrates_legacy_data_and_does_nothing_when_no_data_exists() {
        let mut empty = Model::new(Memory::default());
        empty.load_persistent_data().unwrap();
        assert!(empty.matches.is_empty());
        assert!(empty.persistence.get(APP_DATA_KEY).unwrap().is_none());
        let mut store = Memory::default();
        store.set(MATCH_IDS_KEY, json!(["id-m"])).unwrap();
        store.set("id-m", packet("id-m")).unwrap();
        let mut model = Model::new(store);
        model.load_persistent_data().unwrap();
        assert_eq!(model.matches.len(), 1);
        let saved = model.persistence.get(APP_DATA_KEY).unwrap().unwrap();
        assert_eq!(saved[0][0], "Q1");
        assert_eq!(saved[0][7], "id-m");
    }

    #[test]
    fn crud_tba_and_persistence_behave_like_browser_model() {
        let mut model = Model::new(Memory::default());
        let one = model
            .create_new_match("Q1", "1", "2", "3", "4", "5", "6", None, None, None)
            .unwrap();
        let two = model
            .create_new_match(
                "Q2",
                "7",
                "8",
                "9",
                "10",
                "11",
                "12",
                Some("2026miket".into()),
                Some("2026miket_qm1".into()),
                Some(2026.0),
            )
            .unwrap();
        assert_eq!(
            model.analytics_events,
            vec![
                json!({"event": "match_creation"}),
                json!({"event": "match_creation"})
            ]
        );
        assert!(model.get_match(&one).is_some());
        assert_eq!(model.get_match(&two).unwrap().tba_year, Some(2026.0));
        assert!(model.get_match("nope").is_none());
        let before = model.persistence.get(APP_DATA_KEY).unwrap();
        model.delete_match("nope").unwrap();
        assert_eq!(model.persistence.get(APP_DATA_KEY).unwrap(), before);
        model.update_match("nope").unwrap();
        model.update_match(&one).unwrap();
        model.delete_match(&one).unwrap();
        assert_eq!(model.matches.len(), 1);
        assert_eq!(model.matches[0].id, two);
        model.clear().unwrap();
        assert!(model.matches.is_empty());
        assert_eq!(*model.persistence.clears.borrow(), 1);
    }
}
