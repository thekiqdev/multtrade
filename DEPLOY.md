# Guia de Deploy no Vercel

## 🚀 Configuração do Frontend no Vercel

### 1. Preparação

O projeto já está configurado para deploy no Vercel. Certifique-se de que:

- ✅ O arquivo `frontend/vercel.json` existe
- ✅ O arquivo `frontend/src/config.js` existe
- ✅ O `package.json` tem o script `build` configurado

### 2. Deploy no Vercel

#### Opção A: Via Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Navegar para a pasta frontend
cd frontend

# Deploy
vercel

# Para produção
vercel --prod
```

#### Opção B: Via GitHub (Recomendado)

1. **Conectar Repositório**:
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Add New Project"
   - Conecte o repositório `thekiqdev/multtrade`

2. **Configurações do Projeto**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Variáveis de Ambiente**:
   Adicione as seguintes variáveis no painel do Vercel:
   ```
   VITE_API_URL=https://seu-backend-url.com
   VITE_WS_URL=wss://seu-backend-url.com
   ```

### 3. Configuração do Backend

⚠️ **IMPORTANTE**: O Vercel só faz deploy do frontend. O backend precisa estar hospedado em outro lugar:

#### Opções para Backend:

1. **Railway** (Recomendado):
   - Acesse [railway.app](https://railway.app)
   - Conecte o repositório
   - Configure o backend na pasta `backend/`
   - Use o URL fornecido pelo Railway nas variáveis de ambiente do Vercel

2. **Render**:
   - Acesse [render.com](https://render.com)
   - Crie um novo Web Service
   - Configure para usar `backend/main.py` com uvicorn

3. **Heroku**:
   - Crie um `Procfile` no backend:
     ```
     web: uvicorn main:app --host 0.0.0.0 --port $PORT
     ```

### 4. Configuração CORS no Backend

Certifique-se de que o backend permite requisições do domínio do Vercel:

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://multtrade.vercel.app",  # Adicione seu domínio Vercel
        "https://*.vercel.app"  # Ou permita todos os subdomínios Vercel
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5. Variáveis de Ambiente no Vercel

No painel do Vercel, adicione:

```
VITE_API_URL=https://seu-backend-url.railway.app
VITE_WS_URL=wss://seu-backend-url.railway.app
```

### 6. Verificar Deploy

Após o deploy:

1. Acesse `https://multtrade.vercel.app`
2. Verifique se o frontend carrega
3. Verifique o console do navegador para erros de CORS
4. Teste a conexão com o backend

## 🔧 Troubleshooting

### Erro 404 no Vercel

- ✅ Certifique-se de que o Root Directory está configurado como `frontend`
- ✅ Verifique se o `vercel.json` está na pasta `frontend/`
- ✅ Verifique se o build está sendo gerado corretamente

### Erro de CORS

- ✅ Adicione o domínio do Vercel nas origens permitidas do backend
- ✅ Verifique se o backend está rodando e acessível

### Erro de conexão com API

- ✅ Verifique se `VITE_API_URL` está configurado corretamente no Vercel
- ✅ Certifique-se de que o backend está online e acessível
- ✅ Verifique se o backend aceita requisições HTTPS

## 📝 Notas

- O frontend no Vercel é estático (React build)
- O backend precisa estar em um serviço que suporte Python/FastAPI
- WebSocket precisa de suporte no backend (Railway/Render suportam)

