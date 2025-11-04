# Configuração do Backend

## Passo a Passo

### 1. Instalar Python (se ainda não tiver)

- Baixe Python 3.8+ de: https://www.python.org/downloads/
- Durante a instalação, marque a opção "Add Python to PATH"

### 2. Criar Ambiente Virtual

**Windows:**
```powershell
cd backend
python -m venv venv
# ou se não funcionar:
py -m venv venv
```

**Linux/Mac:**
```bash
cd backend
python3 -m venv venv
```

### 3. Ativar Ambiente Virtual

**Windows:**
```powershell
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 4. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 5. Configurar Variáveis de Ambiente

1. Copie o arquivo `env.example` para `.env`:
   - **Windows:** `copy env.example .env`
   - **Linux/Mac:** `cp env.example .env`

2. Edite o arquivo `.env` com suas credenciais da Hyperliquid:
   ```
   ACCOUNT_ADDRESS=0xSEU_ENDERECO_REAL
   SECRET_KEY=SUA_CHAVE_PRIVADA_REAL
   ```

   ⚠️ **ATENÇÃO:** Nunca compartilhe suas chaves privadas!

### 6. Iniciar Servidor

```bash
uvicorn main:app --reload
```

O servidor estará disponível em: `http://localhost:8000`

## Verificar se está funcionando

Acesse no navegador: `http://localhost:8000`

Você deve ver:
```json
{"message": "Hyperliquid Trade Test API"}
```

## Troubleshooting

**Problema:** `python` não é reconhecido
- **Solução:** Use `py` no Windows ou instale Python e adicione ao PATH

**Problema:** Erro ao importar `hyperliquid`
- **Solução:** Certifique-se de que o ambiente virtual está ativado e execute `pip install -r requirements.txt` novamente

**Problema:** Erro de credenciais
- **Solução:** Verifique se o arquivo `.env` existe e contém as credenciais corretas

