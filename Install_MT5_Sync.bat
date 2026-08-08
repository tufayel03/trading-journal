@echo off
title Exness MT5 / MT4 Journal Auto-Sync One-Click Installer
color 0A
echo ====================================================================
echo      EXNESS MT5 / MT4 AUTOMATED TRADE JOURNAL SYNC INSTALLER
echo ====================================================================
echo.

set APPDATA_META=%APPDATA%\MetaQuotes\Terminal
set SCRIPT_DIR=%~dp0

if not exist "%APPDATA_META%" (
    echo [!] MetaQuotes Terminal directory not found in %%APPDATA%%.
    echo     Please make sure MT5 / MT4 has been launched at least once.
    echo.
    pause
    exit /b
)

echo [*] Scanning for installed MetaTrader 5 and MetaTrader 4 instances...
echo.

set COUNT=0

for /D %%D in ("%APPDATA_META%\*") do (
    if exist "%%D\MQL5\Experts" (
        echo [+] Installing JournalSync.mq5 into MT5 instance: %%~nxD
        copy /Y "%SCRIPT_DIR%MQL5\JournalSync.mq5" "%%D\MQL5\Experts\JournalSync.mq5" >nul
        set /a COUNT+=1
    )
    if exist "%%D\MQL4\Experts" (
        echo [+] Installing JournalSync.mq4 into MT4 instance: %%~nxD
        copy /Y "%SCRIPT_DIR%MQL4\JournalSync.mq4" "%%D\MQL4\Experts\JournalSync.mq4" >nul
        set /a COUNT+=1
    )
)

echo.
echo ====================================================================
echo  [SUCCESS] JournalSync successfully installed into %COUNT% terminals!
echo ====================================================================
echo.
echo  NEXT EASY STEPS:
echo  1. Open your Exness MT5 (or MT4).
echo  2. Go to Tools -> Options -> Expert Advisors (Ctrl + O).
echo  3. Check "Allow WebRequest for listed URL".
echo  4. Add: http://127.0.0.1:3000 and http://localhost:3000
echo  5. In Navigator panel, drag "JournalSync" onto any chart (e.g. XAUUSD).
echo.
echo  Every closed trade will now automatically sync directly to your journal!
echo.
pause
