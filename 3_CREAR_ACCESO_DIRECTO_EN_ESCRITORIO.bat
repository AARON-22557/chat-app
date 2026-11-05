@echo off
chcp 65001 > nul
title Crear Icono en Escritorio
cd /d "%~dp0"

echo Creando acceso directo en tu Escritorio...

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut((Join-Path $desktop 'MicroOS Chat.lnk')); $s.TargetPath = '%~dp01_CLIC_PARA_INICIAR.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,14'; $s.Description = 'MicroOS PC Chat App'; $s.Save()"

echo.
echo ========================================================
echo   ✅ ¡Icono creado con exito en tu Escritorio!
echo   Ya puedes abrir "MicroOS Chat" desde tu pantalla principal.
echo ========================================================
echo.
pause
