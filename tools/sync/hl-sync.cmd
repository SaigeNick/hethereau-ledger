@echo off
rem Hethereau Ledger sync. Double-click; Windows asks for admin rights
rem because reading network packets needs them.
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync.ps1"
echo.
pause
