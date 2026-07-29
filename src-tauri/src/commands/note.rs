use crate::crypto;
use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct SecureNote {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub icon: Option<String>,
    pub category_id: Option<i64>,
    pub favorite: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteDTO {
    pub title: String,
    pub content: String,
    pub icon: Option<String>,
    pub category_id: Option<i64>,
    pub favorite: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNoteDTO {
    pub title: Option<String>,
    pub content: Option<String>,
    pub icon: Option<String>,
    pub category_id: Option<i64>,
    pub favorite: Option<bool>,
}

fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<SecureNote> {
    Ok(SecureNote {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        icon: row.get(3)?,
        category_id: row.get(4)?,
        favorite: row.get::<_, i32>(5)? != 0,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn decrypt_note(note: &mut SecureNote, db: &Database) {
    if let Ok(key) = db.get_encryption_key() {
        if let Ok(plain) = crypto::decrypt(&note.content, &key) {
            note.content = plain;
        }
    }
}

fn encrypt_content(value: &str, db: &Database) -> String {
    if let Ok(key) = db.get_encryption_key() {
        crypto::encrypt(value, &key).unwrap_or_else(|_| value.to_string())
    } else {
        value.to_string()
    }
}

#[tauri::command]
pub fn get_notes(db: State<Mutex<Database>>) -> Result<Vec<SecureNote>, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = database
        .conn()
        .prepare(
            "SELECT id, title, content, icon, category_id, favorite, created_at, updated_at
             FROM secure_notes ORDER BY title ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_note)
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for row in rows {
        let mut note = row.map_err(|e| e.to_string())?;
        decrypt_note(&mut note, &database);
        list.push(note);
    }
    Ok(list)
}

#[tauri::command]
pub fn get_note(
    db: State<Mutex<Database>>,
    id: i64,
) -> Result<SecureNote, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let mut note = database
        .conn()
        .query_row(
            "SELECT id, title, content, icon, category_id, favorite, created_at, updated_at
             FROM secure_notes WHERE id = ?1",
            [id],
            row_to_note,
        )
        .map_err(|e| e.to_string())?;
    decrypt_note(&mut note, &database);
    Ok(note)
}

#[tauri::command]
pub fn create_note(
    db: State<Mutex<Database>>,
    data: CreateNoteDTO,
) -> Result<SecureNote, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let encrypted = encrypt_content(&data.content, &database);
    let favorite = data.favorite.unwrap_or(false) as i32;

    database
        .conn()
        .execute(
            "INSERT INTO secure_notes (title, content, icon, category_id, favorite)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![data.title, encrypted, data.icon, data.category_id, favorite],
        )
        .map_err(|e| e.to_string())?;
    let id = database.conn().last_insert_rowid();

    let mut note = database
        .conn()
        .query_row(
            "SELECT id, title, content, icon, category_id, favorite, created_at, updated_at
             FROM secure_notes WHERE id = ?1",
            [id],
            row_to_note,
        )
        .map_err(|e| e.to_string())?;
    decrypt_note(&mut note, &database);
    Ok(note)
}

#[tauri::command]
pub fn update_note(
    db: State<Mutex<Database>>,
    id: i64,
    data: UpdateNoteDTO,
) -> Result<SecureNote, String> {
    let database = db.lock().map_err(|e| e.to_string())?;

    if let Some(title) = &data.title {
        database
            .conn()
            .execute(
                "UPDATE secure_notes SET title = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![title, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(content) = &data.content {
        let encrypted = encrypt_content(content, &database);
        database
            .conn()
            .execute(
                "UPDATE secure_notes SET content = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![encrypted, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.icon.is_some() {
        database
            .conn()
            .execute(
                "UPDATE secure_notes SET icon = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.icon, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.category_id.is_some() {
        database
            .conn()
            .execute(
                "UPDATE secure_notes SET category_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.category_id, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if let Some(fav) = data.favorite {
        database
            .conn()
            .execute(
                "UPDATE secure_notes SET favorite = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![fav as i32, id],
            )
            .map_err(|e| e.to_string())?;
    }

    let mut note = database
        .conn()
        .query_row(
            "SELECT id, title, content, icon, category_id, favorite, created_at, updated_at
             FROM secure_notes WHERE id = ?1",
            [id],
            row_to_note,
        )
        .map_err(|e| e.to_string())?;
    decrypt_note(&mut note, &database);
    Ok(note)
}

#[tauri::command]
pub fn delete_note(db: State<Mutex<Database>>, id: i64) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let affected = database
        .conn()
        .execute("DELETE FROM secure_notes WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

#[tauri::command]
pub fn toggle_note_favorite(db: State<Mutex<Database>>, id: i64) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    database
        .conn()
        .execute(
            "UPDATE secure_notes SET favorite = CASE WHEN favorite = 0 THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [id],
        )
        .map_err(|e| e.to_string())?;
    let fav: i32 = database
        .conn()
        .query_row("SELECT favorite FROM secure_notes WHERE id = ?1", [id], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(fav != 0)
}

#[tauri::command]
pub fn search_notes(
    db: State<Mutex<Database>>,
    q: String,
) -> Result<Vec<SecureNote>, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", q);
    let mut stmt = database
        .conn()
        .prepare(
            "SELECT id, title, content, icon, category_id, favorite, created_at, updated_at
             FROM secure_notes WHERE title LIKE ?1 OR content LIKE ?1 ORDER BY title ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&pattern], row_to_note)
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for row in rows {
        let mut note = row.map_err(|e| e.to_string())?;
        decrypt_note(&mut note, &database);
        list.push(note);
    }
    Ok(list)
}
