# AuthKeeper

Aplikasi Desktop Offline Manajemen TOTP — dibuat dengan Tauri 2.0 + React + TypeScript + Rust.

## Changelog Sesi

### [1.0.0] — 27 Juli 2026

#### Bug Fix: Kode OTP Tidak Valid
- **Penyebab 1:** Fungsi `normalize_secret` di `otp.rs` menambahkan karakter null di belakang secret < 16 byte
- **Penyebab 2:** `TOTP::new()` mewajibkan secret >= 16 byte, padahal RFC 6238 membolehkan lebih pendek
- **Perbaikan:** Hapus `normalize_secret`, ganti `TOTP::new()` → `new_unchecked()`, validasi digit 6/8
- **File:** `src-tauri/src/commands/otp.rs`

#### Bug Fix: Akun Dobel
- **Penyebab:** AES-256-GCM nonce acak → enkripsi secret selalu beda → deteksi duplikat gagal
- **Perbaikan:** Migration v5 — kolom `secret_hash` (SHA-256 deterministik), duplicate detection pakai hash, hapus duplikat otomatis
- **File:** `src-tauri/src/db/mod.rs`, `src-tauri/src/crypto/mod.rs`, `src-tauri/src/commands/account.rs`

#### Enhancement: Custom Icon
- Icon kustom: shield ungu + monogram "AK"
- **File:** `src-tauri/icons/`

#### Enhancement: Bundle Identifier
- Diubah dari `com.authkeeper.app` → `com.authkeeper.desktop` (menghilangkan warning macOS)
- **File:** `src-tauri/tauri.conf.json`

#### Bug Fix: Dashboard Timer
- Masalah: `setInterval(refreshOtps, 30000)` tidak selaras dengan epoch TOTP, menyebabkan kode telat ter-refresh
- Perbaikan: Timer awal diselaraskan ke period boundary menggunakan `setTimeout`, lalu `setInterval` 30s
- **File:** `src/pages/Dashboard.tsx`

#### Enhancement: Auto-Updater
- Ditambahkan `tauri-plugin-updater` untuk update otomatis
- Saat update tersedia, dialog akan muncul otomatis
- **File:** `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`

## Persiapan Distribusi

### Build
```bash
cd authkeeper
npm install
npm run tauri build
```

### Setup Auto-Updater

Repo: `https://github.com/Mukhamadirfan1997/AuthKeeper`

1. **Push kode ke GitHub** (pastikan `update.json` sudah di-commit di root repo)
2. **Setiap rilis baru:**
   ```bash
   # Set environment variable untuk signing
   $env:TAURI_SIGNING_PRIVATE_KEY = "<isi private key dari authkeeper-signing-key.txt>"
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "AuthKeeper2026!"
   
   # Build
   npx tauri build
   ```
3. **Upload file ke GitHub Release:**
   - `AuthKeeper_<version>_x64-setup.exe` (installer NSIS)
   - `AuthKeeper_<version>_x64-setup.exe.sig` (signature — generate dengan `npx tauri signer sign`)
4. **Update `update.json`** di repo dengan informasi rilis baru (version, signature, url)
5. **Push update.json** — aplikasi user akan otomatis mendeteksi update dari:
   ```
   https://raw.githubusercontent.com/Mukhamadirfan1997/AuthKeeper/main/update.json
   ```

### Code Signing (Windows SmartScreen)
Tanpa sertifikat signing, Windows akan menampilkan peringatan "Unknown Publisher". Untuk menghilangkannya:
- Beli sertifikat dari DigiCert/Sectigo (~$200-400/tahun)
- Sign file EXE setelah build

### Catatan Penting
- **Private key signing** disimpan di `C:\Users\yudhi\AppData\Local\Temp\opencode\authkeeper-signing-key.txt` — JANGAN HILANGKAN!
- Semua data user tersimpan lokal di `%APPDATA%\com.authkeeper.desktop\authkeeper.db`
- Bundle identifier baru (`com.authkeeper.desktop`) akan membuat folder data baru — data dari identifier lama tidak otomatis terbawa
