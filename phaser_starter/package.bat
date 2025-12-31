@echo off
set STAGING=itch_dist
set ZIP_NAME=shattered_aegis_itch.zip

echo [1/5] Cleaning up...
if exist %STAGING% rmdir /s /q %STAGING%
if exist %ZIP_NAME% del /f /q %ZIP_NAME%

echo [2/5] Creating staging folder...
mkdir %STAGING%

echo [3/5] Copying core game files...
copy index.html %STAGING%\
copy favicon.ico %STAGING%\
copy *.js %STAGING%\
copy *.json %STAGING%\

echo [4/5] Copying assets...
xcopy assets %STAGING%\assets /E /I /H /Y

echo [5/5] Creating zip...
tar -c -a -f %ZIP_NAME% -C %STAGING% .

echo Done!
dir %ZIP_NAME%
