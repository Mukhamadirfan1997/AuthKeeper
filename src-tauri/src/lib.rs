mod commands;
mod crypto;
mod db;

use commands::auth::AuthState;
use db::Database;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AuthState::new())
        .setup(|app| {
            let db_path = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&db_path).expect("failed to create app data dir");
            let db_file = db_path.join("authkeeper.db");
            let db = Database::new(db_file.to_str().unwrap()).expect("failed to init database");
            db.initialize().expect("failed to run migrations");
            app.manage(Mutex::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::check_pin_setup,
            commands::auth::setup_pin,
            commands::auth::verify_pin,
            commands::auth::change_pin,
            commands::auth::generate_recovery_key,
            commands::auth::verify_recovery_key,
            commands::auth::has_recovery_key,
            commands::account::get_accounts,
            commands::account::get_account,
            commands::account::create_account,
            commands::account::update_account,
            commands::account::delete_account,
            commands::account::toggle_favorite,
            commands::account::search_accounts,
            commands::otp::generate_otp,
            commands::otp::generate_otp_all,
            commands::backup::export_backup,
            commands::backup::import_backup,
            commands::migration::parse_migration_qr,
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
