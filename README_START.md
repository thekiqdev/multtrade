# Scripts de Inicialização

## 🚀 Iniciar Servidores

### Opção 1: Script Batch (Windows) - Mais Simples
Duplo clique em:
```
start.bat
```

### Opção 2: Script PowerShell (Recomendado)
No PowerShell, execute:
```powershell
.\start.ps1
```

**O que o script faz:**
1. Verifica se as pastas `backend` e `frontend` existem
2. Verifica se o ambiente virtual está configurado
3. Inicia o **Backend** em uma janela separada (porta 8000)
4. Aguarda 3 segundos
5. Inicia o **Frontend** em outra janela separada (porta 5173)

## 🛑 Parar Servidores

### Opção 1: Script Batch
Duplo clique em:
```
stop.bat
```

### Opção 2: Script PowerShell
```powershell
.\stop.ps1
```

### Opção 3: Manual
- Feche as janelas do PowerShell/CMD onde os servidores estão rodando
- Ou pressione `Ctrl+C` em cada janela

## 📝 Acessos

Após iniciar:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173

## ⚙️ Requisitos

Antes de usar os scripts, certifique-se de:

1. **Backend configurado:**
   - Ambiente virtual criado (`backend\venv`)
   - Dependências instaladas (`pip install -r requirements.txt`)
   - Arquivo `.env` configurado com suas credenciais

2. **Frontend configurado:**
   - Dependências instaladas (`npm install`)

## 🔧 Troubleshooting

**Erro: "Pasta backend não encontrada"**
- Execute o script na raiz do projeto (`C:\CURSOR\Mult-Trade`)

**Erro: "Ambiente virtual não encontrado"**
- Execute: `cd backend && python -m venv venv`
- Depois: `venv\Scripts\activate && pip install -r requirements.txt`

**Erro: "node_modules não encontrado"**
- O script tentará instalar automaticamente
- Ou execute manualmente: `cd frontend && npm install`

**Servidores não param com stop.bat/stop.ps1**
- Feche as janelas manualmente
- Ou use o Gerenciador de Tarefas para finalizar processos Python/Node

