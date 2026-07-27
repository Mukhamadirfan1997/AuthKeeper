use crate::commands::otp::validate_secret;
use crate::crypto;
use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Account {
    pub id: i64,
    pub issuer: String,
    pub label: String,
    pub secret: String,
    pub algorithm: String,
    pub digits: i32,
    pub period: i32,
    pub icon: Option<String>,
    pub note: Option<String>,
    pub favorite: bool,
    pub last_used_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccountDTO {
    pub issuer: String,
    pub label: String,
    pub secret: String,
    pub algorithm: String,
    pub digits: i32,
    pub period: i32,
    pub icon: Option<String>,
    pub note: Option<String>,
    pub favorite: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccountDTO {
    pub issuer: Option<String>,
    pub label: Option<String>,
    pub secret: Option<String>,
    pub algorithm: Option<String>,
    pub digits: Option<i32>,
    pub period: Option<i32>,
    #[allow(dead_code)]
    pub icon: Option<String>,
    pub note: Option<String>,
    pub favorite: Option<bool>,
}

fn row_to_account(row: &rusqlite::Row) -> rusqlite::Result<Account> {
    Ok(Account {
        id: row.get(0)?,
        issuer: row.get(1)?,
        label: row.get(2)?,
        secret: row.get(3)?,
        algorithm: row.get(4)?,
        digits: row.get(5)?,
        period: row.get(6)?,
        icon: row.get(7)?,
        note: row.get(8)?,
        favorite: row.get::<_, i32>(9)? != 0,
        last_used_at: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn decrypt_secret(account: &mut Account, db: &Database) {
    if let Ok(key) = db.get_encryption_key() {
        match crypto::decrypt(&account.secret, &key) {
            Ok(plain) => account.secret = plain,
            Err(_) => {
                if let Ok(encrypted) = crypto::encrypt(&account.secret, &key) {
                    db.conn()
                        .execute(
                            "UPDATE accounts SET secret = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            rusqlite::params![encrypted, account.id],
                        )
                        .ok();
                }
            }
        }
    }
}

fn encrypt_secret(secret: &str, db: &Database) -> String {
    if let Ok(key) = db.get_encryption_key() {
        crypto::encrypt(secret, &key).unwrap_or_else(|_| secret.to_string())
    } else {
        secret.to_string()
    }
}

#[tauri::command]
pub fn get_accounts(db: State<Mutex<Database>>) -> Result<Vec<Account>, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = database
        .conn()
        .prepare(
            "SELECT id, issuer, label, secret, algorithm, digits, period, icon, note, favorite, last_used_at, created_at, updated_at FROM accounts ORDER BY issuer ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_account)
        .map_err(|e| e.to_string())?;
    let mut accounts = Vec::new();
    for row in rows {
        let mut acc = row.map_err(|e| e.to_string())?;
        decrypt_secret(&mut acc, &database);
        accounts.push(acc);
    }
    Ok(accounts)
}

#[tauri::command]
pub fn get_account(db: State<Mutex<Database>>, id: i64) -> Result<Account, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let mut acc = database
        .conn()
        .query_row(
            "SELECT id, issuer, label, secret, algorithm, digits, period, icon, note, favorite, last_used_at, created_at, updated_at FROM accounts WHERE id = ?1",
            [id],
            row_to_account,
        )
        .map_err(|e| e.to_string())?;
    decrypt_secret(&mut acc, &database);
    Ok(acc)
}

#[tauri::command]
pub fn create_account(
    db: State<Mutex<Database>>,
    data: CreateAccountDTO,
) -> Result<Account, String> {
    validate_secret(&data.secret, &data.algorithm, data.digits as u32, data.period as u64)?;
    let database = db.lock().map_err(|e| e.to_string())?;

    let secret_hash = crypto::hash_secret(&data.secret);
    let encrypted_secret = encrypt_secret(&data.secret, &database);

    let existing_id: Option<i64> = database
        .conn()
        .query_row(
            "SELECT id FROM accounts WHERE issuer = ?1 AND label = ?2 AND secret_hash = ?3",
            rusqlite::params![data.issuer, data.label, secret_hash],
            |row| row.get(0),
        )
        .ok();

    if let Some(id) = existing_id {
        return database
            .conn()
            .query_row(
                "SELECT id, issuer, label, secret, algorithm, digits, period, icon, note, favorite, last_used_at, created_at, updated_at FROM accounts WHERE id = ?1",
                [id],
                row_to_account,
            )
            .map_err(|e| e.to_string());
    }

    let favorite = data.favorite.unwrap_or(false) as i32;
    database
        .conn()
        .execute(
            "INSERT INTO accounts (issuer, label, secret, algorithm, digits, period, icon, note, favorite, secret_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                data.issuer, data.label, encrypted_secret, data.algorithm, data.digits, data.period, data.icon, data.note, favorite, secret_hash
            ],
        )
        .map_err(|e| e.to_string())?;
    let id = database.conn().last_insert_rowid();

    let mut acc = database
        .conn()
        .query_row(
            "SELECT id, issuer, label, secret, algorithm, digits, period, icon, note, favorite, last_used_at, created_at, updated_at FROM accounts WHERE id = ?1",
            [id],
            row_to_account,
        )
        .map_err(|e| e.to_string())?;
    decrypt_secret(&mut acc, &database);
    Ok(acc)
}

#[tauri::command]
pub fn update_account(
    db: State<Mutex<Database>>,
    id: i64,
    data: UpdateAccountDTO,
) -> Result<Account, String> {
    let database = db.lock().map_err(|e| e.to_string())?;

    if let Some(issuer) = &data.issuer {
        database.conn().execute("UPDATE accounts SET issuer = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", rusqlite::params![issuer, id]).map_err(|e| e.to_string())?;
    }
    if let Some(label) = &data.label {
        database.conn().execute("UPDATE accounts SET label = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", rusqlite::params![label, id]).map_err(|e| e.to_string())?;
    }
    if let Some(secret) = &data.secret {
        let algo = data.algorithm.as_deref().unwrap_or("SHA1");
        let digits = data.digits.unwrap_or(6);
        let period = data.period.unwrap_or(30);
        validate_secret(secret, algo, digits as u32, period as u64)?;
        let encrypted = encrypt_secret(secret, &database);
        let secret_hash = crypto::hash_secret(secret);
        database.conn().execute("UPDATE accounts SET secret = ?1, secret_hash = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3", rusqlite::params![encrypted, secret_hash, id]).map_err(|e| e.to_string())?;
    }
    if let Some(algorithm) = &data.algorithm {
        database.conn().execute("UPDATE accounts SET algorithm = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", rusqlite::params![algorithm, id]).map_err(|e| e.to_string())?;
    }
    if let Some(digits) = data.digits {
        database.conn().execute("UPDATE accounts SET digits = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", rusqlite::params![digits, id]).map_err(|e| e.to_string())?;
    }
    if let Some(period) = data.period {
        database.conn().execute("UPDATE accounts SET period = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", rusqlite::params![period, id]).map_err(|e| e.to_string())?;
    }
    if data.note.is_some() {
        database.conn().execute("UPDATE accounts SET note = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", rusqlite::params![data.note, id]).map_err(|e| e.to_string())?;
    }
    if let Some(fav) = data.favorite {
        let f = fav as i32;
        database.conn().execute("UPDATE accounts SET favorite = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", rusqlite::params![f, id]).map_err(|e| e.to_string())?;
    }

    let mut acc = database
        .conn()
        .query_row(
            "SELECT id, issuer, label, secret, algorithm, digits, period, icon, note, favorite, last_used_at, created_at, updated_at FROM accounts WHERE id = ?1",
            [id],
            row_to_account,
        )
        .map_err(|e| e.to_string())?;
    decrypt_secret(&mut acc, &database);
    Ok(acc)
}

#[tauri::command]
pub fn delete_account(db: State<Mutex<Database>>, id: i64) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let affected = database
        .conn()
        .execute("DELETE FROM accounts WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

#[tauri::command]
pub fn toggle_favorite(db: State<Mutex<Database>>, id: i64) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    database
        .conn()
        .execute(
            "UPDATE accounts SET favorite = CASE WHEN favorite = 0 THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [id],
        )
        .map_err(|e| e.to_string())?;
    let fav: i32 = database
        .conn()
        .query_row("SELECT favorite FROM accounts WHERE id = ?1", [id], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;
    Ok(fav != 0)
}

#[tauri::command]
pub fn search_accounts(db: State<Mutex<Database>>, q: String) -> Result<Vec<Account>, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", q);
    let mut stmt = database
        .conn()
        .prepare(
            "SELECT id, issuer, label, secret, algorithm, digits, period, icon, note, favorite, last_used_at, created_at, updated_at FROM accounts WHERE issuer LIKE ?1 OR label LIKE ?1 ORDER BY issuer ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&pattern], row_to_account)
        .map_err(|e| e.to_string())?;
    let mut accounts = Vec::new();
    for row in rows {
        let mut acc = row.map_err(|e| e.to_string())?;
        decrypt_secret(&mut acc, &database);
        accounts.push(acc);
    }
    Ok(accounts)
}