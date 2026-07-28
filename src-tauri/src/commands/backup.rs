use crate::crypto;
use crate::db::Database;
use rand::Rng;
use sha2::Digest;
use std::sync::Mutex;
use tauri::State;

fn backup_key_to_aes(key: &str) -> [u8; 32] {
    let hash = sha2::Sha256::digest(key.as_bytes());
    let mut result = [0u8; 32];
    result.copy_from_slice(&hash);
    result
}

fn collect_accounts(database: &Database, key: &[u8; 32]) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = database
        .conn()
        .prepare("SELECT issuer, label, secret, algorithm, digits, period, icon, note, favorite FROM accounts")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i32>(4)?,
                row.get::<_, i32>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, i32>(8)? != 0,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut accounts = Vec::new();
    for row in rows {
        let (issuer, label, encrypted_secret, algorithm, digits, period, icon, note, favorite) = row.map_err(|e| e.to_string())?;
        let secret = crypto::decrypt(&encrypted_secret, key).unwrap_or(encrypted_secret);
        accounts.push(serde_json::json!({
            "issuer": issuer, "label": label, "secret": secret,
            "algorithm": algorithm, "digits": digits, "period": period,
            "icon": icon, "note": note, "favorite": favorite,
        }));
    }
    Ok(accounts)
}

fn collect_vault_entries(database: &Database, key: &[u8; 32]) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = database
        .conn()
        .prepare("SELECT name, username, password, url, icon, note, category_id, favorite FROM password_vault")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<i64>>(6)?,
                row.get::<_, i32>(7)? != 0,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for row in rows {
        let (name, username, encrypted_password, url, icon, note, category_id, favorite) = row.map_err(|e| e.to_string())?;
        let password = crypto::decrypt(&encrypted_password, key).unwrap_or(encrypted_password);
        entries.push(serde_json::json!({
            "name": name, "username": username, "password": password,
            "url": url, "icon": icon, "note": note,
            "category_id": category_id, "favorite": favorite,
        }));
    }
    Ok(entries)
}

fn collect_notes(database: &Database, key: &[u8; 32]) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = database
        .conn()
        .prepare("SELECT title, content, icon, category_id, favorite FROM secure_notes")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<i64>>(3)?,
                row.get::<_, i32>(4)? != 0,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut notes = Vec::new();
    for row in rows {
        let (title, encrypted_content, icon, category_id, favorite) = row.map_err(|e| e.to_string())?;
        let content = crypto::decrypt(&encrypted_content, key).unwrap_or(encrypted_content);
        notes.push(serde_json::json!({
            "title": title, "content": content,
            "icon": icon, "category_id": category_id, "favorite": favorite,
        }));
    }
    Ok(notes)
}

#[tauri::command]
pub fn export_backup(
    db: State<Mutex<Database>>,
    path: String,
) -> Result<String, String> {
    let database = db.lock().map_err(|e| e.to_string())?;
    let key = database.get_encryption_key()?;

    let accounts = collect_accounts(&database, &key)?;
    let vault_entries = collect_vault_entries(&database, &key)?;
    let notes = collect_notes(&database, &key)?;

    let backup = serde_json::json!({
        "version": 2,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "accounts": accounts,
        "vault_entries": vault_entries,
        "notes": notes,
    });

    let json_str = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;

    let backup_key: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();

    let aes_key = backup_key_to_aes(&backup_key);
    let encrypted = crypto::encrypt(&json_str, &aes_key)?;

    std::fs::write(&path, &encrypted).map_err(|e| e.to_string())?;

    let recovery_path = format!("{}.recovery.txt", path);
    let recovery_content = format!(
        "\
==================================
     AUTHKEEPER - BACKUP RECOVERY
==================================

Backup Key: {backup_key}

Gunakan kode ini untuk restore backup.

Cara restore:
1. Buka AuthKeeper → Pengaturan → Data & Cadangan → Pulihkan Data
2. Pilih file .authkeeper
3. Masukkan Backup Key di atas
4. Konfirmasi restore

Backup ini mencakup:
- Akun TOTP
- Kata Sandi (Password Vault)
- Catatan (Secure Notes)

Simpan file ini di tempat aman!
Jangan bagikan ke siapa pun!

File backup: {path}
Dibuat: {date}
==================================
",
        backup_key = backup_key,
        path = path,
        date = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    );

    std::fs::write(&recovery_path, &recovery_content).map_err(|e| e.to_string())?;

    Ok(backup_key)
}

