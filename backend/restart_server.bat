@echo off
echo Stopping all Python processes...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo Clearing Python cache...
del /s /q *.pyc 2>nul
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul

echo Waiting for ports to be released...
timeout /t 3 /nobreak >nul

echo Starting server with fresh environment...
set PYTHONDONTWRITEBYTECODE=1
set PYTHONUNBUFFERED=1
python run_server.py