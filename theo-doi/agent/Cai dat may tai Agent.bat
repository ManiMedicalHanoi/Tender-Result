@echo off
chcp 65001 >nul
title MMH - Cai dat may tai ho so can Agent (v2.0)
cd /d "%~dp0"
echo ============================================================
echo  MMH - May tu tai file "can Agent" (Theo doi goi thau)
echo  Can: may tinh da cai VNeGP Client Agent cua muasamcong.
echo ============================================================
set "PY="
py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY python -c "import sys" >nul 2>nul && set "PY=python"
if not defined PY (
  echo Chua co Python - dang cai tu dong bang winget, vui long cho...
  winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements
  if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY="%LOCALAPPDATA%\Programs\Python\Python312\python.exe""
)
if not defined PY (
  echo Khong cai duoc Python. Tai Python tai https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^) roi chay lai file nay.
  pause & exit /b 1
)
echo Dang cai thu vien trinh duyet an ^(playwright + Chromium rieng, khong dung Chrome cua ban^)...
%PY% -m pip install --quiet --disable-pip-version-check --upgrade playwright
%PY% -m playwright install chromium
set "DEST=%LOCALAPPDATA%\MMH_Agent"
if not exist "%DEST%" mkdir "%DEST%"
rem dung ban cu dang chay (neu co) truoc khi chep ban moi
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*agent_worker.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul
copy /y "agent_worker.py" "%DEST%\agent_worker.py" >nul
copy /y "tai_nhanh.py" "%DEST%\tai_nhanh.py" >nul
if exist "%DEST%\STOP" del "%DEST%\STOP"
%PY% "%DEST%\agent_worker.py" --setup
if errorlevel 1 ( echo. & echo Chua cai dat xong - xem thong bao o tren. & pause & exit /b 1 )
%PY% -c "import sys,os;p=os.path.join(os.path.dirname(sys.executable),'pythonw.exe');print(p if os.path.exists(p) else sys.executable)" > "%DEST%\pyw.txt"
set /p PYW=<"%DEST%\pyw.txt"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
> "%STARTUP%\MMH tai ho so Agent.vbs" echo CreateObject("WScript.Shell").Run """%PYW%"" ""%DEST%\agent_worker.py""", 0, False
start "" "%PYW%" "%DEST%\agent_worker.py"
echo.
echo XONG. May se tu chay ngam moi khi mo may tinh ^(khong hien cua so^).
echo  - Nhat ky: %DEST%\log.txt
echo  - Go cai dat: chay "Go cai dat may tai Agent.bat"
echo Nho de VNeGP Client Agent tu chay khi mo may.
pause
