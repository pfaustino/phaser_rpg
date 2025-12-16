@echo off
echo Starting local web server for Phaser game...
echo.
echo The game will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

REM Try Python 3 first (most common)
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python http.server...
    python -m http.server 8000
    goto :end
)

REM Try Python 2
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python 2 SimpleHTTPServer...
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM Try Node.js http-server
where npx >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server...
    npx --yes http-server -p 8000
    goto :end
)

REM If nothing works, show error
echo.
echo ERROR: No web server found!
echo.
echo Please install one of the following:
echo   1. Python 3: https://www.python.org/downloads/
echo   2. Node.js: https://nodejs.org/
echo.
echo Or use VS Code's "Live Server" extension
echo.
pause

:end














