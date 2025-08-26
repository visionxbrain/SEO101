@echo off
echo Starting SEO101 Backend Server for Windows...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Install requirements if needed
echo Installing/updating dependencies...
pip install -q fastapi uvicorn requests beautifulsoup4 pydantic

REM Clear any existing port usage
echo Checking port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing existing process on port 8000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

REM Start the server
echo.
echo ========================================
echo Server starting on http://localhost:8000
echo Press Ctrl+C to stop the server
echo ========================================
echo.

python app.py

pause