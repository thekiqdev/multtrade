@echo off
echo Configurando ambiente virtual do backend...
python -m venv venv
if errorlevel 1 (
    echo Python nao encontrado. Tente usar: py -m venv venv
    py -m venv venv
)
echo Ativando ambiente virtual...
call venv\Scripts\activate.bat
echo Instalando dependencias...
pip install -r requirements.txt
echo.
echo Configuracao concluida!
echo.
echo IMPORTANTE: Edite o arquivo .env com suas credenciais antes de usar!
echo.
echo Para iniciar o servidor:
echo   venv\Scripts\activate
echo   uvicorn main:app --reload
pause

