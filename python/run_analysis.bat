@echo off
chcp 65001 >nul
cd /d "%~dp0"
if "%~1"=="" (
  echo Перетащите один или несколько видеофайлов на этот файл.
  pause
  exit /b
)
python spermcasa.py %* -o "%~dp1SpermCASA_results"
start "" "%~dp1SpermCASA_results\report.html"
pause
