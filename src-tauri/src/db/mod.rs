use crate::crypto;
use rand::RngCore;
use rusqlite::{Connection, Result};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        Ok(Database { conn })
    }

    pub fn initialize(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                issuer TEXT NOT NULL,
                label TEXT NOT NULL,
                secret TEXT NOT NULL,
                algorithm TEXT NOT NULL DEFAULT 'SHA1',
                digits INTEGER NOT NULL DEFAULT 6,
                period INTEGER NOT NULL DEFAULT 30,
                icon TEXT,
                note TEXT,
                favorite INTEGER NOT NULL DEFAULT 0,
                last_used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                pin_hash TEXT NOT NULL DEFAULT '',
                recovery_hash TEXT NOT NULL DEFAULT '',
                theme TEXT NOT NULL DEFAULT 'dark',
                auto_lock INTEGER NOT NULL DEFAULT 5,
                language TEXT NOT NULL DEFAULT 'id',
                backup_path TEXT,
                encryption_key TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            INSERT OR IGNORE INTO settings (id, pin_hash) VALUES (1, '');
            ",
        )?;

        self.migrate_v1_to_v3()?;
        self.migrate_v4()?;
        self.migrate_v5()?;

        Ok(())
    }

    fn migrate_v1_to_v3(&self) -> Result<()> {
        let version: i32 = self
            .conn
            .pragma_query_value(None, "user_version", |row| row.get(0))?;

        if version >= 3 {
            return Ok(());
        }

        if version < 2 {
            let has_unique: bool = self
                .conn
                .query_row(
                    "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type = 'table' AND name = 'accounts' AND sql LIKE '%UNIQUE%'",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(false);

            if has_unique {
                self.conn.execute_batch(
                    "
                    PRAGMA foreign_keys=OFF;
                    CREATE TABLE accounts_v2 (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        issuer TEXT NOT NULL,
                        label TEXT NOT NULL,
                        secret TEXT NOT NULL,
                        algorithm TEXT NOT NULL DEFAULT 'SHA1',
                        digits INTEGER NOT NULL DEFAULT 6,
                        period INTEGER NOT NULL DEFAULT 30,
                        icon TEXT,
                        note TEXT,
                        favorite INTEGER NOT NULL DEFAULT 0,
                        last_used_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    INSERT INTO accounts_v2 SELECT * FROM accounts;
                    DROP TABLE accounts;
                    ALTER TABLE accounts_v2 RENAME TO accounts;
                    PRAGMA foreign_keys=ON;
                    ",
                )?;
            }
        }

        if version < 3 {
            self.conn
                .execute_batch("ALTER TABLE settings ADD COLUMN recovery_hash TEXT NOT NULL DEFAULT ''")
                .ok();
        }

        self.conn
            .pragma_update(None, "user_version", 3)?;

        Ok(())
    }

    fn migrate_v4(&self) -> Result<()> {
        let version: i32 = self
            .conn
            .pragma_query_value(None, "user_version", |row| row.get(0))?;

        if version >= 4 {
            return Ok(());
        }

        self.conn
            .execute_batch("ALTER TABLE settings ADD COLUMN encryption_key TEXT NOT NULL DEFAULT ''")
            .ok();

        let key: [u8; 32] = self.get_or_create_encryption_key().unwrap();

        let mut stmt = self
            .conn
            .prepare("SELECT id, secret FROM accounts")
            .unwrap();
        let rows: Vec<(i64, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        for (id, secret) in rows {
            if crypto::decrypt(&secret, &key).is_err() {
                if let Ok(encrypted) = crypto::encrypt(&secret, &key) {
                    self.conn
                        .execute(
                            "UPDATE accounts SET secret = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            rusqlite::params![encrypted, id],
                        )
                        .ok();
                }
            }
        }

        self.conn.pragma_update(None, "user_version", 4)?;

        Ok(())
    }

    fn migrate_v5(&self) -> Result<()> {
        let version: i32 = self
            .conn
            .pragma_query_value(None, "user_version", |row| row.get(0))?;

        if version >= 5 {
            return Ok(());
        }

        self.conn
            .execute_batch("ALTER TABLE accounts ADD COLUMN secret_hash TEXT NOT NULL DEFAULT ''")
            .ok();

        let key: [u8; 32] = self.get_or_create_encryption_key().unwrap();

        let mut stmt = self
            .conn
            .prepare("SELECT id, secret FROM accounts")
            .unwrap();
        let rows: Vec<(i64, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        for (id, encrypted_secret) in &rows {
            let plaintext = crypto::decrypt(encrypted_secret, &key).unwrap_or(encrypted_secret.clone());
            let hash = crate::crypto::hash_secret(&plaintext);
            self.conn
                .execute(
                    "UPDATE accounts SET secret_hash = ?1 WHERE id = ?2",
                    rusqlite::params![hash, id],
                )
                .ok();
        }

        self.conn
            .execute_batch(
                "DELETE FROM accounts WHERE id NOT IN (SELECT MIN(id) FROM accounts GROUP BY issuer, label, secret_hash)",
            )
            .ok();

        self.conn.pragma_update(None, "user_version", 5)?;

        Ok(())
    }

    fn get_or_create_encryption_key(&self) -> Result<[u8; 32], String> {
        let key_b32: String = self
            .conn
            .query_row(
                "SELECT encryption_key FROM settings WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if !key_b32.is_empty() {
            if let Some(decoded) = base32::decode(base32::Alphabet::Rfc4648 { padding: false }, &key_b32) {
                if decoded.len() == 32 {
                    let mut k = [0u8; 32];
                    k.copy_from_slice(&decoded);
                    return Ok(k);
                }
            }
        }

        let mut k = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut k);
        let encoded = base32::encode(base32::Alphabet::Rfc4648 { padding: false }, &k);
        self.conn
            .execute(
                "UPDATE settings SET encryption_key = ?1 WHERE id = 1",
                [&encoded],
            )
            .map_err(|e| e.to_string())?;
        Ok(k)
    }

    pub fn get_encryption_key(&self) -> Result<[u8; 32], String> {
        self.get_or_create_encryption_key()
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }
}
