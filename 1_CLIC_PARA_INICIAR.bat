@echo off
chcp 65001 > nul
title MicroOS PC Chat

:: Cambiar al directorio del script
cd /d "%~dp0"

:: 1. Si existe pythonw, arrancarlo de forma 100% silenciosa
where pythonw >nul 2>nul
if %errorlevel% equ 0 (
    start "" pythonw "%~dp0MicroOS_Chat.pyw"
    exit /b 0
)

:: 2. Si existe python, arrancarlo
where python >nul 2>nul
if %errorlevel% equ 0 (
    start "" python "%~dp0iniciar_app.py"
    exit /b 0
)

:: 3. Si no hay Python, usar Node.js directamente de forma invisible
where node >nul 2>nul
if %errorlevel% equ 0 (
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
    timeout /t 2 /nobreak >nul
    start http://localhost:3000
    exit /b 0
)

echo [ERROR] No se encontro ni Python ni Node.js instalado en el sistema.
echo Por favor instala Node.js o Python para ejecutar la app.
pause
