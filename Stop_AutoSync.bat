@echo off
title HyperTrade PRO - Stop Auto-Sync Daemon
color 0E
echo ====================================================================
echo      HYPERTRADE PRO - STOP AUTO-SYNC DAEMON
echo ====================================================================
echo.

set SCRIPT_DIR=%~dp0
set PID_FILE=%SCRIPT_DIR%data\auto_sync_daemon.pid

if exist "%PID_FILE%" (
    set /p DAEMON_PID=<"%PID_FILE%"
    echo [*] Found running daemon PID: %DAEMON_PID%
    taskkill /PID %DAEMON_PID% /F >nul 2>&1
    del /f /q "%PID_FILE%" >nul 2>&1
    echo [+] Auto-sync daemon stopped successfully.
) else (
    echo [*] Stopping any running python auto_sync_daemon processes...
    powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*auto_sync_daemon*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
    echo [+] Background auto-sync processes stopped.
)

echo.
pause
