@echo off
echo Stopping FastAPI server...

REM Kill all Python processes
taskkill /F /IM python.exe 2>nul

REM Wait for processes to terminate
timeout /t 2 /nobreak >nul

REM Check if port 8000 is still in use
netstat -ano | findstr :8000 >nul
if %errorlevel%==0 (
    echo Port 8000 is still in use, forcing cleanup...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
        taskkill /F /PID %%a 2>nul
    )
)

echo Server stopped successfully.
pause