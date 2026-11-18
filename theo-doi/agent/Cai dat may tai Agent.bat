@echo off
chcp 65001 >nul
title MMH - Cai dat may tai file can Agent
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
echo Dang cai thu vien mo Chrome an ^(playwright^)...
%PY% -m pip install --quiet --disable-pip-version-check --upgrade playwright
set "DEST=%LOCALAPPDATA%\MMH_Agent"
if not exist "%DEST%" mkdir "%DEST%"
copy /y "agent_worker.py" "%DEST%\agent_worker.py" >nul
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
