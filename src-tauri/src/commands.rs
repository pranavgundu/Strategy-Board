//! Tauri command surface for the native helper layer.

use std::{
    collections::HashSet,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use serde_json::{json, Value};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;

use crate::helpers::storage::KeyValueStore;
use crate::{
    adapters::{FirestoreAdapter, GithubAdapter, HttpAdapter, JsonFileStore},
    helpers::{
        board, cloud, config, contributors, manager, match_model, pdf, platform, qr, search,
        statbotics, storage, tba,
    },
};

pub type CommandResult<T> = Result<T, String>;

pub struct RuntimeState {
    pub storage: Mutex<JsonFileStore>,
    pub board: Mutex<board::Board>,
    pub qr_import: Mutex<qr::QrImportState>,
    pub tba_key: Mutex<Option<String>>,
    pub http: HttpAdapter,
    pub firestore: FirestoreAdapter,
    pub github: GithubAdapter,
    pub teams: Mutex<Option<Vec<String>>>,
    pub contributors: Mutex<Option<Vec<contributors::Contributor>>>,
}

impl RuntimeState {
    pub fn new(app: &AppHandle) -> CommandResult<Self> {
        let directory = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        let storage = JsonFileStore::open(directory.join("strategy-board.json"))
            .map_err(|error| error.to_string())?;
        let tba_key = storage
            .get("tbaApiKey")
            .map_err(|error| error.to_string())?
            .and_then(|value| value.as_str().map(str::to_owned))
            .filter(|value| !value.is_empty());
        let http = HttpAdapter::new()?;
        Ok(Self {
            storage: Mutex::new(storage),
            board: Mutex::new(board::Board::default()),
            qr_import: Mutex::new(qr::QrImportState::default()),
            tba_key: Mutex::new(tba_key),
            firestore: FirestoreAdapter::from_env(http.clone()),
            github: GithubAdapter::new(http.clone()),
            http,
            teams: Mutex::new(None),
            contributors: Mutex::new(None),
        })
    }
}

fn lock<T>(mutex: &Mutex<T>) -> CommandResult<std::sync::MutexGuard<'_, T>> {
    mutex
        .lock()
        .map_err(|_| "application state lock was poisoned".into())
}
fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[tauri::command]
pub fn storage_get(state: State<'_, RuntimeState>, key: String) -> CommandResult<Option<Value>> {
    lock(&state.storage)?
        .get(&key)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn storage_get_many(
    state: State<'_, RuntimeState>,
    keys: Vec<String>,
) -> CommandResult<Vec<Option<Value>>> {
    lock(&state.storage)?
        .get_many(&keys)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn storage_set(state: State<'_, RuntimeState>, key: String, value: Value) -> CommandResult<()> {
    lock(&state.storage)?
        .set(&key, value)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn storage_delete(state: State<'_, RuntimeState>, key: String) -> CommandResult<()> {
    lock(&state.storage)?
        .delete(&key)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn storage_clear(state: State<'_, RuntimeState>) -> CommandResult<()> {
    lock(&state.storage)?
        .clear()
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn storage_entries(state: State<'_, RuntimeState>) -> CommandResult<Vec<(String, Value)>> {
    lock(&state.storage)?
        .entries()
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn statbotics_cached(
    state: State<'_, RuntimeState>,
    match_key: String,
) -> CommandResult<Option<Value>> {
    storage::get_cached_statbotics(
        &mut *lock(&state.storage)?,
        &match_key,
        now_ms(),
        storage::DEFAULT_STATBOTICS_TTL_MS,
    )
    .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn statbotics_cache_timestamp(
    state: State<'_, RuntimeState>,
    match_key: String,
) -> CommandResult<Option<u64>> {
    storage::get_statbotics_timestamp(&*lock(&state.storage)?, &match_key)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn statbotics_clear_cache(state: State<'_, RuntimeState>) -> CommandResult<usize> {
    storage::clear_statbotics_cache(&mut *lock(&state.storage)?).map_err(|error| error.to_string())
}

fn tba_service(state: &RuntimeState) -> CommandResult<tba::TbaService> {
    let mut service = tba::TbaService::new(Some(config::Config::current().shared_tba_api_key));
    let saved = lock(&state.storage)?
        .get("tbaApiKey")
        .map_err(|error| error.to_string())?
        .and_then(|value| value.as_str().map(str::to_owned));
    if let Some(key) = lock(&state.tba_key)?.clone().or(saved) {
        service.set_api_key(key);
    }
    Ok(service)
}
async fn tba_json<T: serde::de::DeserializeOwned>(
    state: &RuntimeState,
    endpoint: String,
) -> CommandResult<T> {
    let request = tba_service(state)?
        .build_request(&endpoint)
        .map_err(|error| error.to_string())?;
    let response = state.http.get(&request.url, &request.headers).await?;
    if !(200..300).contains(&response.status) {
        return Err(format!(
            "TBA API error: {} {}",
            response.status, response.status_text
        ));
    }
    response
        .json()
        .map_err(|error| format!("TBA API JSON error: {error}"))
}
#[tauri::command]
pub fn tba_set_api_key(state: State<'_, RuntimeState>, api_key: String) -> CommandResult<()> {
    *lock(&state.tba_key)? = Some(api_key.clone());
    lock(&state.storage)?
        .set("tbaApiKey", Value::String(api_key))
        .map_err(|error| error.to_string())?;
    Ok(())
}
#[tauri::command]
pub fn tba_has_api_key(state: State<'_, RuntimeState>) -> CommandResult<bool> {
    Ok(tba_service(&state)?.has_api_key())
}
#[tauri::command]
pub async fn tba_events(
    state: State<'_, RuntimeState>,
    year: i32,
) -> CommandResult<Vec<tba::TbaEvent>> {
    tba_json(&state, format!("/events/{year}")).await
}
#[tauri::command]
pub async fn tba_matches_at_event(
    state: State<'_, RuntimeState>,
    event_key: String,
) -> CommandResult<Vec<tba::TbaMatch>> {
    tba_json(&state, format!("/event/{event_key}/matches")).await
}
#[tauri::command]
pub async fn tba_team_matches(
    state: State<'_, RuntimeState>,
    team_key: String,
    event_key: String,
) -> CommandResult<Vec<tba::TbaMatch>> {
    tba_json(
        &state,
        format!(
            "/team/{}/event/{event_key}/matches",
            tba::normalize_team_key(&team_key)
        ),
    )
    .await
}
#[tauri::command]
pub async fn tba_team_events(
    state: State<'_, RuntimeState>,
    team_key: String,
    year: i32,
) -> CommandResult<Vec<tba::TbaEvent>> {
    tba_json(
        &state,
        format!("/team/{}/events/{year}", tba::normalize_team_key(&team_key)),
    )
    .await
}
#[tauri::command]
pub async fn tba_teams_at_event(
    state: State<'_, RuntimeState>,
    event_key: String,
) -> CommandResult<Vec<String>> {
    match tba_json(&state, format!("/event/{event_key}/teams/keys")).await {
        Ok(teams) => Ok(teams),
        Err(_) => Ok(tba::teams_from_matches(
            &tba_json::<Vec<tba::TbaMatch>>(&state, format!("/event/{event_key}/matches")).await?,
        )),
    }
}
#[tauri::command]
pub fn tba_simple_events(events: Vec<tba::TbaEvent>) -> Vec<tba::TbaSimpleEvent> {
    tba::filter_and_sort_events(&tba::parse_events_to_simple(&events))
}
#[tauri::command]
pub fn tba_simple_matches(matches: Vec<tba::TbaMatch>) -> Vec<tba::TbaSimpleMatch> {
    tba::parse_matches_to_simple(&matches)
}

fn valid_endpoint(endpoint: &str) -> bool {
    endpoint.starts_with('/')
        && !endpoint.contains("..")
        && !endpoint.contains('?')
        && !endpoint.contains('#')
}
#[tauri::command]
pub async fn statbotics_fetch(
    state: State<'_, RuntimeState>,
    endpoint: String,
) -> CommandResult<Value> {
    if !valid_endpoint(&endpoint) {
        return Err("invalid Statbotics endpoint".into());
    }
    let cache_key = endpoint.strip_prefix("/match/").unwrap_or(&endpoint);
    if let Some(data) = storage::get_cached_statbotics(
        &mut *lock(&state.storage)?,
        cache_key,
        now_ms(),
        storage::DEFAULT_STATBOTICS_TTL_MS,
    )
    .map_err(|error| error.to_string())?
    {
        return Ok(data);
    }
    let response = state
        .http
        .get(
            &format!("{}{}", statbotics::STATBOTICS_API_BASE, endpoint),
            &[],
        )
        .await?;
    if response.status == 404 {
        return Err("Statbotics API error: 404 - Data not found".into());
    }
    if !(200..300).contains(&response.status) {
        return Err(format!(
            "Statbotics API error: {} - {}",
            response.status, response.status_text
        ));
    }
    let data: Value = response
        .json()
        .map_err(|error| format!("Statbotics API JSON error: {error}"))?;
    storage::cache_statbotics(
        &mut *lock(&state.storage)?,
        cache_key,
        data.clone(),
        now_ms(),
    )
    .map_err(|error| error.to_string())?;
    Ok(data)
}
#[tauri::command]
pub fn statbotics_match_key(event_key: String, match_name: String) -> String {
    statbotics::construct_match_key(&event_key, &match_name)
}
#[tauri::command]
pub async fn statbotics_match(
    state: State<'_, RuntimeState>,
    match_key: String,
) -> CommandResult<statbotics::StatboticsMatch> {
    serde_json::from_value(statbotics_fetch(state, format!("/match/{match_key}")).await?)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub async fn statbotics_year(
    state: State<'_, RuntimeState>,
    year: i32,
) -> CommandResult<statbotics::StatboticsYear> {
    serde_json::from_value(statbotics_fetch(state, format!("/year/{year}")).await?)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub async fn statbotics_team_year(
    state: State<'_, RuntimeState>,
    team: i32,
    year: i32,
) -> CommandResult<statbotics::StatboticsTeamYear> {
    serde_json::from_value(statbotics_fetch(state, format!("/team_year/{team}/{year}")).await?)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn github_teams(state: State<'_, RuntimeState>) -> CommandResult<Vec<String>> {
    if let Some(value) = lock(&state.teams)?.clone() {
        return Ok(value);
    }
    let teams = contributors::parse_teams(&state.github.teams().await?);
    *lock(&state.teams)? = Some(teams.clone());
    Ok(teams)
}
#[tauri::command]
pub async fn github_contributors(
    state: State<'_, RuntimeState>,
    count: Option<usize>,
) -> CommandResult<Vec<contributors::Contributor>> {
    let cached = { lock(&state.contributors)?.clone() };
    let values = if let Some(value) = cached {
        value
    } else {
        // The contributors endpoint already contains everything needed by the UI.
        // Avoid one additional GitHub request per contributor: it is substantially
        // faster and is far less likely to exhaust the unauthenticated rate limit.
        let enriched = state
            .github
            .contributors()
            .await?
            .into_iter()
            .filter(|contributor| !contributors::is_dependabot(&contributor.login))
            .map(|contributor| contributors::Contributor {
                login: contributor.login,
                avatar_url: contributor.avatar_url,
                html_url: contributor.html_url,
                contributions: contributor.contributions,
                name: None,
                bio: None,
            })
            .collect::<Vec<_>>();
        *lock(&state.contributors)? = Some(enriched.clone());
        enriched
    };
    Ok(values
        .into_iter()
        .take(count.unwrap_or(usize::MAX))
        .collect())
}

fn next_share_code() -> CommandResult<String> {
    let mut random = [0_u8; cloud::SHARE_CODE_LENGTH];
    getrandom::fill(&mut random)
        .map_err(|error| format!("secure random share-code generation failed: {error}"))?;
    Ok(cloud::generate_share_code(
        random.into_iter().map(usize::from),
    ))
}
#[tauri::command]
pub async fn cloud_upload(
    state: State<'_, RuntimeState>,
    packet: Vec<Value>,
) -> CommandResult<String> {
    let record = cloud::create_share_record(&packet, now_ms())?;
    let mut last_error = String::new();
    for _ in 0..cloud::MAX_UPLOAD_ATTEMPTS {
        let code = next_share_code()?;
        match state.firestore.set_match(&code, record.clone()).await {
            Ok(()) => return Ok(code),
            Err(error) if error == "permission-denied" => last_error = error,
            Err(error) => return Err(error),
        }
    }
    Err(format!(
        "Failed to allocate a unique share code after {} attempts: {last_error}",
        cloud::MAX_UPLOAD_ATTEMPTS
    ))
}
#[tauri::command]
pub async fn cloud_download(
    state: State<'_, RuntimeState>,
    share_code: String,
) -> CommandResult<Option<Vec<Value>>> {
    let code = cloud::normalize_share_code(&share_code)?;
    let Some(record) = state.firestore.get_match(&code).await? else {
        return Ok(None);
    };
    if now_ms() > record.expires_at {
        return Err("This share code has expired".into());
    }
    serde_json::from_str(&record.data)
        .map(Some)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub async fn cloud_share_exists(
    state: State<'_, RuntimeState>,
    share_code: String,
) -> CommandResult<bool> {
    let Ok(code) = cloud::normalize_share_code(&share_code) else {
        return Ok(false);
    };
    Ok(state.firestore.get_match(&code).await?.is_some())
}

#[tauri::command]
pub fn qr_encode(payload: String) -> CommandResult<Vec<String>> {
    qr::encode_frames(&payload).map_err(|error| error.to_string())
}
#[tauri::command]
pub fn qr_reset(state: State<'_, RuntimeState>) -> CommandResult<()> {
    lock(&state.qr_import)?.reset();
    Ok(())
}
#[tauri::command]
pub fn qr_receive(state: State<'_, RuntimeState>, frame: String) -> CommandResult<Value> {
    match lock(&state.qr_import)?
        .receive(&frame)
        .map_err(|error| error.to_string())?
    {
        qr::ScanProgress::Receiving {
            received,
            total,
            duplicate,
        } => Ok(
            json!({"status":"receiving", "received":received, "total":total, "duplicate":duplicate}),
        ),
        qr::ScanProgress::Complete(payload) => Ok(json!({"status":"complete", "payload":payload})),
    }
}
#[tauri::command]
pub fn qr_restore_packet(payload: String) -> CommandResult<Vec<Value>> {
    qr::restore_match_packet_json(&payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn board_state(state: State<'_, RuntimeState>) -> CommandResult<board::BoardState> {
    Ok(lock(&state.board)?.state())
}
#[tauri::command]
pub fn board_set_mode(
    state: State<'_, RuntimeState>,
    mode: board::BoardMode,
) -> CommandResult<board::BoardState> {
    let mut board = lock(&state.board)?;
    board.set_mode(mode);
    Ok(board.state())
}
#[tauri::command]
pub fn board_set_tool(
    state: State<'_, RuntimeState>,
    tool: board::BoardTool,
) -> CommandResult<board::BoardState> {
    let mut board = lock(&state.board)?;
    board.set_tool(tool);
    Ok(board.state())
}
#[tauri::command]
pub fn board_set_color(
    state: State<'_, RuntimeState>,
    color: i16,
) -> CommandResult<board::BoardState> {
    let mut board = lock(&state.board)?;
    board.set_color(color);
    Ok(board.state())
}
#[tauri::command]
pub fn board_record_action(
    state: State<'_, RuntimeState>,
    action: String,
) -> CommandResult<board::BoardState> {
    let mut board = lock(&state.board)?;
    board.record_action(action);
    Ok(board.state())
}
#[tauri::command]
pub fn board_undo(state: State<'_, RuntimeState>) -> CommandResult<Option<String>> {
    Ok(lock(&state.board)?.undo())
}
#[tauri::command]
pub fn board_redo(state: State<'_, RuntimeState>) -> CommandResult<Option<String>> {
    Ok(lock(&state.board)?.redo())
}

#[tauri::command]
pub fn match_create_packet(
    match_name: String,
    red_teams: Vec<String>,
    blue_teams: Vec<String>,
    tba_event_key: Option<String>,
    tba_match_key: Option<String>,
    tba_year: Option<f64>,
) -> CommandResult<Value> {
    if red_teams.len() != 3 || blue_teams.len() != 3 {
        return Err("a match requires exactly three red and three blue teams".into());
    }
    Ok(match_model::Match::new(
        match_name,
        red_teams[0].clone(),
        red_teams[1].clone(),
        red_teams[2].clone(),
        blue_teams[0].clone(),
        blue_teams[1].clone(),
        blue_teams[2].clone(),
        None,
        None,
        tba_event_key,
        tba_match_key,
        tba_year,
    )
    .get_as_packet())
}
#[tauri::command]
pub fn match_normalize_packet(packet: Value) -> CommandResult<Value> {
    match_model::Match::from_packet(&packet)
        .map(|value| value.get_as_packet())
        .map_err(|error| error.to_string())
}

fn loaded_packets(store: &JsonFileStore) -> CommandResult<Vec<Value>> {
    let packets = store
        .get("appData")
        .map_err(|error| error.to_string())?
        .or_else(|| {
            store.get("matchIds").ok().flatten().and_then(|ids| {
                ids.as_array().map(|ids| {
                    ids.iter()
                        .filter_map(Value::as_str)
                        .filter_map(|id| store.get(id).ok().flatten())
                        .collect()
                })
            })
        })
        .unwrap_or(Value::Array(vec![]));
    Ok(packets
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|packet| {
            match_model::Match::from_packet(packet)
                .ok()
                .map(|match_| match_.get_as_packet())
        })
        .collect())
}
#[tauri::command]
pub fn model_load_packets(state: State<'_, RuntimeState>) -> CommandResult<Vec<Value>> {
    loaded_packets(&*lock(&state.storage)?)
}
#[tauri::command]
pub fn model_add_packet(state: State<'_, RuntimeState>, packet: Value) -> CommandResult<String> {
    model_add_packets(state, vec![packet]).map(|mut ids| ids.remove(0))
}

fn add_packets(store: &mut JsonFileStore, packets: Vec<Value>) -> CommandResult<Vec<String>> {
    let matches = packets
        .iter()
        .map(match_model::Match::from_packet)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    if matches.is_empty() {
        return Ok(Vec::new());
    }

    let mut stored = loaded_packets(store)?;
    let mut ids = stored
        .iter()
        .filter_map(|packet| packet.get(7).and_then(Value::as_str))
        .map(str::to_owned)
        .collect::<HashSet<_>>();
    for match_ in &matches {
        if !ids.insert(match_.id.clone()) {
            return Err(format!("a match with id {} already exists", match_.id));
        }
    }

    let added_ids = matches
        .iter()
        .map(|match_| match_.id.clone())
        .collect::<Vec<_>>();
    stored.extend(matches.into_iter().map(|match_| match_.get_as_packet()));
    store
        .set("appData", Value::Array(stored))
        .map_err(|error| error.to_string())?;
    Ok(added_ids)
}

/// Validates a whole import before one atomic persistence write. This avoids
/// rewriting the complete match collection once per TBA or QR-imported match.
#[tauri::command]
pub fn model_add_packets(
    state: State<'_, RuntimeState>,
    packets: Vec<Value>,
) -> CommandResult<Vec<String>> {
    let mut store = lock(&state.storage)?;
    add_packets(&mut store, packets)
}

fn replace_packet(store: &mut JsonFileStore, packet: Value) -> CommandResult<String> {
    let match_ = match_model::Match::from_packet(&packet).map_err(|error| error.to_string())?;
    let id = match_.id.clone();
    let mut packets = loaded_packets(store)?;
    let Some(index) = packets
        .iter()
        .position(|packet| packet.get(7).and_then(Value::as_str) == Some(id.as_str()))
    else {
        return Err(format!("match {id} does not exist"));
    };
    packets[index] = match_.get_as_packet();
    store
        .set("appData", Value::Array(packets))
        .map_err(|error| error.to_string())?;
    Ok(id)
}

/// Replaces one existing match in one validated, atomic store update.
#[tauri::command]
pub fn model_replace_packet(
    state: State<'_, RuntimeState>,
    packet: Value,
) -> CommandResult<String> {
    let mut store = lock(&state.storage)?;
    replace_packet(&mut store, packet)
}
#[tauri::command]
pub fn model_delete_match(state: State<'_, RuntimeState>, id: String) -> CommandResult<()> {
    let mut store = lock(&state.storage)?;
    let packets = loaded_packets(&store)?
        .into_iter()
        .filter(|packet| packet.get(7).and_then(Value::as_str) != Some(id.as_str()))
        .collect();
    store
        .set("appData", Value::Array(packets))
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn model_clear_matches(state: State<'_, RuntimeState>) -> CommandResult<()> {
    lock(&state.storage)?
        .set("appData", Value::Array(Vec::new()))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn fuzzy_match(
    search_term: String,
    target: String,
    original_target: Option<String>,
) -> Option<search::MatchResult> {
    search::fuzzy_match(&search_term, &target, original_target.as_deref())
}
#[tauri::command]
pub fn fuzzy_search_batch(
    items: Vec<search::BatchItem>,
    search_lower: String,
    min_score: Option<i32>,
) -> Vec<search::BatchMatch> {
    search::fuzzy_search_batch(&items, &search_lower, min_score.unwrap_or(0))
}

fn pdf_value(plan: pdf::PdfDocumentPlan) -> Value {
    json!({"widthMm": plan.width_mm, "heightMm": plan.height_mm, "pages": plan.pages.into_iter().map(|page| json!({"pageIndex":page.page_index,"texts":page.texts.into_iter().map(|text|json!({"value":text.value,"xMm":text.x_mm,"yMm":text.y_mm,"fontSizePt":text.font_size_pt,"bold":text.bold})).collect::<Vec<_>>(),"qrCodes":page.qr_codes.into_iter().map(|code|json!({"payload":code.payload,"ordinal":code.ordinal,"total":code.total,"xMm":code.x_mm,"yMm":code.y_mm,"sizeMm":code.size_mm,"label":code.label.map(|text|json!({"value":text.value,"xMm":text.x_mm,"yMm":text.y_mm,"fontSizePt":text.font_size_pt,"bold":text.bold}))})).collect::<Vec<_>>() })).collect::<Vec<_>>()})
}
#[tauri::command]
pub fn pdf_standard_plan(frames: Vec<String>, match_name: String) -> Value {
    pdf_value(pdf::PdfDocumentPlan::standard(&frames, &match_name))
}
#[tauri::command]
pub fn pdf_large_plan(frames: Vec<String>, match_name: String) -> Value {
    pdf_value(pdf::PdfDocumentPlan::large(&frames, &match_name))
}

#[tauri::command]
pub fn field_years() -> Vec<u32> {
    manager::available_field_years().to_vec()
}
#[tauri::command]
pub fn field_image(year: Option<f64>) -> String {
    manager::field_image_for_year(year).into()
}
#[tauri::command]
pub fn field_robot_positions(year: Option<f64>) -> Value {
    let p = manager::robot_positions_for_year(year);
    json!({"red":{"one":{"x":p.red.one.x,"y":p.red.one.y},"two":{"x":p.red.two.x,"y":p.red.two.y},"three":{"x":p.red.three.x,"y":p.red.three.y}},"blue":{"one":{"x":p.blue.one.x,"y":p.blue.one.y},"two":{"x":p.blue.two.x,"y":p.blue.two.y},"three":{"x":p.blue.three.x,"y":p.blue.three.y}}})
}
#[tauri::command]
pub fn platform_validate_url(url: String) -> CommandResult<String> {
    platform::validate_external_url(&url)
        .map(str::to_owned)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn platform_open_url(app: AppHandle, url: String) -> CommandResult<()> {
    let url = platform::validate_external_url(&url).map_err(|error| error.to_string())?;
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub fn config_current() -> Value {
    let config = config::Config::current();
    json!({"fieldPngPixelWidth":config.field_png_pixel_width,"fieldPngPixelHeight":config.field_png_pixel_height,"fieldRealWidthInches":config.field_real_width_inches,"fieldRealHeightInches":config.field_real_height_inches,"redOneStationX":config.red_one_station_x,"redOneStationY":config.red_one_station_y,"redTwoStationX":config.red_two_station_x,"redTwoStationY":config.red_two_station_y,"redThreeStationX":config.red_three_station_x,"redThreeStationY":config.red_three_station_y,"blueOneStationX":config.blue_one_station_x,"blueOneStationY":config.blue_one_station_y,"blueTwoStationX":config.blue_two_station_x,"blueTwoStationY":config.blue_two_station_y,"blueThreeStationX":config.blue_three_station_x,"blueThreeStationY":config.blue_three_station_y,"sharedTbaApiKey":config.shared_tba_api_key,"releaseAnnouncement":{"enabled":config.release_announcement.enabled,"id":config.release_announcement.id,"title":config.release_announcement.title,"message":config.release_announcement.message,"ctaLabel":config.release_announcement.cta_label,"ctaUrl":config.release_announcement.cta_url,"showOnce":config.release_announcement.show_once}})
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temporary_store(name: &str) -> JsonFileStore {
        JsonFileStore::open(std::env::temp_dir().join(format!(
            "strategy-board-command-{name}-{}.json",
            std::process::id()
        )))
        .unwrap()
    }

    #[test]
    fn generated_share_codes_fit_the_public_format() {
        let code = next_share_code().unwrap();
        assert_eq!(code.len(), cloud::SHARE_CODE_LENGTH);
        assert!(code.chars().all(|c| cloud::SHARE_CODE_ALPHABET.contains(c)));
    }
    #[test]
    fn packet_command_rejects_short_alliances() {
        assert!(match_create_packet("Q1".into(), vec![], vec![], None, None, None).is_err());
    }

    #[test]
    fn batch_add_validates_before_one_persisted_collection_update() {
        let mut store = temporary_store("batch-add");
        store.clear().unwrap();
        let first = match_create_packet(
            "Q1".into(),
            vec!["1".into(), "2".into(), "3".into()],
            vec!["4".into(), "5".into(), "6".into()],
            None,
            None,
            None,
        )
        .unwrap();
        let second = match_create_packet(
            "Q2".into(),
            vec!["7".into(), "8".into(), "9".into()],
            vec!["10".into(), "11".into(), "12".into()],
            None,
            None,
            None,
        )
        .unwrap();
        let ids = add_packets(&mut store, vec![first, second]).unwrap();
        assert_eq!(ids.len(), 2);
        assert_eq!(loaded_packets(&store).unwrap().len(), 2);
    }

    #[test]
    fn replace_requires_an_existing_id_and_preserves_collection_order() {
        let mut store = temporary_store("replace");
        store.clear().unwrap();
        let original = match_create_packet(
            "Q1".into(),
            vec!["1".into(), "2".into(), "3".into()],
            vec!["4".into(), "5".into(), "6".into()],
            None,
            None,
            None,
        )
        .unwrap();
        let id = add_packets(&mut store, vec![original.clone()])
            .unwrap()
            .remove(0);
        let mut edited = original;
        edited[0] = Value::String("Edited".into());
        assert_eq!(replace_packet(&mut store, edited).unwrap(), id);
        let loaded = loaded_packets(&store).unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0][0], "Edited");

        let unknown = match_create_packet(
            "Unknown".into(),
            vec!["1".into(), "2".into(), "3".into()],
            vec!["4".into(), "5".into(), "6".into()],
            None,
            None,
            None,
        )
        .unwrap();
        assert!(replace_packet(&mut store, unknown).is_err());
    }
}
