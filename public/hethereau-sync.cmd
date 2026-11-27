@echo off
rem Hethereau Ledger sync launcher.
rem Double-click it. Windows asks for admin rights, because only admins may read
rem network packets. It downloads the sync script from the site and runs it:
rem the same thing as the PowerShell command on the Import page.
rem Source: https://github.com/SaigeNick/hethereau-ledger
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
set "HLPS=%TEMP%\hethereau-sync.ps1"
powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://hethereau-ledger.pages.dev/sync.ps1' -OutFile $env:HLPS"
if not exist "%HLPS%" (
    echo Could not download the sync script. Check your internet connection.
    pause
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%HLPS%"
del "%HLPS%" >nul 2>&1
echo.
pause
