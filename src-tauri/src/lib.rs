use tauri::Manager;

pub mod adapters;
pub mod commands;
pub mod helpers;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            app.manage(commands::RuntimeState::new(app.handle())?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::storage_get,
            commands::storage_get_many,
            commands::storage_set,
            commands::storage_delete,
            commands::storage_clear,
            commands::storage_entries,
            commands::statbotics_cached,
            commands::statbotics_cache_timestamp,
            commands::statbotics_clear_cache,
            commands::statbotics_fetch,
            commands::statbotics_match_key,
            commands::statbotics_match,
            commands::statbotics_year,
            commands::statbotics_team_year,
            commands::tba_set_api_key,
            commands::tba_has_api_key,
            commands::tba_events,
            commands::tba_matches_at_event,
            commands::tba_team_matches,
            commands::tba_team_events,
            commands::tba_teams_at_event,
            commands::tba_simple_events,
            commands::tba_simple_matches,
            commands::github_teams,
            commands::github_contributors,
            commands::cloud_upload,
            commands::cloud_download,
            commands::cloud_share_exists,
            commands::qr_encode,
            commands::qr_reset,
            commands::qr_receive,
            commands::qr_restore_packet,
            commands::board_state,
            commands::board_set_mode,
            commands::board_set_tool,
            commands::board_set_color,
            commands::board_record_action,
            commands::board_undo,
            commands::board_redo,
            commands::match_create_packet,
            commands::match_normalize_packet,
            commands::model_load_packets,
            commands::model_add_packet,
            commands::model_add_packets,
            commands::model_replace_packet,
            commands::model_delete_match,
            commands::model_clear_matches,
            commands::fuzzy_match,
            commands::fuzzy_search_batch,
            commands::pdf_standard_plan,
            commands::pdf_large_plan,
            commands::field_years,
            commands::field_image,
            commands::field_robot_positions,
            commands::platform_validate_url,
            commands::platform_open_url,
            commands::config_current
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
