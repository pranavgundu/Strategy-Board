//! Runtime adapters for the platform-neutral helper layer.
//!
//! The helpers intentionally own their data contracts while this module owns
//! I/O.  Keeping the boundary here makes desktop and mobile use the same
//! persistence and TLS-backed HTTP implementation.

use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
    time::Duration,
};

use atomicwrites::{AtomicFile, OverwriteBehavior};
use reqwest::StatusCode;
use serde_json::{json, Value};

use crate::helpers::{cloud, contributors, statbotics, storage, tba};

/// Small, durable JSON store.  Writes use a sibling temporary file followed
/// by rename, so a process interruption cannot leave a partially-written DB.
#[derive(Debug)]
pub struct JsonFileStore {
    path: PathBuf,
    values: BTreeMap<String, Value>,
}

impl JsonFileStore {
    pub fn open(path: PathBuf) -> Result<Self, storage::StorageError> {
        let values = match fs::read_to_string(&path) {
            Ok(contents) => serde_json::from_str(&contents).map_err(|error| {
                storage::StorageError::Backend(format!(
                    "invalid storage file {}: {error}",
                    path.display()
                ))
            })?,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => BTreeMap::new(),
            Err(error) => {
                return Err(storage::StorageError::Backend(format!(
                    "cannot read storage file {}: {error}",
                    path.display()
                )));
            }
        };
        Ok(Self { path, values })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn persist(&self, values: &BTreeMap<String, Value>) -> Result<(), storage::StorageError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| storage::StorageError::Backend(error.to_string()))?;
        }
        let bytes = serde_json::to_vec(values)
            .map_err(|error| storage::StorageError::Backend(error.to_string()))?;
        AtomicFile::new(&self.path, OverwriteBehavior::AllowOverwrite)
            .write(|file| std::io::Write::write_all(file, &bytes))
            .map_err(|error| {
                storage::StorageError::Backend(format!("cannot replace storage file: {error}"))
            })
    }

    fn replace(&mut self, values: BTreeMap<String, Value>) -> Result<(), storage::StorageError> {
        self.persist(&values)?;
        self.values = values;
        Ok(())
    }
}

impl storage::KeyValueStore for JsonFileStore {
    fn get(&self, key: &str) -> Result<Option<Value>, storage::StorageError> {
        Ok(self.values.get(key).cloned())
    }

    fn set(&mut self, key: &str, value: Value) -> Result<(), storage::StorageError> {
        let mut next = self.values.clone();
        next.insert(key.to_owned(), value);
        self.replace(next)
    }

    fn delete(&mut self, key: &str) -> Result<(), storage::StorageError> {
        let mut next = self.values.clone();
        next.remove(key);
        self.replace(next)
    }

    fn clear(&mut self) -> Result<(), storage::StorageError> {
        self.replace(BTreeMap::new())
    }

    fn entries(&self) -> Result<Vec<(String, Value)>, storage::StorageError> {
        Ok(self
            .values
            .iter()
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect())
    }
}

/// Shared Rustls-only client. Commands use its async methods; implementations
/// of legacy synchronous helper traits are retained for non-runtime callers.
#[derive(Clone)]
pub struct HttpAdapter {
    client: reqwest::Client,
    blocking: reqwest::blocking::Client,
}

impl HttpAdapter {
    pub fn new() -> Result<Self, String> {
        let client = reqwest::Client::builder()
            .use_rustls_tls()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(15))
            .user_agent("strategy-board/0.1")
            .build()
            .map_err(|error| error.to_string())?;
        let blocking = reqwest::blocking::Client::builder()
            .use_rustls_tls()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(15))
            .user_agent("strategy-board/0.1")
            .build()
            .map_err(|error| error.to_string())?;
        Ok(Self { client, blocking })
    }

    pub async fn get(
        &self,
        url: &str,
        headers: &[(String, String)],
    ) -> Result<NetResponse, String> {
        let mut request = self.client.get(url);
        for (name, value) in headers {
            request = request.header(name, value);
        }
        let response = request.send().await.map_err(|error| error.to_string())?;
        NetResponse::from_async(response).await
    }

    pub async fn post_json(&self, url: &str, value: &Value) -> Result<NetResponse, String> {
        let response = self
            .client
            .post(url)
            .json(value)
            .send()
            .await
            .map_err(|error| error.to_string())?;
        NetResponse::from_async(response).await
    }

    fn blocking_get(&self, url: &str, headers: &[(String, String)]) -> Result<NetResponse, String> {
        let mut request = self.blocking.get(url);
        for (name, value) in headers {
            request = request.header(name, value);
        }
        NetResponse::from_blocking(request.send().map_err(|error| error.to_string())?)
    }
}

