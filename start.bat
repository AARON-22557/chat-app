@echo off
chcp 65001 > nul
title MicroOS PC - Servidor con Auto-Reinicio
color 0B

echo ========================================================
echo       💻 MicroOS PC - Servidor de Chat ^& Bots
echo ========================================================
echo.

:: 1. Comprobar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/ para continuar.
    pause
    exit /b 1
)

:: 2. Instalar dependencias si no existen
if not exist "node_modules\" (
    echo [INFO] Primera ejecucion detectada. Instalando dependencias necesarias...
    call npm install ws express
    echo.
)

:: 3. Abrir la aplicacion en el navegador tras 1.5 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: 4. Bucle Vigilante de Auto-Reinicio (Watchdog)
echo [INFO] Iniciando servidor con vigilancia y auto-reinicio...
echo Presiona Ctrl+C en cualquier momento para detener el servidor.
echo.

:WATCHDOG_LOOP
echo --------------------------------------------------------
echo [%time%] Iniciando node server.js...
echo --------------------------------------------------------
node server.js

echo.
echo [AVISO] El servidor se ha detenido o ha caido a las %time%.
echo [AUTO-RECUPERACION] Reiniciando servidor automaticamente en 2 segundos...
timeout /t 2 /nobreak >nul
goto WATCHDOG_LOOP
