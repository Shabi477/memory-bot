@echo off
echo.
echo  ====================================
echo   Memory Bot - AI Chat Organiser
echo  ====================================
echo.
echo  Starting development server...
echo.

cd /d "%~dp0"

:: Kill any existing Node processes on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

:: Start the Next.js dev server
npm run dev

pause
