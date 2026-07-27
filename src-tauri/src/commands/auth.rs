use crate::db::Database;
use bcrypt::{hash, verify, DEFAULT_COST};
use rand::Rng;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

#[allow(dead_code)]
#[derive(Serialize)]
pub struct LockStatus {
    pub locked: bool,
    pub remaining_attempts: u32,
    pub lock_until: Option<u64>,
}

pub struct AuthState {
    pub failed_attempts: Mutex<u32>,
    pub lock_until: Mutex<Option<u64>>,
}

impl AuthState {
    pub fn new() -> Self {
        AuthState {
            failed_attempts: Mutex::new(0),
            lock_until: Mutex::new(None),
        }
    }
}

fn get_pin_hash(db: &Database) -> Result<String, String> {
    db.conn()
        .query_row("SELECT pin_hash FROM settings WHERE id = 1", [], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())
}

fn set_pin_hash(db: &Database, hash: &str) -> Result<(), String> {
    db.conn()
        .execute(
            "UPDATE settings SET pin_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
            [hash],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn get_recovery_hash(db: &Database) -> Result<String, String> {
    db.conn()
        .query_row(
            "SELECT recovery_hash FROM settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())
}

fn set_recovery_hash(db: &Database, hash: &str) -> Result<(), String> {
    db.conn()
        .execute(
            "UPDATE settings SET recovery_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
            [hash],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn check_pin_setup(db: State<Mutex<Database>>) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let hash = get_pin_hash(&database)?;
    Ok(!hash.is_empty())
}

#[tauri::command]
pub fn setup_pin(db: State<Mutex<Database>>, pin: String) -> Result<bool, String> {
    if pin.len() < 6 {
        return Err("PIN minimal 6 digit".to_string());
    }
    let hashed = hash(&pin, DEFAULT_COST).map_err(|e| e.to_string())?;
    let database = db.lock().map_err(|e| e.to_string())?;
    set_pin_hash(&database, &hashed)?;
    Ok(true)
}

#[tauri::command]
pub fn verify_pin(
    db: State<Mutex<Database>>,
    auth: State<AuthState>,
    pin: String,
) -> Result<bool, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    {
        let lock_until = auth.lock_until.lock().map_err(|e| e.to_string())?;
        if let Some(until) = *lock_until {
            if now < until {
                return Ok(false);
            }
        }
    }

    let database = db.lock().map_err(|e| e.to_string())?;
    let hash = get_pin_hash(&database)?;

    if hash.is_empty() {
        return Err("PIN belum disetup".to_string());
    }

    let ok = verify(&pin, &hash).map_err(|e| e.to_string())?;

    if ok {
        let mut attempts = auth.failed_attempts.lock().map_err(|e| e.to_string())?;
        *attempts = 0;
        let mut lock_until = auth.lock_until.lock().map_err(|e| e.to_string())?;
        *lock_until = None;
        Ok(true)
    } else {
        let mut attempts = auth.failed_attempts.lock().map_err(|e| e.to_string())?;
        *attempts += 1;
        if *attempts >= 5 {
            let mut lock_until = auth.lock_until.lock().map_err(|e| e.to_string())?;
            *lock_until = Some(now + 60);
            *attempts = 0;
        }
        Ok(false)
    }
}

#[tauri::command]
pub fn change_pin(
    db: State<Mutex<Database>>,
    old_pin: String,
    new_pin: String,
) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let current_hash = get_pin_hash(&database)?;

    if !verify(&old_pin, &current_hash).map_err(|e| e.to_string())? {
        return Err("PIN lama salah".to_string());
    }

    if new_pin.len() < 6 {
        return Err("PIN baru minimal 6 digit".to_string());
    }
    let hashed = bcrypt::hash(&new_pin, DEFAULT_COST).map_err(|e| e.to_string())?;
    set_pin_hash(&database, &hashed)?;
    Ok(true)
}

#[tauri::command]
pub fn generate_recovery_key(db: State<Mutex<Database>>) -> Result<String, String> {
    let database = db.lock().map_err(|e| e.to_string())?;

    let existing = get_recovery_hash(&database)?;
    if !existing.is_empty() {
        return Err("Kode pemulihan sudah ada".to_string());
    }

    let key: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(8)
        .map(char::from)
        .collect();

    let hashed = hash(&key, DEFAULT_COST).map_err(|e| e.to_string())?;
    set_recovery_hash(&database, &hashed)?;

    Ok(key)
}

#[tauri::command]
pub fn verify_recovery_key(db: State<Mutex<Database>>, key: String) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let hash = get_recovery_hash(&database)?;

    if hash.is_empty() {
        return Err("Tidak ada kode pemulihan. Buat PIN baru untuk membuat kode pemulihan.".to_string());
    }

    let ok = verify(&key, &hash).map_err(|e| e.to_string())?;

    if ok {
        set_pin_hash(&database, "")?;
        set_recovery_hash(&database, "")?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn has_recovery_key(db: State<Mutex<Database>>) -> Result<bool, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let hash = get_recovery_hash(&database)?;
    Ok(!hash.is_empty())
}

#[allow(dead_code)]
#[tauri::command]
pub fn get_lock_status(auth: State<AuthState>) -> Result<LockStatus, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let attempts = *auth.failed_attempts.lock().map_err(|e| e.to_string())?;
    let lock_until = *auth.lock_until.lock().map_err(|e| e.to_string())?;
    let locked = lock_until.map(|u| now < u).unwrap_or(false);

    Ok(LockStatus {
        locked,
        remaining_attempts: 5u32.saturating_sub(attempts),
        lock_until,
    })
}
