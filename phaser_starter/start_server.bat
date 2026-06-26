@echo off
cd /d %~dp0..
echo Starting Shattered Aegis local server...
echo.
echo Game: http://localhost:5184/phaser_starter/
echo (or run from repo root: gdev phaser_rpg)
echo Press Ctrl+C to stop
echo.
python -m http.server 5184
