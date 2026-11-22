@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Pasang dulu dari https://nodejs.org lalu klik file ini lagi.
  pause
  exit /b 1
)

node login.mjs
pause
