@echo off
setlocal
cd /d "%~dp0backend"
if not exist .env (
  echo [ERROR] backend\.env is missing.
  echo Copy backend\.env.example to backend\.env and set DATABASE_URL and JWT_SECRET.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  pause
  exit /b 1
)
echo Starting IdeaHub at http://localhost:5000 ...
node server.js
pause