#[derive(Clone, Debug)]
pub struct NetResponse {
    pub status: u16,
    pub status_text: String,
    pub body: String,
}

impl NetResponse {
    async fn from_async(response: reqwest::Response) -> Result<Self, String> {
        let status = response.status();
        let body = response.text().await.map_err(|error| error.to_string())?;
        Ok(Self {
            status: status.as_u16(),
            status_text: status.canonical_reason().unwrap_or_default().to_owned(),
            body,
        })
    }
    fn from_blocking(response: reqwest::blocking::Response) -> Result<Self, String> {
        let status = response.status();
        let body = response.text().map_err(|error| error.to_string())?;
        Ok(Self {
            status: status.as_u16(),
            status_text: status.canonical_reason().unwrap_or_default().to_owned(),
            body,
        })
    }
    pub fn json<T: serde::de::DeserializeOwned>(&self) -> Result<T, String> {
        serde_json::from_str(&self.body).map_err(|error| error.to_string())
    }
    pub fn require_success(&self, service: &str) -> Result<(), String> {
        if (200..300).contains(&self.status) {
            Ok(())
        } else {
            Err(format!(
                "{service} API error: {} {}",
                self.status, self.status_text
            ))
        }
    }
}

impl tba::HttpClient for HttpAdapter {
    fn execute(&self, request: tba::HttpRequest) -> Result<tba::HttpResponse, String> {
        let response = self.blocking_get(&request.url, &request.headers)?;
        Ok(tba::HttpResponse {
            status: response.status,
            status_text: response.status_text,
            body: response.body,
        })
    }
}

impl statbotics::HttpClient for HttpAdapter {
    fn execute(
        &self,
        request: statbotics::HttpRequest,
    ) -> Result<statbotics::HttpResponse, String> {
        let response = self.blocking_get(&request.url, &[])?;
        Ok(statbotics::HttpResponse {
            status: response.status,
            status_text: response.status_text,
            body: response.body,
        })
    }
}

/// Firestore REST client. It is opt-in: public share commands explain the
/// missing deployment configuration instead of silently storing shared data
/// only on the current device.
#[derive(Clone)]
pub struct FirestoreAdapter {
    http: HttpAdapter,
    project_id: Option<String>,
    api_key: Option<String>,
}

