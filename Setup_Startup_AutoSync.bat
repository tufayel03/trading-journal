@echo off
title HyperTrade PRO - Setup PC Startup Auto-Sync
color 0A
echo ====================================================================
echo      HYPERTRADE PRO - AUTOMATIC PC STARTUP SYNC INSTALLER
echo ====================================================================
echo.
echo  This tool configures your Windows PC to automatically sync ALL your
echo  MetaTrader 5 accounts (The5ers, Exness #104675892, #160096169 Cent,
echo  #276133463, etc.) silently in the background when you turn on your PC.
echo.

cd /d "%~dp0"
python scripts\install_startup.py

echo.
pause
