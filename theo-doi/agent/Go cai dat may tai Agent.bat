@echo off
chcp 65001 >nul
title MMH - Go may tai file can Agent
set "DEST=%LOCALAPPDATA%\MMH_Agent"
if exist "%DEST%" echo stop> "%DEST%\STOP"
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MMH tai ho so Agent.vbs" 2>nul
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*agent_worker.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul
echo Da dung va go may tai file can Agent. File tam da xoa; cau hinh + nhat ky con o %DEST% ^(xoa tay neu muon^).
pause
