@echo off
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
echo Starting AuthKeeper...
npm run tauri dev
