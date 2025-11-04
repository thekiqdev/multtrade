# 🚀 Como Iniciar o Projeto Completo

## Status ✅

- ✅ Backend configurado com todas as dependências
- ✅ Credenciais do testnet configuradas no `.env`
- ✅ Frontend configurado com todas as dependências

## Iniciar o Projeto

### Opção 1: Terminal Único (Recomendado para teste)

Você precisará abrir **2 terminais** separados:

#### Terminal 1 - Backend

```powershell
cd C:\CURSOR\Mult-Trade\backend
venv\Scripts\activate
uvicorn main:app --reload
```

Você deve ver:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

#### Terminal 2 - Frontend

```powershell
cd C:\CURSOR\Mult-Trade\frontend
npm run dev
```

Você deve ver:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Opção 2: Scripts Automáticos

**Backend:**
```powershell
cd backend
setup.bat
# Depois execute:
venv\Scripts\activate
uvicorn main:app --reload
```

**Frontend:**
```powershell
cd frontend
setup.bat
# Depois execute:
npm run dev
```

## Acessar a Aplicação

1. Abra seu navegador em: **http://localhost:5173**
2. Você verá o formulário de ordem da Hyperliquid
3. Preencha os campos:
   - **Par**: BTC (ou outro símbolo)
   - **Preço**: Ex: 30000
   - **Quantidade**: Ex: 0.01
   - **Tipo de Ordem**: Limit ou Market
   - **Lado**: Compra (Buy) ou Venda (Sell)
4. Clique em **"Enviar Ordem"**

## Verificar se está funcionando

### Backend
Acesse: http://localhost:8000
```json
{"message": "Hyperliquid Trade Test API"}
```

### Frontend
Acesse: http://localhost:5173
Você deve ver o formulário de ordem.

## Troubleshooting

### Backend não inicia
- Verifique se o ambiente virtual está ativado (`(venv)` no prompt)
- Verifique se o arquivo `.env` existe e contém as credenciais

### Frontend não inicia
- Verifique se o Node.js está instalado: `node --version`
- Tente reinstalar: `npm install`

### Erro de CORS
- Certifique-se de que o backend está rodando na porta 8000
- O CORS já está configurado no backend para aceitar requisições do frontend

### Erro ao enviar ordem
- Verifique se o backend está rodando
- Verifique se as credenciais no `.env` estão corretas
- Verifique se você tem fundos na testnet

## Estrutura Final

```
Mult-Trade/
├── backend/
│   ├── venv/           ✅ Ambiente virtual
│   ├── .env            ✅ Suas credenciais
│   ├── main.py         ✅ API FastAPI
│   └── requirements.txt ✅ Dependências instaladas
├── frontend/
│   ├── node_modules/   ✅ Dependências instaladas
│   ├── src/
│   │   └── App.jsx     ✅ Interface React
│   └── package.json    ✅ Dependências configuradas
└── README.md           ✅ Documentação
```

## Pronto para usar! 🎉

Tudo configurado e pronto para testar ordens na Hyperliquid Testnet!


