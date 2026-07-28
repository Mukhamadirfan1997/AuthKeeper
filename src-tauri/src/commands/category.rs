use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryDTO {
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryDTO {
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

fn row_to_category(row: &rusqlite::Row) -> rusqlite::Result<Category> {
    Ok(Category {
        id: row.get(0)?,
        name: row.get(1)?,
        icon: row.get(2)?,
        color: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

#[tauri::command]
pub fn get_categories(db: State<Mutex<Database>>) -> Result<Vec<Category>, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = database
        .conn()
        .prepare("SELECT id, name, icon, color, created_at, updated_at FROM categories ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_category)
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub fn create_category(
    db: State<Mutex<Database>>,
    data: CreateCategoryDTO,
) -> Result<Category, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    database
        .conn()
        .execute(
            "INSERT INTO categories (name, icon, color) VALUES (?1, ?2, ?3)",
            rusqlite::params![data.name, data.icon, data.color],
        )
        .map_err(|e| e.to_string())?;
    let id = database.conn().last_insert_rowid();
    database
        .conn()
        .query_row(
            "SELECT id, name, icon, color, created_at, updated_at FROM categories WHERE id = ?1",
            [id],
            row_to_category,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_category(
    db: State<Mutex<Database>>,
    id: i64,
    data: UpdateCategoryDTO,
) -> Result<Category, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    if let Some(name) = &data.name {
        database
            .conn()
            .execute(
                "UPDATE categories SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![name, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.icon.is_some() {
        database
            .conn()
            .execute(
                "UPDATE categories SET icon = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.icon, id],
            )
            .map_err(|e| e.to_string())?;
    }
    if data.color.is_some() {
        database
            .conn()
            .execute(
                "UPDATE categories SET color = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![data.color, id],
            )
            .map_err(|e| e.to_string())?;
    }
    database
        .conn()
        .query_row(
            "SELECT id, name, icon, color, created_at, updated_at FROM categories WHERE id = ?1",
            [id],
            row_to_category,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_category(db: State<Mutex<Database>>, id: i64) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let affected = database
        .conn()
        .execute("DELETE FROM categories WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

#[tauri::command]
pub fn get_account_categories(
    db: State<Mutex<Database>>,
    account_id: i64,
) -> Result<Vec<Category>, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = database
        .conn()
        .prepare(
            "SELECT c.id, c.name, c.icon, c.color, c.created_at, c.updated_at
             FROM categories c
             INNER JOIN account_categories ac ON ac.category_id = c.id
             WHERE ac.account_id = ?1
             ORDER BY c.name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([account_id], row_to_category)
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub fn assign_category_to_account(
    db: State<Mutex<Database>>,
    account_id: i64,
    category_id: i64,
) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    database
        .conn()
        .execute(
            "INSERT OR IGNORE INTO account_categories (account_id, category_id) VALUES (?1, ?2)",
            rusqlite::params![account_id, category_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn unassign_category_from_account(
    db: State<Mutex<Database>>,
    account_id: i64,
    category_id: i64,
) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    database
        .conn()
        .execute(
            "DELETE FROM account_categories WHERE account_id = ?1 AND category_id = ?2",
            rusqlite::params![account_id, category_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(true)
}
