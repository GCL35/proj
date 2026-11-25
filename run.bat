@echo off
chcp 65001 > nul
title RMBG Background Removal App
echo ========================================================
echo   🚀 กำลังเริ่มต้น RMBG AI Background Removal Web App...
echo ========================================================
echo.

:: Check if virtual environment exists
if not exist "venv\Scripts\python.exe" (
    echo [INFO] ตรวจพบการรันครั้งแรก กำลังสร้าง Virtual Environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] ไม่พบ Python ในระบบ กรุณาติดตั้ง Python 3.10+ ก่อน
        pause
        exit /b 1
    )
    echo [INFO] กำลังติดตั้ง Dependencies จาก requirements.txt...
    .\venv\Scripts\python.exe -m pip install --upgrade pip
    .\venv\Scripts\pip.exe install -r requirements.txt
)

echo [INFO] กำลังเปิดเว็บเบราว์เซอร์ไปที่ http://127.0.0.1:5000 ...
start "" "http://127.0.0.1:5000"

echo [INFO] กำลังเริ่มเซิร์ฟเวอร์...
.\venv\Scripts\python.exe app.py

pause

