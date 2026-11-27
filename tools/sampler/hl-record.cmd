@echo off
rem Hethereau Ledger sample recorder. Double-click this file.
rem Windows asks for admin rights because reading network packets needs them.
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0hl-record.ps1"
echo.
pause
