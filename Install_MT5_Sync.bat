@echo off
title HyperTrade PRO MT5 Trade Journal Auto-Sync Installer
color 0A
echo ====================================================================
echo      HYPERTRADE PRO MT5 TRADE JOURNAL AUTO-SYNC INSTALLER v3.0
echo ====================================================================
echo.

set APPDATA_META=%APPDATA%\MetaQuotes\Terminal
set SCRIPT_DIR=%~dp0

if not exist "%APPDATA_META%" (
    echo [!] MetaQuotes Terminal directory not found in %%APPDATA%%.
    echo     Please make sure MT5 has been launched at least once.
    echo.
    pause
    exit /b
)

echo [*] Scanning for installed MetaTrader 5 instances...
echo.

set COUNT=0
set METAEDITOR="C:\Program Files\MetaTrader 5\metaeditor64.exe"
if not exist %METAEDITOR% (
    set METAEDITOR="C:\Program Files\MetaTrader 5 EXNESS\metaeditor64.exe"
)

for /D %%D in ("%APPDATA_META%\*") do (
    if exist "%%D\MQL5\Experts" (
        echo [+] Installing JournalSync.mq5 into MT5 instance: %%~nxD
        copy /Y "%SCRIPT_DIR%MQL5\JournalSync.mq5" "%%D\MQL5\Experts\JournalSync.mq5" >nul
        if exist %METAEDITOR% (
            echo [*] Compiling JournalSync.mq5 with MetaEditor...
            %METAEDITOR% /compile:"%%D\MQL5\Experts\JournalSync.mq5" /log:"%SCRIPT_DIR%compile.log" >nul 2>&1
        )
        set /a COUNT+=1
    )
)

echo.
echo ====================================================================
echo  [SUCCESS] JournalSync successfully installed and compiled in %COUNT% terminals!
echo ====================================================================
echo.
echo  NEXT EASY 3 STEPS IN MT5:
echo  1. In MT5 toolbar, click the "Algo Trading" button to turn it ON (Green).
echo  2. Go to Tools -^> Options -^> Expert Advisors (Ctrl + O):
echo     - Check "Allow WebRequest for listed URL"
echo     - Add: http://127.0.0.1:3000 and http://localhost:3000
echo  3. In MT5 Navigator panel (left side):
echo     - Expand "Expert Advisors"
echo     - Drag "JournalSync" onto any chart (e.g. XAUUSD).
echo.
echo  All historical closed trades and new live trades will automatically sync!
echo.
pause
