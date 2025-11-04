@echo off
echo Parando servidores...

REM Parar processos Python/Uvicorn (Backend)
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM uvicorn.exe /T >nul 2>&1

REM Parar processos Node (Frontend)
taskkill /F /IM node.exe /T >nul 2>&1

echo Servidores parados!
timeout /t 2 /nobreak >nul

