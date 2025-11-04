@echo off
echo Configurando frontend...
echo.

echo Verificando Node.js...
node --version
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale Node.js de https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Instalando dependencias...
call npm install

echo.
echo ========================================
echo Configuracao concluida!
echo.
echo Para iniciar o servidor de desenvolvimento:
echo   npm run dev
echo.
echo O frontend estara disponivel em:
echo   http://localhost:5173
echo.
echo IMPORTANTE: Certifique-se de que o backend
echo esta rodando em http://localhost:8000
echo ========================================
pause