fn import_accounts(backup: &serde_json::Value, database: &Database, key: &[u8; 32]) -> Result<(), String> {
    let accounts = backup["accounts"].as_array().ok_or("Format backup tidak valid")?;
    database.conn().execute("DELETE FROM accounts", []).map_err(|e| e.to_string())?;
    for account in accounts {
        let plain_secret = account["secret"].as_str().unwrap_or("");
        let encrypted_secret = crypto::encrypt(plain_secret, key).unwrap_or_else(|_| plain_secret.to_string());
        database
            .conn()
            .execute(
                "INSERT INTO accounts (issuer, label, secret, algorithm, digits, period, icon, note, favorite) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![
                    account["issuer"].as_str().unwrap_or(""),
                    account["label"].as_str().unwrap_or(""),
                    encrypted_secret,
                    account["algorithm"].as_str().unwrap_or("SHA1"),
                    account["digits"].as_i64().unwrap_or(6) as i32,
                    account["period"].as_i64().unwrap_or(30) as i32,
                    account["icon"].as_str(),
                    account["note"].as_str(),
                    account["favorite"].as_bool().unwrap_or(false) as i32,
                ],
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn import_vault_entries(backup: &serde_json::Value, database: &Database, key: &[u8; 32]) -> Result<(), String> {
    let Some(entries) = backup["vault_entries"].as_array() else { return Ok(()) };
    database.conn().execute("DELETE FROM password_vault", []).map_err(|e| e.to_string())?;
    for entry in entries {
        let plain_password = entry["password"].as_str().unwrap_or("");
        let encrypted = crypto::encrypt(plain_password, key).unwrap_or_else(|_| plain_password.to_string());
        database
            .conn()
            .execute(
                "INSERT INTO password_vault (name, username, password, url, icon, note, category_id, favorite) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![
                    entry["name"].as_str().unwrap_or(""),
                    entry["username"].as_str(),
                    encrypted,
                    entry["url"].as_str(),
                    entry["icon"].as_str(),
                    entry["note"].as_str(),
                    entry["category_id"].as_i64(),
                    entry["favorite"].as_bool().unwrap_or(false) as i32,
                ],
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn import_notes(backup: &serde_json::Value, database: &Database, key: &[u8; 32]) -> Result<(), String> {
    let Some(notes) = backup["notes"].as_array() else { return Ok(()) };
    database.conn().execute("DELETE FROM secure_notes", []).map_err(|e| e.to_string())?;
    for note in notes {
        let plain_content = note["content"].as_str().unwrap_or("");
        let encrypted = crypto::encrypt(plain_content, key).unwrap_or_else(|_| plain_content.to_string());
        database
            .conn()
            .execute(
                "INSERT INTO secure_notes (title, content, icon, category_id, favorite) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    note["title"].as_str().unwrap_or(""),
                    encrypted,
                    note["icon"].as_str(),
                    note["category_id"].as_i64(),
                    note["favorite"].as_bool().unwrap_or(false) as i32,
                ],
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn import_backup(
    db: State<Mutex<Database>>,
    path: String,
    backup_key: String,
) -> Result<bool, String> {
    let encrypted = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let aes_key = backup_key_to_aes(&backup_key);
    let json_str = crypto::decrypt(&encrypted.trim(), &aes_key)?;

    let backup: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

    let database = db.lock().map_err(|e| e.to_string())?;
    let key = database.get_encryption_key()?;

    import_accounts(&backup, &database, &key)?;
    import_vault_entries(&backup, &database, &key)?;
    import_notes(&backup, &database, &key)?;

    Ok(true)
}
