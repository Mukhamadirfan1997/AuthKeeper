# AuthKeeper

**Aplikasi Desktop Offline Manajemen TOTP, Password Vault & Secure Notes**

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-purple)
![License](https://img.shields.io/badge/license-MIT-green)

AuthKeeper adalah aplikasi desktop offline untuk menyimpan dan mengelola kode **TOTP** (Time-based One-Time Password), **Password Vault**, dan **Secure Notes** dengan enkripsi penuh. Semua data tetap aman di perangkat Anda — tidak ada koneksi internet yang dibutuhkan.

Built with **Tauri 2**, **React 19**, **TypeScript**, **Rust**, dan **Tailwind CSS 4**.

---

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **TOTP Authenticator** | Simpan secret key, generate kode 2FA otomatis |
| **Password Vault** | Simpan kata sandi akun/web dengan enkripsi AES-256-GCM |
| **Secure Notes** | Catatan terenkripsi untuk informasi sensitif |
| **Kategori** | Kelola akun dengan kategori (Sekolah, Email, Sistem, dll) |
| **PIN Protection** | Akses aplikasi dilindungi PIN |
| **Auto-Lock** | Terkunci otomatis saat idle |
| **Auto-Updater** | Update otomatis ketika versi baru tersedia |
| **Backup & Restore** | Ekspor/impor semua data (TOTP + vault + notes) |
| **Favorit** | Tandai akun favorit untuk akses cepat |
| **UI Bahasa Indonesia** | Antarmuka lengkap bahasa Indonesia |
| **Offline 100%** | Tidak ada data yang dikirim ke server |

---

## Instalasi

1. Download installer terbaru dari [Halaman Rilis](https://github.com/Mukhamadirfan1997/AuthKeeper/releases)
2. Jalankan `AuthKeeper_<version>_x64-setup.exe`
3. Atur PIN saat pertama kali membuka aplikasi

> **Catatan:** Karena belum ada sertifikat code signing, Windows mungkin menampilkan peringatan "Unknown Publisher". Klik **More info → Run anyway** untuk melanjutkan.

---

## Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 19, TypeScript 6, Tailwind CSS 4 |
| Backend | Rust, Tauri 2 |
| Database | SQLite (rusqlite) |
| Enkripsi | AES-256-GCM (ring crate) |
| OTP | TOTP RFC 6238 (totp-rs) |
| Bundling | NSIS, MSI |
| Updater | tauri-plugin-updater |
| Icons | Iconik (TOTP provider icons) |

---

## Development

### Prasyarat
- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) 1.80+
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### Menjalankan Dev Server
```bash
cd authkeeper
npm install
npx tauri dev
```

### Build Installer
```bash
npx tauri build
```

---

## Keamanan

- Secret TOTP, password vault, dan secure notes dienkripsi dengan **AES-256-GCM**
- Setiap enkripsi menggunakan **nonce acak** (12 byte) — ciphertext unik setiap kali
- Deteksi duplikat menggunakan **SHA-256 hash** deterministik
- PIN diverifikasi dengan **Argon2** (password hashing)
- Semua data tersimpan lokal di `%APPDATA%\com.authkeeper.desktop\authkeeper.db`

---

## Rilis Terbaru

### v1.2.0 (29 Juli 2026)
- **UI Modern:** Semua icon diganti Lucide SVG icons, shadow cards
- **Perbaikan:** Timer OTP period 60s, password generator pakai crypto.getRandomValues
- **Perbaikan:** Input PIN bisa pakai keyboard laptop, search notes by content
- **Baru:** Tombol hapus entry di Vault & Notes detail modal
- **Baru:** Modal kustom untuk import backup (ganti prompt/confirm browser)

### v1.1.0 (28 Juli 2026)
- **Baru:** Password Vault — simpan kata sandi terenkripsi
- **Baru:** Secure Notes — catatan sensitif terenkripsi
- **Baru:** Kategori — tag akun dengan kategori (Sekolah, Email, Sistem, Keuangan, Lainnya)
- **Baru:** Backup v2 — ekspor includes vault + notes
- **Baru:** UI Bahasa Indonesia di semua halaman
- **Perbaikan:** Sinkronisasi timer OTP & deteksi duplikat akun

### v1.0.0 (27 Juli 2026)
- Rilis perdana: TOTP Authenticator, PIN protection, auto-updater

---

## Lisensi

Distributed under the MIT License. See `LICENSE` for more information.

---

## Kontak

**Creator:** MUKHAMAD IRFAN — irfandev30@gmail.com

---

*© 2026 AuthKeeper — Semua data Anda tetap aman di perangkat Anda.*