impl FirestoreAdapter {
    pub fn from_env(http: HttpAdapter) -> Self {
        Self {
            http,
            project_id: std::env::var("FIREBASE_PROJECT_ID")
                .ok()
                .filter(|value| !value.is_empty())
                .or_else(|| option_env!("FIREBASE_PROJECT_ID").map(str::to_owned))
                .or_else(|| Some("strategyboard-app".into())),
            api_key: std::env::var("FIREBASE_API_KEY")
                .ok()
                .filter(|value| !value.is_empty())
                .or_else(|| option_env!("FIREBASE_API_KEY").map(str::to_owned))
                .or_else(|| {
                    std::env::var("VITE_FIREBASE_API_KEY")
                        .ok()
                        .filter(|value| !value.is_empty())
                })
                .or_else(|| option_env!("VITE_FIREBASE_API_KEY").map(str::to_owned)),
        }
    }
    fn base_url(&self) -> Result<String, String> {
        let project = self.project_id.as_deref().ok_or_else(|| {
            "Firestore sharing is not configured (FIREBASE_PROJECT_ID is missing)".to_owned()
        })?;
        self.api_key.as_deref().ok_or_else(|| {
            "Firestore sharing is not configured (FIREBASE_API_KEY is missing)".to_owned()
        })?;
        Ok(format!(
            "https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents"
        ))
    }
    fn collection_url(&self) -> Result<String, String> {
        Ok(format!(
            "{}/matches?key={}",
            self.base_url()?,
            self.api_key.as_deref().expect("checked by base_url")
        ))
    }
    fn document_url(&self, code: &str) -> Result<String, String> {
        Ok(format!(
            "{}/matches/{code}?key={}",
            self.base_url()?,
            self.api_key.as_deref().expect("checked by base_url")
        ))
    }
    fn document(record: &cloud::SharedMatchRecord) -> Value {
        json!({"fields": {
            "data": {"stringValue": record.data},
            "createdAt": {"integerValue": record.created_at.to_string()},
            "expiresAt": {"integerValue": record.expires_at.to_string()},
            "version": {"integerValue": record.version.to_string()}
        }})
    }
    pub async fn set_match(
        &self,
        code: &str,
        record: cloud::SharedMatchRecord,
    ) -> Result<(), String> {
        let url = format!("{}&documentId={code}", self.collection_url()?);
        let response = self.http.post_json(&url, &Self::document(&record)).await?;
        if (200..300).contains(&response.status) {
            return Ok(());
        }
        if matches!(response.status, 403 | 409) {
            return Err("permission-denied".to_owned());
        }
        Err(format!(
            "Firestore API error: {} {}",
            response.status, response.status_text
        ))
    }
    pub async fn get_match(&self, code: &str) -> Result<Option<cloud::SharedMatchRecord>, String> {
        let response = self.http.get(&self.document_url(code)?, &[]).await?;
        if response.status == StatusCode::NOT_FOUND.as_u16() {
            return Ok(None);
        }
        response.require_success("Firestore")?;
        parse_firestore_record(&response.body).map(Some)
    }
}

fn parse_firestore_record(body: &str) -> Result<cloud::SharedMatchRecord, String> {
    let document: Value = serde_json::from_str(body).map_err(|error| error.to_string())?;
    let fields = document
        .get("fields")
        .and_then(Value::as_object)
        .ok_or_else(|| "Firestore document has no fields".to_owned())?;
    let string = |key: &str| {
        fields
            .get(key)
            .and_then(|v| v.get("stringValue"))
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| format!("Firestore field {key} is missing"))
    };
    let integer = |key: &str| {
        fields
            .get(key)
            .and_then(|v| v.get("integerValue"))
            .and_then(Value::as_str)
            .ok_or_else(|| format!("Firestore field {key} is missing"))
            .and_then(|value| value.parse::<u64>().map_err(|error| error.to_string()))
    };
    Ok(cloud::SharedMatchRecord {
        data: string("data")?,
        created_at: integer("createdAt")?,
        expires_at: integer("expiresAt")?,
        version: integer("version")? as u8,
    })
}

/// The synchronous trait bridge is for non-Tauri callers. Async Tauri commands
/// use the methods above so they never block the application runtime.
impl cloud::CloudStore for FirestoreAdapter {
    fn set_match(&mut self, code: &str, record: cloud::SharedMatchRecord) -> Result<(), String> {
        let url = format!("{}&documentId={code}", self.collection_url()?);
        let response = self
            .http
            .blocking
            .post(&url)
            .json(&Self::document(&record))
            .send()
            .map_err(|error| error.to_string())?;
        let response = NetResponse::from_blocking(response)?;
        if (200..300).contains(&response.status) {
            Ok(())
        } else if matches!(response.status, 403 | 409) {
            Err("permission-denied".into())
        } else {
            Err(format!(
                "Firestore API error: {} {}",
                response.status, response.status_text
            ))
        }
    }
    fn get_match(&self, code: &str) -> Result<Option<cloud::SharedMatchRecord>, String> {
        let response = self
            .http
            .blocking
            .get(self.document_url(code)?)
            .send()
            .map_err(|error| error.to_string())?;
        let response = NetResponse::from_blocking(response)?;
        if response.status == 404 {
            Ok(None)
        } else {
            response.require_success("Firestore")?;
            parse_firestore_record(&response.body).map(Some)
        }
    }
}

#[derive(Clone)]
pub struct GithubAdapter {
    http: HttpAdapter,
    raw_base: String,
}

