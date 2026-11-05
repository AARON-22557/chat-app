@echo off
chcp 65001 > nul
title MicroOS PC - Detener Servidor
color 0C

echo ========================================================
echo       🛑 MicroOS PC - Detener Servidor
echo ========================================================
echo.

echo Buscando procesos de Node.js en ejecucion en el puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Deteniendo proceso con PID %%a...
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo [OK] El servidor MicroOS PC ha sido detenido correctamente.
timeout /t 3 >nul
