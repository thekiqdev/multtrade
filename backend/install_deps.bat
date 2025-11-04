@echo off
echo Instalando dependencias do backend...
echo.

call venv\Scripts\activate.bat

echo Atualizando pip...
python -m pip install --upgrade pip

echo.
echo Instalando dependencias principais (sem ckzg)...
pip install fastapi uvicorn[standard] python-dotenv pydantic

echo.
echo Instalando hyperliquid-python-sdk...
pip install hyperliquid-python-sdk==0.20.0

echo.
echo Instalando eth-account (versao antiga sem ckzg)...
pip install eth-account==0.8.0

echo.
echo Verificando instalacao...
pip list | findstr "fastapi uvicorn hyperliquid eth-account"

echo.
echo ========================================
echo Instalacao concluida!
echo.
echo Se houver algum erro, tente:
echo   pip install eth-account==0.7.0
echo.
echo Para iniciar o servidor:
echo   venv\Scripts\activate
echo   uvicorn main:app --reload
echo ========================================
pause

