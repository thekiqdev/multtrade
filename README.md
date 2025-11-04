# Hyperliquid Trade Test

Projeto simples de teste para enviar ordens na Hyperliquid Testnet.

## Estrutura do Projeto

```
.
├── backend/          # API FastAPI
├── frontend/         # Interface React + Tailwind
└── README.md
```

## Pré-requisitos

- Python 3.8+
- Node.js 18+
- npm ou yarn

## Configuração

### Backend

**Opção 1: Script Automático (Recomendado)**

No Windows, execute:
```bash
cd backend
setup.bat
```

No Linux/Mac, execute:
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

**Opção 2: Configuração Manual**

1. Navegue até a pasta `backend`:
   ```bash
   cd backend
   ```

2. Crie e ative um ambiente virtual:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure as variáveis de ambiente:
   - O arquivo `.env` já foi criado a partir do `env.example`
   - **IMPORTANTE**: Edite o arquivo `.env` e adicione suas credenciais reais:
     ```
     ACCOUNT_ADDRESS=0xSEU_ENDERECO
     SECRET_KEY=SUA_CHAVE_PRIVADA
     ```

5. Inicie o servidor:
   ```bash
   uvicorn main:app --reload
   ```
   
   O servidor estará rodando em `http://localhost:8000`

### Frontend

1. Navegue até a pasta `frontend`:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   
   O frontend estará rodando em `http://localhost:5173`

## Uso

1. Certifique-se de que ambos os servidores estão rodando (backend e frontend)

2. Acesse `http://localhost:5173` no navegador

3. Preencha o formulário:
   - **Par**: Símbolo do ativo (ex: BTC, ETH)
   - **Preço**: Preço da ordem (para ordens limit)
   - **Quantidade**: Quantidade a comprar/vender
   - **Tipo de Ordem**: Limit ou Market
   - **Lado**: Compra (Buy) ou Venda (Sell)

4. Clique em "Enviar Ordem"

5. O resultado será exibido na tela (sucesso ou erro)

## Funcionalidades

- ✅ Interface web moderna com Tailwind CSS
- ✅ Formulário para criar ordens Limit e Market
- ✅ Integração com Hyperliquid Testnet
- ✅ Feedback visual de sucesso/erro
- ✅ CORS configurado para comunicação frontend/backend

## Notas

- Este projeto utiliza a **Hyperliquid Testnet** para testes
- Nunca compartilhe suas chaves privadas
- O arquivo `.env` está no `.gitignore` e não será versionado
- Certifique-se de ter fundos na testnet antes de enviar ordens

## Tecnologias

- **Backend**: FastAPI, hyperliquid-python-sdk, python-dotenv
- **Frontend**: React, Vite, Tailwind CSS, Axios

