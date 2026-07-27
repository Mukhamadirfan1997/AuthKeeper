use crate::crypto;
use crate::db::Database;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use totp_rs::{Algorithm, Secret, TOTP};

#[derive(Debug, Serialize)]
pub struct OtpResult {
    pub code: String,
    pub code_prev: String,
    pub code_next: String,
    pub remaining: u64,
    pub total: u64,
}

#[derive(Debug, Serialize)]
pub struct GenerateOtpAllResult {
    pub codes: HashMap<i64, OtpResult>,
    pub errors: HashMap<i64, String>,
}

pub fn validate_secret(secret_b32: &str, _algorithm: &str, digits: u32, _period: u64) -> Result<(), String> {
    if digits != 6 && digits != 8 {
        return Err("Digits must be 6 or 8".to_string());
    }

    Secret::Encoded(secret_b32.to_string())
        .to_bytes()
        .map_err(|e| format!("Invalid secret encoding: {}", e))?;

    Ok(())
}

fn generate_code_for_step(
    secret: &[u8],
    algorithm: Algorithm,
    digits: usize,
    period: u64,
    step: i64,
) -> Result<String, String> {
    let totp = TOTP::new_unchecked(algorithm, digits, 0, period, secret.to_vec(), None, String::new());

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let time_step = ((now as i64) / period as i64) + step;
    let time = (time_step as u64) * period;

    Ok(totp.generate(time))
}

fn generate_code(secret_b32: &str, algorithm: &str, digits: u32, period: u64) -> Result<OtpResult, String> {
    let algo = match algorithm {
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => Algorithm::SHA1,
    };

    let secret = Secret::Encoded(secret_b32.to_string())
        .to_bytes()
        .map_err(|e| format!("Invalid secret encoding: {}", e))?;

    let code = generate_code_for_step(&secret, algo, digits as usize, period, 0)?;
    let code_prev = generate_code_for_step(&secret, algo, digits as usize, period, -1)?;
    let code_next = generate_code_for_step(&secret, algo, digits as usize, period, 1)?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let remaining = period - (now % period);

    Ok(OtpResult {
        code,
        code_prev,
        code_next,
        remaining,
        total: period,
    })
}

#[tauri::command]
pub fn generate_otp(
    db: State<Mutex<Database>>,
    account_id: i64,
) -> Result<OtpResult, String> {
    let database = db.lock().map_err(|e| e.to_string())?;

    let (encrypted_secret, algorithm, digits, period): (String, String, i32, i32) = database
        .conn()
        .query_row(
            "SELECT secret, algorithm, digits, period FROM accounts WHERE id = ?1",
            [account_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| e.to_string())?;

    let key = database.get_encryption_key()?;
    let secret = crypto::decrypt(&encrypted_secret, &key).unwrap_or(encrypted_secret.clone());

    database
        .conn()
        .execute(
            "UPDATE accounts SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [account_id],
        )
        .map_err(|e| e.to_string())?;

    generate_code(&secret, &algorithm, digits as u32, period as u64)
}

#[tauri::command]
pub fn generate_otp_all(db: State<Mutex<Database>>) -> Result<GenerateOtpAllResult, String> {
    let database = db.lock().map_err(|e| e.to_string())?;

    let key = database.get_encryption_key()?;

    let mut stmt = database
        .conn()
        .prepare("SELECT id, secret, algorithm, digits, period FROM accounts")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i32>(3)?,
                row.get::<_, i32>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut codes = HashMap::new();
    let mut errors = HashMap::new();
    for row in rows {
        let (id, encrypted_secret, algorithm, digits, period) = row.map_err(|e| e.to_string())?;
        let secret = crypto::decrypt(&encrypted_secret, &key).unwrap_or(encrypted_secret.clone());
        match generate_code(&secret, &algorithm, digits as u32, period as u64) {
            Ok(otp) => { codes.insert(id, otp); }
            Err(e) => { errors.insert(id, e); }
        }
    }
    Ok(GenerateOtpAllResult { codes, errors })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let db = Database::new(":memory:").expect("failed to create db");
        db.initialize().expect("failed to init db");

        let test_secret = "JBSWY3DPEHPK3PXP";
        let key = db.get_encryption_key().expect("failed to get key");

        let encrypted = crypto::encrypt(test_secret, &key).expect("encrypt failed");
        eprintln!("[test] encrypted (len={}): {}...", encrypted.len(), &encrypted[..12.min(encrypted.len())]);

        let decrypted = crypto::decrypt(&encrypted, &key).expect("decrypt failed");
        eprintln!("[test] decrypted: {:?}", decrypted);
        assert_eq!(test_secret, &decrypted, "Decrypted secret must match original");

        let encrypted2 = crypto::encrypt(test_secret, &key).expect("encrypt2 failed");
        db.conn()
            .execute(
                "INSERT INTO accounts (issuer, label, secret, algorithm, digits, period) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params!["Test", "test@test.com", encrypted2, "SHA1", 6, 30],
            )
            .expect("insert failed");

        let id = db.conn().last_insert_rowid();

        let stored_encrypted: String = db.conn()
            .query_row("SELECT secret FROM accounts WHERE id = ?1", [id], |row| row.get(0))
            .expect("query failed");

        let decrypted2 = crypto::decrypt(&stored_encrypted, &key).expect("decrypt2 failed");
        assert_eq!(test_secret, &decrypted2, "DB roundtrip: decrypted must match original");
        eprintln!("[test] DB encryption roundtrip PASSED");

        let result = generate_code(test_secret, "SHA1", 6, 30).expect("generate_code failed");
        eprintln!("[test] OTP code: {} (prev={}, next={})", result.code, result.code_prev, result.code_next);

        let result2 = generate_code(&decrypted2, "SHA1", 6, 30).expect("generate_code2 failed");
        assert_eq!(result.code, result2.code, "Codes must match: original vs DB-decrypted");
        eprintln!("[test] Code comparison PASSED (both match)");

        let test_secret_8byte = "GEZDGNBV";
        let encrypted3 = crypto::encrypt(test_secret_8byte, &key).expect("encrypt3 failed");
        let decrypted3 = crypto::decrypt(&encrypted3, &key).expect("decrypt3 failed");
        assert_eq!(test_secret_8byte, &decrypted3, "8-byte secret roundtrip failed");
        let result3 = generate_code(test_secret_8byte, "SHA1", 6, 30).expect("generate_code 8byte failed");
        eprintln!("[test] 8-byte secret OTP code: {}", result3.code);
        eprintln!("[test] ALL TESTS PASSED");
    }
}