impl GithubAdapter {
    pub fn new(http: HttpAdapter) -> Self {
        Self {
            http,
            raw_base: "https://raw.githubusercontent.com/pranavgundu/Strategy-Board/main/public"
                .into(),
        }
    }
    pub async fn teams(&self) -> Result<String, String> {
        self.http
            .get(&format!("{}/contributors.txt", self.raw_base), &[])
            .await?
            .body_or_error("GitHub")
    }
    pub async fn contributors(&self) -> Result<Vec<contributors::GithubContributor>, String> {
        let response = self.http.get(contributors::CONTRIBUTORS_URL, &[]).await?;
        response.require_success("GitHub")?;
        response.json()
    }
    pub async fn user(&self, login: &str) -> Result<contributors::GithubUser, String> {
        let response = self
            .http
            .get(
                &contributors::ContributorsService::user_request_url(login),
                &[],
            )
            .await?;
        response.require_success("GitHub")?;
        response.json()
    }
}

impl NetResponse {
    fn body_or_error(self, service: &str) -> Result<String, String> {
        self.require_success(service)?;
        Ok(self.body)
    }
}

impl contributors::ContributorsSource for GithubAdapter {
    fn contributors_text(&self) -> Result<String, String> {
        self.http
            .blocking_get(&format!("{}/contributors.txt", self.raw_base), &[])?
            .body_or_error("GitHub")
    }
    fn contributors(&self) -> Result<Vec<contributors::GithubContributor>, String> {
        let response = self
            .http
            .blocking_get(contributors::CONTRIBUTORS_URL, &[])?;
        response.require_success("GitHub")?;
        response.json()
    }
    fn user(&self, login: &str) -> Result<contributors::GithubUser, String> {
        let response = self.http.blocking_get(
            &contributors::ContributorsService::user_request_url(login),
            &[],
        )?;
        response.require_success("GitHub")?;
        response.json()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::helpers::storage::KeyValueStore;

    #[test]
    fn json_store_round_trips_and_keeps_valid_json_after_each_write() {
        let path =
            std::env::temp_dir().join(format!("strategy-board-store-{}.json", std::process::id()));
        let _ = fs::remove_file(&path);
        let mut store = JsonFileStore::open(path.clone()).unwrap();
        store.set("appData", json!({"matches": []})).unwrap();
        assert!(serde_json::from_str::<Value>(&fs::read_to_string(&path).unwrap()).is_ok());
        assert_eq!(
            JsonFileStore::open(path.clone())
                .unwrap()
                .get("appData")
                .unwrap(),
            Some(json!({"matches": []}))
        );
        let _ = fs::remove_file(path);
    }

    #[test]
    fn json_store_overwrites_existing_file_without_losing_other_values() {
        let path = std::env::temp_dir().join(format!(
            "strategy-board-overwrite-{}.json",
            std::process::id()
        ));
        let _ = fs::remove_file(&path);
        let mut store = JsonFileStore::open(path.clone()).unwrap();
        store.set("a", json!(1)).unwrap();
        store.set("a", json!(2)).unwrap();
        store.set("b", json!(3)).unwrap();
        assert_eq!(
            JsonFileStore::open(path.clone())
                .unwrap()
                .entries()
                .unwrap(),
            vec![("a".into(), json!(2)), ("b".into(), json!(3))]
        );
        let _ = fs::remove_file(path);
    }

    #[test]
    fn firestore_document_parser_preserves_wire_types() {
        let value = json!({"fields": {"data":{"stringValue":"[]"},"createdAt":{"integerValue":"1"},"expiresAt":{"integerValue":"2"},"version":{"integerValue":"1"}}});
        assert_eq!(
            parse_firestore_record(&value.to_string()).unwrap(),
            cloud::SharedMatchRecord {
                data: "[]".into(),
                created_at: 1,
                expires_at: 2,
                version: 1
            }
        );
    }

    #[test]
    fn firestore_urls_match_the_legacy_matches_collection() {
        let adapter = FirestoreAdapter {
            http: HttpAdapter::new().unwrap(),
            project_id: Some("strategyboard-app".into()),
            api_key: Some("abc".into()),
        };
        assert!(adapter
            .collection_url()
            .unwrap()
            .ends_with("/documents/matches?key=abc"));
        assert!(adapter
            .document_url("ABC123")
            .unwrap()
            .ends_with("/documents/matches/ABC123?key=abc"));
    }
}
