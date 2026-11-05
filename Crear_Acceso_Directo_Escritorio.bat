@echo off
chcp 65001 > nul
title Crear Acceso Directo en el Escritorio

set "CURRENT_DIR=%~dp0"
set "TARGET_FILE=%CURRENT_DIR%Iniciar_MicroOS_Automatico.vbs"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\MicroOS Chat.lnk"

echo Creando acceso directo en tu Escritorio...

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%TARGET_FILE%\"'; $s.WorkingDirectory = '%CURRENT_DIR%'; $s.Description = 'MicroOS PC Chat App'; $s.IconLocation = 'shell32.dll,14'; $s.Save()"

echo.
echo ========================================================
echo   ✅ ¡Acceso directo creado con exito en tu Escritorio!
echo   Ya puedes abrir "MicroOS Chat" desde tu pantalla principal.
echo ========================================================
timeout /t 3 > nul
