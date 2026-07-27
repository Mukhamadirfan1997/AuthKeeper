use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub id: i32,
    pub pin_hash: String,
    pub theme: String,
    pub auto_lock: i32,
    pub language: String,
    pub backup_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsDTO {
    pub theme: Option<String>,
    pub auto_lock: Option<i32>,
    pub language: Option<String>,
    pub backup_path: Option<String>,
}

#[tauri::command]
pub fn get_settings(db: State<Mutex<Database>>) -> Result<Settings, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    database
        .conn()
        .query_row(
            "SELECT id, pin_hash, theme, auto_lock, language, backup_path FROM settings WHERE id = 1",
            [],
            |row| {
                Ok(Settings {
                    id: row.get(0)?,
                    pin_hash: row.get(1)?,
                    theme: row.get(2)?,
                    auto_lock: row.get(3)?,
                    language: row.get(4)?,
                    backup_path: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(
    db: State<Mutex<Database>>,
    data: UpdateSettingsDTO,
) -> Result<Settings, String> {
    let database = db.lock().map_err(|e| e.to_string())?;

    if let Some(theme) = &data.theme {
        database
            .conn()
            .execute(
                "UPDATE settings SET theme = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
                [theme],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(auto_lock) = data.auto_lock {
        database
            .conn()
            .execute(
                "UPDATE settings SET auto_lock = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
                [auto_lock],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(language) = &data.language {
        database
            .conn()
            .execute(
                "UPDATE settings SET language = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
                [language],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.backup_path.is_some() {
        database
            .conn()
            .execute(
                "UPDATE settings SET backup_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
                [&data.backup_path],
            )
            .map_err(|e| e.to_string())?;
    }

    let settings = database
        .conn()
        .query_row(
            "SELECT id, pin_hash, theme, auto_lock, language, backup_path FROM settings WHERE id = 1",
            [],
            |row| {
                Ok(Settings {
                    id: row.get(0)?,
                    pin_hash: row.get(1)?,
                    theme: row.get(2)?,
                    auto_lock: row.get(3)?,
                    language: row.get(4)?,
                    backup_path: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;
    Ok(settings)
}
