@echo off
echo ========================================
echo Iniciando Hyperliquid Trade Test
echo ========================================
echo.

REM Verificar se as pastas existem
if not exist "backend" (
    echo ERRO: Pasta backend nao encontrada!
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERRO: Pasta frontend nao encontrada!
    pause
    exit /b 1
)

echo Iniciando Backend...
start "Hyperliquid Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload"

echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo Iniciando Frontend...
start "Hyperliquid Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Servidores iniciados!
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Pressione qualquer tecla para fechar esta janela...
echo (Os servidores continuarao rodando nas janelas abertas)
echo ========================================
pause >nul

