# Mult-Trade

Sistema de trading automatizado integrado com Hyperliquid, oferecendo interface web moderna para execução de ordens de mercado e limite.

## 🚀 Funcionalidades

- **Trading em Tempo Real**: Interface moderna para executar ordens de compra/venda
- **Integração Hyperliquid**: Conectado à API Hyperliquid (testnet/production)
- **Preços em Tempo Real**: 
  - REST API com atualização a cada 1.5 segundos
  - WebSocket para atualizações instantâneas
  - Cache centralizado para performance otimizada
- **Tipos de Ordem**: Market e Limit orders
- **Gerenciamento de Risco**: 
  - Take Profit e Stop Loss
  - Cálculo automático de margem e liquidação
  - Controle de leverage (1x a 50x)
- **Settings Configuráveis**: Escolha entre REST API ou WebSocket para preços
- **Logs Detalhados**: Histórico completo de todas as operações

## 📋 Pré-requisitos

- Python 3.8+
- Node.js 16+
- npm ou yarn
- Conta Hyperliquid (testnet ou production)

## 🛠️ Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/thekiqdev/multtrade.git
cd multtrade
```

### 2. Backend Setup

```bash
cd backend

# Windows
setup.bat

# Linux/Mac
chmod +x setup.sh
./setup.sh
```

### 3. Configurar Credenciais

Crie um arquivo `.env` na pasta `backend/`:

```env
ACCOUNT_ADDRESS=sua_wallet_address
SECRET_KEY=sua_private_key
```

**⚠️ IMPORTANTE**: Nunca commite o arquivo `.env` no repositório!

### 4. Frontend Setup

```bash
cd frontend
npm install
```

## 🚀 Executando

### Iniciar Tudo (Backend + Frontend)

```bash
# Windows
start.bat

# Ou manualmente:
# Terminal 1 - Backend
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Acessar a Aplicação

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📁 Estrutura do Projeto

```
multtrade/
├── backend/
│   ├── main.py              # API FastAPI principal
│   ├── requirements.txt     # Dependências Python
│   ├── setup.bat/sh        # Scripts de instalação
│   └── logs/               # Logs de ordens
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Componente principal
│   │   ├── Settings.jsx    # Página de configurações
│   │   └── Logs.jsx        # Visualização de logs
│   └── package.json        # Dependências Node
└── README.md
```

## 🎯 Uso

1. **Configurar Preços**: Acesse Settings (#settings) para escolher entre REST API ou WebSocket
2. **Selecionar Ativo**: Escolha BTC, ETH ou SOL
3. **Definir Parâmetros**: 
   - Quantidade em USD
   - Tipo de ordem (Market/Limit)
   - Take Profit e Stop Loss (opcional)
   - Leverage
4. **Executar Ordem**: Clique em Buy ou Sell

## 🔧 API Endpoints

- `GET /api/market/{symbol}` - Dados de mercado
- `GET /api/cache/prices` - Preços do cache
- `GET /api/cache/prices/{symbol}` - Preço específico do cache
- `POST /api/order` - Enviar ordem
- `GET /api/config` - Configuração atual
- `POST /api/config` - Atualizar configuração
- `GET /api/logs` - Histórico de logs
- `WebSocket /ws/price` - Preços em tempo real

## 📝 Documentação Adicional

- [Guia de Instalação Completa](backend/INSTALACAO_COMPLETA.md)
- [Configuração de Credenciais](backend/CREDENCIAIS_HYPERLIQUID.md)
- [Guia de API e Wallet](backend/API_WALLET_GUIDE.md)

## ⚠️ Avisos

- Este projeto está configurado para **testnet** por padrão
- Para produção, altere `BASE_URL` em `backend/main.py`
- Sempre teste em testnet antes de usar em produção
- Mantenha suas credenciais seguras e nunca as exponha

## 📄 Licença

Este projeto é open source.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## 📧 Contato

Repositório: https://github.com/thekiqdev/multtrade
