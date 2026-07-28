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
- Signing key sudah digenerate, public key di `tauri.conf.json`
- Installer v1.0.0 sudah di-sign
- `update.json` sudah diisi signature dan URL download
- **File:** `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `update.json`

## Persiapan Distribusi

### Build
```bash
cd authkeeper
$env:TAURI_SIGNING_PRIVATE_KEY = "<private key>"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "AuthKeeper2026!"
npx tauri build
```

### Cara Rilis Baru (v1.0.1, v1.0.2, ...)
1. Update versi di `src-tauri/tauri.conf.json` dan `update.json`
2. Build dengan perintah di atas
3. Buka GitHub → Releases → Create new release
4. Upload installer `.exe` (dari `src-tauri/target/release/bundle/nsis/`)
5. Generate signature:
   ```
   npx tauri signer sign -f <path_ke_private_key> <path_ke_installer>
   ```
6. Salin signature ke `update.json`
7. Commit & push `update.json`

### Status Rilis v1.0.0
- ✅ Kode sudah di-push ke GitHub
- ✅ Installer sudah di-sign
- ✅ `update.json` sudah diisi
- ✅ Release v1.0.0 sudah dipublish dengan tag `V1.0.0` (V besar)
- ✅ `update.json` sudah diperbaiki dengan URL yang benar
- ✅ Download installer: `https://github.com/Mukhamadirfan1997/AuthKeeper/releases/download/V1.0.0/AuthKeeper_1.0.0_x64-setup.exe`

**Untuk rilis berikutnya, gunakan tag format `V<version>` (V besar), contoh: `V1.0.1`**

### Code Signing (Windows SmartScreen)
Tanpa sertifikat signing, Windows akan menampilkan peringatan "Unknown Publisher". Untuk menghilangkannya:
- Beli sertifikat dari DigiCert/Sectigo (~$200-400/tahun)
- Sign file EXE setelah build

### Catatan Penting
- **Private key signing** disimpan di `C:\Users\yudhi\AppData\Local\Temp\opencode\authkeeper-signing-key.txt` — JANGAN HILANGKAN!
- Semua data user tersimpan lokal di `%APPDATA%\com.authkeeper.desktop\authkeeper.db`
- Bundle identifier baru (`com.authkeeper.desktop`) akan membuat folder data baru — data dari identifier lama tidak otomatis terbawa

---

*Sesi 27 Juli 2026 — AuthKeeper siap didistribusikan.*
