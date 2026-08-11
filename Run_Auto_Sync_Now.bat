@echo off
title HyperTrade PRO - Instant Multi-Account MT5 Sync
color 0B
echo ====================================================================
echo      HYPERTRADE PRO - INSTANT MULTI-ACCOUNT MT5 SYNC
echo ====================================================================
echo.
echo [*] Connecting to all MT5 terminals and syncing all accounts...
echo.

cd /d "%~dp0"
python scripts\sync_mt5_account.py

echo.
pause
