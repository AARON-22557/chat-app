@echo off
chcp 65001 > nul
title Activar Inicio con Windows
cd /d "%~dp0"

echo ========================================================
echo   🚀 MicroOS PC - Activar Inicio Automatico al Encender el PC
echo ========================================================
echo.
echo Creando inicio automatico en Windows...

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

:: Crear archivo de auto-arranque en la carpeta de inicio de Windows
(
echo @echo off
echo cd /d "%~dp0"
echo powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
echo timeout /t 2 /nobreak ^>nul
echo start http://localhost:3000
) > "%STARTUP_FOLDER%\MicroOS_AutoStart.bat"

echo.
echo ========================================================
echo   ✅ ¡LISTO! MicroOS Chat se iniciará automáticamente
echo   cada vez que enciendas tu ordenador.
echo ========================================================
echo.
pause
