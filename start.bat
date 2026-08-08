@echo off
cd /d "%~dp0"

echo.
echo  ============================================
echo   Activity Match - Development Server
echo  ============================================
echo.
echo  This is a React app (Vite), NOT a PHP/XAMPP site.
echo.
echo  After the server starts, open:
echo    http://localhost:5173
echo.
echo  Do NOT use: http://localhost/Activity-Match
echo.
echo  Keep this window open while using the app.
echo  Press Ctrl+C to stop the server.
echo.
echo  ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Download from https://nodejs.org/ ^(LTS version^)
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

call npm run dev

echo.
echo Server stopped.
pause
