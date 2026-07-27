use base64::Engine as _;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct MigrationAccount {
    pub issuer: String,
    pub label: String,
    pub secret: String,
    pub algorithm: String,
    pub digits: i32,
    pub period: i32,
}

#[derive(Debug, Serialize)]
pub struct MigrationResult {
    pub accounts: Vec<MigrationAccount>,
    pub skipped: Vec<String>,
    pub batch_size: u64,
    pub batch_index: u64,
}

fn decode_varint(data: &[u8], pos: &mut usize) -> u64 {
    let mut result = 0u64;
    let mut shift = 0;
    loop {
        let byte = data[*pos];
        *pos += 1;
        result |= ((byte & 0x7F) as u64) << shift;
        if byte & 0x80 == 0 {
            break;
        }
        shift += 7;
    }
    result
}

fn skip_field(data: &[u8], pos: &mut usize, wire_type: u8) {
    match wire_type {
        0 => { decode_varint(data, pos); }
        1 => { *pos += 8; }
        2 => {
            let len = decode_varint(data, pos) as usize;
            *pos += len;
        }
        5 => { *pos += 4; }
        _ => {}
    }
}

fn parse_otp_parameters(data: &[u8]) -> Option<(MigrationAccount, u64)> {
    let mut pos = 0;
    let mut secret_bytes: Option<Vec<u8>> = None;
    let mut name = String::new();
    let mut issuer = String::new();
    let mut algorithm: u64 = 0;
    let mut digits: u64 = 0;
    let mut otp_type: u64 = 0;

    while pos < data.len() {
        let key = decode_varint(data, &mut pos);
        let field_num = key >> 3;
        let wire_type = (key & 0x07) as u8;

        match (field_num, wire_type) {
            (1, 2) => {
                let len = decode_varint(data, &mut pos) as usize;
                secret_bytes = Some(data[pos..pos + len].to_vec());
                pos += len;
            }
            (2, 2) => {
                let len = decode_varint(data, &mut pos) as usize;
                name = String::from_utf8_lossy(&data[pos..pos + len]).to_string();
                pos += len;
            }
            (3, 2) => {
                let len = decode_varint(data, &mut pos) as usize;
                issuer = String::from_utf8_lossy(&data[pos..pos + len]).to_string();
                pos += len;
            }
            (4, 0) => {
                algorithm = decode_varint(data, &mut pos);
            }
            (5, 0) => {
                digits = decode_varint(data, &mut pos);
            }
            (6, 0) => {
                otp_type = decode_varint(data, &mut pos);
            }
            _ => {
                skip_field(data, &mut pos, wire_type);
            }
        }
    }

    let secret_b32 = secret_bytes
        .as_ref()
        .map(|b| base32::encode(base32::Alphabet::Rfc4648 { padding: false }, b))?;

    let algo_str = match algorithm {
        2 => "SHA256".to_string(),
        3 => "SHA512".to_string(),
        _ => "SHA1".to_string(),
    };

    let digits_val: i32 = match digits {
        2 => 8,
        _ => 6,
    };

    let label = if issuer.is_empty() { name.clone() } else { name };
    let issuer_val = if issuer.is_empty() { label.clone() } else { issuer };

    Some((
        MigrationAccount {
            issuer: issuer_val,
            label,
            secret: secret_b32,
            algorithm: algo_str,
            digits: digits_val,
            period: 30,
        },
        otp_type,
    ))
}

fn account_label(acc: &MigrationAccount) -> String {
    if acc.issuer.is_empty() {
        acc.label.clone()
    } else {
        format!("{} - {}", acc.issuer, acc.label)
    }
}

pub fn parse_migration(data_b64: &str) -> Result<MigrationResult, String> {
    let cleaned = data_b64.trim();
    let decoded = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(cleaned)
        .or_else(|_| base64::engine::general_purpose::STANDARD_NO_PAD.decode(cleaned))
        .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(cleaned))
        .or_else(|_| base64::engine::general_purpose::STANDARD.decode(cleaned))
        .map_err(|e| format!("Gagal decode base64. Pastikan QR dari Google Authenticator.\nDetail: {}", e))?;

    let mut pos = 0;
    let mut accounts = Vec::new();
    let mut skipped = Vec::new();
    let mut batch_size: u64 = 1;
    let mut batch_index: u64 = 0;

    while pos < decoded.len() {
        let key = decode_varint(&decoded, &mut pos);
        let field_num = key >> 3;
        let wire_type = (key & 0x07) as u8;

        match (field_num, wire_type) {
            (1, 2) => {
                let len = decode_varint(&decoded, &mut pos) as usize;
                let sub_data = &decoded[pos..pos + len];
                if let Some((acc, otp_type)) = parse_otp_parameters(sub_data) {
                    if otp_type == 2 {
                        accounts.push(acc);
                    } else {
                        skipped.push(format!("{}: tipe HOTP belum didukung", account_label(&acc)));
                    }
                }
                pos += len;
            }
            (3, 0) => {
                batch_size = decode_varint(&decoded, &mut pos);
            }
            (4, 0) => {
                batch_index = decode_varint(&decoded, &mut pos);
            }
            _ => {
                skip_field(&decoded, &mut pos, wire_type);
            }
        }
    }

    if accounts.is_empty() && skipped.is_empty() {
        return Err("Tidak ada akun yang ditemukan dalam QR".to_string());
    }

    Ok(MigrationResult { accounts, skipped, batch_size, batch_index })
}

#[tauri::command]
pub fn parse_migration_qr(data_b64: String) -> Result<MigrationResult, String> {
    parse_migration(&data_b64)
}
