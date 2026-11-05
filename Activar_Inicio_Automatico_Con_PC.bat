@echo off
chcp 65001 > nul
title Activar Inicio Automatico con Windows

echo ========================================================
echo   🚀 MicroOS PC - Activar Inicio Automatico con Windows
echo ========================================================
echo.
echo Configurando para que el servidor de chat se inicie solo
echo cada vez que enciendas tu ordenador...
echo.

python "%~dp0MicroOS_Chat.pyw" --autostart

echo.
echo ========================================================
echo   ✅ ¡Listo! Inicio automatico configurado con exito.
echo   La proxima vez que prendas tu PC, el chat estara
echo   encendido y funcionando solo en segundo plano.
echo ========================================================
timeout /t 5 > nul
