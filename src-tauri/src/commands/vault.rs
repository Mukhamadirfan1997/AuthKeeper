use crate::crypto;
use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultEntry {
    pub id: i64,
    pub name: String,
    pub username: Option<String>,
    pub password: String,
    pub url: Option<String>,
    pub icon: Option<String>,
    pub note: Option<String>,
    pub category_id: Option<i64>,
    pub favorite: bool,
    pub last_used_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVaultEntryDTO {
    pub name: String,
    pub username: Option<String>,
    pub password: String,
    pub url: Option<String>,
    pub icon: Option<String>,
    pub note: Option<String>,
    pub category_id: Option<i64>,
    pub favorite: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVaultEntryDTO {
    pub name: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub icon: Option<String>,
    pub note: Option<String>,
    pub category_id: Option<i64>,
    pub favorite: Option<bool>,
}

fn row_to_entry(row: &rusqlite::Row) -> rusqlite::Result<VaultEntry> {
    Ok(VaultEntry {
        id: row.get(0)?,
        name: row.get(1)?,
        username: row.get(2)?,
        password: row.get(3)?,
        url: row.get(4)?,
        icon: row.get(5)?,
        note: row.get(6)?,
        category_id: row.get(7)?,
        favorite: row.get::<_, i32>(8)? != 0,
        last_used_at: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

fn decrypt_entry(entry: &mut VaultEntry, db: &Database) {
    if let Ok(key) = db.get_encryption_key() {
        if let Ok(plain) = crypto::decrypt(&entry.password, &key) {
            entry.password = plain;
        }
    }
}

fn encrypt_field(value: &str, db: &Database) -> String {
    if let Ok(key) = db.get_encryption_key() {
        crypto::encrypt(value, &key).unwrap_or_else(|_| value.to_string())
    } else {
        value.to_string()
    }
}

#[tauri::command]
pub fn get_vault_entries(db: State<Mutex<Database>>) -> Result<Vec<VaultEntry>, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = database
        .conn()
        .prepare(
            "SELECT id, name, username, password, url, icon, note, category_id, favorite, last_used_at, created_at, updated_at
             FROM password_vault ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_entry)
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for row in rows {
        let mut entry = row.map_err(|e| e.to_string())?;
        decrypt_entry(&mut entry, &database);
        list.push(entry);
    }
    Ok(list)
}

#[tauri::command]
pub fn get_vault_entry(
    db: State<Mutex<Database>>,
    id: i64,
) -> Result<VaultEntry, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let mut entry = database
        .conn()
        .query_row(
            "SELECT id, name, username, password, url, icon, note, category_id, favorite, last_used_at, created_at, updated_at
             FROM password_vault WHERE id = ?1",
            [id],
            row_to_entry,
        )
        .map_err(|e| e.to_string())?;
    decrypt_entry(&mut entry, &database);

    database
        .conn()
        .execute(
            "UPDATE password_vault SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [id],
        )
        .ok();

    Ok(entry)
}

#[tauri::command]
pub fn create_vault_entry(
    db: State<Mutex<Database>>,
    data: CreateVaultEntryDTO,
) -> Result<VaultEntry, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let encrypted = encrypt_field(&data.password, &database);
    let favorite = data.favorite.unwrap_or(false) as i32;

    database
        .conn()
        .execute(
            "INSERT INTO password_vault (name, username, password, url, icon, note, category_id, favorite)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                data.name, data.username, encrypted, data.url, data.icon, data.note, data.category_id, favorite
            ],
        )
        .map_err(|e| e.to_string())?;
    let id = database.conn().last_insert_rowid();

    let mut entry = database
        .conn()
        .query_row(
            "SELECT id, name, username, password, url, icon, note, category_id, favorite, last_used_at, created_at, updated_at
             FROM password_vault WHERE id = ?1",
            [id],
            row_to_entry,
        )
        .map_err(|e| e.to_string())?;
    decrypt_entry(&mut entry, &database);
    Ok(entry)
}

#[tauri::command]
pub fn update_vault_entry(
    db: State<Mutex<Database>>,
    id: i64,
    data: UpdateVaultEntryDTO,
) -> Result<VaultEntry, String> {
    let database = db.lock().map_err(|e| e.to_string())?;

    if let Some(name) = &data.name {
        database
            .conn()
            .execute(
                "UPDATE password_vault SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![name, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.username.is_some() {
        database
            .conn()
            .execute(
                "UPDATE password_vault SET username = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.username, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(password) = &data.password {
        let encrypted = encrypt_field(password, &database);
        database
            .conn()
            .execute(
                "UPDATE password_vault SET password = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![encrypted, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.url.is_some() {
        database
            .conn()
            .execute(
                "UPDATE password_vault SET url = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.url, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.icon.is_some() {
        database
            .conn()
            .execute(
                "UPDATE password_vault SET icon = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.icon, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.note.is_some() {
        database
            .conn()
            .execute(
                "UPDATE password_vault SET note = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.note, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.category_id.is_some() {
        database
            .conn()
            .execute(
                "UPDATE password_vault SET category_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.category_id, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(fav) = data.favorite {
        database
            .conn()
            .execute(
                "UPDATE password_vault SET favorite = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![fav as i32, id],
            )
            .map_err(|e| e.to_string())?;
    }

    let mut entry = database
        .conn()
        .query_row(
            "SELECT id, name, username, password, url, icon, note, category_id, favorite, last_used_at, created_at, updated_at
             FROM password_vault WHERE id = ?1",
            [id],
            row_to_entry,
        )
        .map_err(|e| e.to_string())?;
    decrypt_entry(&mut entry, &database);
    Ok(entry)
}

#[tauri::command]
pub fn delete_vault_entry(db: State<Mutex<Database>>, id: i64) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let affected = database
        .conn()
        .execute("DELETE FROM password_vault WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

#[tauri::command]
pub fn toggle_vault_favorite(db: State<Mutex<Database>>, id: i64) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    database
        .conn()
        .execute(
            "UPDATE password_vault SET favorite = CASE WHEN favorite = 0 THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [id],
        )
        .map_err(|e| e.to_string())?;
    let fav: i32 = database
        .conn()
        .query_row("SELECT favorite FROM password_vault WHERE id = ?1", [id], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(fav != 0)
}

#[tauri::command]
pub fn search_vault_entries(
    db: State<Mutex<Database>>,
    q: String,
) -> Result<Vec<VaultEntry>, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", q);
    let mut stmt = database
        .conn()
        .prepare(
            "SELECT id, name, username, password, url, icon, note, category_id, favorite, last_used_at, created_at, updated_at
             FROM password_vault WHERE name LIKE ?1 OR username LIKE ?1 OR url LIKE ?1 ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&pattern], row_to_entry)
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for row in rows {
        let mut entry = row.map_err(|e| e.to_string())?;
        decrypt_entry(&mut entry, &database);
        list.push(entry);
    }
    Ok(list)
}
