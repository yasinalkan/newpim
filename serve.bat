@echo off
REM Simple HTTP Server for PIM Application (Windows)
REM No npm required - just run this script after building

set PORT=3000
set DIRECTORY=dist

REM Check if dist directory exists
if not exist "%DIRECTORY%" (
    echo Error: '%DIRECTORY%' directory not found!
    echo Please run 'npm run build' first to create the production build.
    pause
    exit /b 1
)

echo ============================================================
echo   PIM Application Server Running
echo ============================================================
echo   URL: http://localhost:%PORT%
echo   Serving from: ./%DIRECTORY%
echo   Press Ctrl+C to stop
echo ============================================================
echo.

REM Start Python HTTP server
python -m http.server %PORT% --directory %DIRECTORY%

pause
