@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ==============================
REM Space Debris NASA Demo - Runner (Windows)
REM ==============================

REM 0) Mergi în folderul proiectului (locul unde e acest .bat)
cd /d "%~dp0"

set "PORT=8000"
set "VENV_PY=.venv\Scripts\python.exe"

echo [1/7] Caut Python instalat...

REM Încearcă 'python' din PATH
set "PYEXE="
for /f "delims=" %%I in ('where python 2^>nul') do (
  if not defined PYEXE set "PYEXE=%%I"
)

REM Dacă nu e, încearcă 'py' launcher
if not defined PYEXE (
  for /f "delims=" %%I in ('where py 2^>nul') do (
    if not defined PYEXE set "PYEXE=py -3"
  )
)

REM Dacă încă nu e, caută în locația implicită a utilizatorului
if not defined PYEXE (
  for /f "delims=" %%I in ('dir /b /s "%LocalAppData%\Programs\Python\Python3*\python.exe" 2^>nul') do (
    if not defined PYEXE set "PYEXE=%%I"
  )
)

if not defined PYEXE (
  echo [Eroare] Python 3.x nu a fost găsit in PATH sau in locatie implicita.
  echo - Instaleaza Python de la: https://www.python.org/downloads/windows/
  echo - Bifeaza "Add Python to PATH" la instalare.
  echo - Apoi re-ruleaza acest script.
  pause & exit /b 1
) else (
  echo     Găsit: %PYEXE%
)

echo.
echo [2/7] Creez mediul virtual (daca nu exista)...
if not exist "%VENV_PY%" (
  if "%PYEXE%"=="py -3" (
    %PYEXE% -m venv .venv
  ) else (
    "%PYEXE%" -m venv .venv
  )
  if %errorlevel% neq 0 (
    echo [Eroare] Crearea mediului virtual a esuat.
    echo Sugestie: ruleaza acest script dintr-o fereastra CMD (nu PowerShell) sau verifica permisiunile.
    pause & exit /b 1
  )
)

if not exist "%VENV_PY%" (
  echo [Eroare] Mediul virtual pare corupt (.venv\Scripts\python.exe lipseste).
  echo Sterge folderul .venv si re-ruleaza scriptul.
  pause & exit /b 1
)

echo.
echo [3/7] Upgrade pip in mediu si instalez dependintele...
"%VENV_PY%" -m pip install --upgrade pip
if %errorlevel% neq 0 (
  echo [Eroare] Upgrade pip a esuat.
  pause & exit /b 1
)

"%VENV_PY%" -m pip install -r server\requirements.txt
if %errorlevel% neq 0 (
  echo [Eroare] Instalarea dependintelor a esuat.
  echo Daca eroarea e legata de OpenCV/libGL, pe WSL/Ubuntu instalati:  sudo apt-get install -y libgl1
  pause & exit /b 1
)

echo.
echo [4/7] Setez NASA_API_KEY (pentru NASA DONKI)...
if "%NASA_API_KEY%"=="" (
  set /p NASA_API_KEY=Introdu NASA API key (Enter pentru DEMO_KEY): 
  if "%NASA_API_KEY%"=="" set "NASA_API_KEY=DEMO_KEY"
)
echo     NASA_API_KEY=%NASA_API_KEY%

echo.
echo [5/7] Verific resursele aplicatiei...
if not exist "client\index.html" (
  echo [Eroare] Lipseste client\index.html. Ruleaza scriptul din radacina proiectului space-debris-nasa-demo.
  pause & exit /b 1
)
if not exist "server\main.py" (
  echo [Eroare] Lipseste server\main.py. Ruleaza scriptul din radacina proiectului space-debris-nasa-demo.
  pause & exit /b 1
)

echo.
echo [6/7] Deschid browserul la http://localhost:%PORT% ...
start "" "http://localhost:%PORT%/"

echo.
echo [7/7] Pornesc serverul FastAPI (Ctrl+C pentru oprire)...
REM folosim explicit python din .venv
set "UVICORN_CMD=%VENV_PY% -m uvicorn server.main:app --host 0.0.0.0 --port %PORT%"
echo     %UVICORN_CMD%
%UVICORN_CMD%

echo.
echo Server oprit.
pause
endlocal