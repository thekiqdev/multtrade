#!/bin/bash

echo "Configurando ambiente virtual do backend..."

# Criar ambiente virtual
python3 -m venv venv || python -m venv venv

# Ativar ambiente virtual
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

echo ""
echo "Configuração concluída!"
echo ""
echo "IMPORTANTE: Edite o arquivo .env com suas credenciais antes de usar!"
echo ""
echo "Para iniciar o servidor:"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload"

