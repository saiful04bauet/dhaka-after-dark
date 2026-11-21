@echo off
cd /d "%~dp0"
echo DHAKA AFTER DARK - Starting local game server...
start "" "http://localhost:8000"
py -3 -m http.server 8000
if errorlevel 1 python -m http.server 8000
pause