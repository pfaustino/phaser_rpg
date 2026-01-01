@echo off
REM ============================================
REM Deploy to itch.io using Butler
REM ============================================
REM Butler must be installed and authenticated first.
REM Download: https://itch.io/docs/butler/
REM Run "butler login" once to authenticate.
REM ============================================

set ITCH_USER=pfaustino
set ITCH_GAME=rpg-adventure-shattered-aegis
set CHANNEL=html5

echo ============================================
echo   Deploying to itch.io
echo   Target: %ITCH_USER%/%ITCH_GAME%:%CHANNEL%
echo ============================================

REM Check if butler is available
where butler >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Butler is not installed or not in PATH.
    echo.
    echo Please download Butler from:
    echo   https://itch.io/docs/butler/
    echo.
    echo After installing, run "butler login" to authenticate.
    pause
    exit /b 1
)

REM Create staging directory
set STAGE_DIR=itch_deploy_temp
if exist %STAGE_DIR% rmdir /s /q %STAGE_DIR%
mkdir %STAGE_DIR%

echo [1/4] Copying HTML...
copy index.html %STAGE_DIR%\ >nul
copy favicon.ico %STAGE_DIR%\ >nul 2>nul

echo [2/4] Copying JavaScript...
copy *.js %STAGE_DIR%\ >nul

echo [3/4] Copying JSON data...
copy *.json %STAGE_DIR%\ >nul

echo [4/4] Copying assets...
xcopy assets %STAGE_DIR%\assets\ /E /I /Q >nul

echo.
echo Pushing to itch.io...
butler push %STAGE_DIR% %ITCH_USER%/%ITCH_GAME%:%CHANNEL%

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================
    echo   SUCCESS! Game deployed to itch.io
    echo   https://%ITCH_USER%.itch.io/%ITCH_GAME%
    echo ============================================
) else (
    echo.
    echo ERROR: Butler push failed. Check the output above.
)

REM Cleanup
rmdir /s /q %STAGE_DIR%

pause
