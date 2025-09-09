@echo off
echo 유비온 디지털교육센터 대시보드 시작 중...
echo.

REM 현재 디렉토리로 이동
cd /d "%~dp0"

REM Python이 설치되어 있는지 확인
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python이 설치되어 있지 않습니다.
    echo Python을 설치한 후 다시 실행해주세요.
    pause
    exit /b 1
)

REM 포트 8000이 사용 중인지 확인
netstat -an | find "8000" >nul 2>&1
if %errorlevel% equ 0 (
    echo 포트 8000이 이미 사용 중입니다.
    echo 다른 포트를 사용합니다...
    python -m http.server 8001
) else (
    echo 포트 8000에서 서버를 시작합니다...
    python -m http.server 8000
)

echo.
echo 대시보드가 시작되었습니다!
echo 브라우저에서 http://localhost:8000 또는 http://localhost:8001 에 접속하세요.
echo.
echo 종료하려면 Ctrl+C를 누르세요.
pause
