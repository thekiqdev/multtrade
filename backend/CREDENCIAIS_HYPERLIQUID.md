# 🔑 Credenciais da Hyperliquid - Entendendo o Formato

## ⚠️ IMPORTANTE: Diferença entre Endereço e Chave Privada

A Hyperliquid pode retornar valores de **42 caracteres**, mas o SDK precisa de:

### ACCOUNT_ADDRESS (42 caracteres) ✅
- **Formato**: `0x` + 40 caracteres hexadecimais = **42 caracteres total**
- **O que é**: O endereço público da sua carteira
- **Exemplo**: `0x6398a7ed26B1FDc452e0cd511f989927d244eD81`
- **Onde encontrar**: Na interface da Hyperliquid ou na sua carteira MetaMask/outras

### SECRET_KEY (66 caracteres) ✅
- **Formato**: `0x` + 64 caracteres hexadecimais = **66 caracteres total**
- **O que é**: A **chave privada completa** da sua carteira
- **Exemplo**: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
- **Onde encontrar**: Na sua carteira (MetaMask, etc.) - **NÃO** na interface da Hyperliquid

## ❌ Por que 42 caracteres não funciona?

Um valor de 42 caracteres é um **endereço**, não uma **chave privada**. O SDK `hyperliquid-python-sdk` usa `eth_account` que precisa da chave privada completa para:
- Criar a wallet Ethereum
- Assinar transações
- Autenticar com a API

## ✅ Solução

### Opção 1: Exportar Chave Privada da Carteira

1. **MetaMask:**
   - Abra MetaMask
   - Clique nos 3 pontos → Account Details
   - Clique em "Export Private Key"
   - Digite sua senha
   - Copie a chave privada (66 caracteres)

2. **Outras Carteiras:**
   - Procure por "Export Private Key" ou "Export Secret Key"
   - A chave deve ter 66 caracteres (0x + 64 hex)

### Opção 2: Verificar se você já tem

Execute este comando para verificar:
```powershell
cd backend
venv\Scripts\activate
python verificar_credenciais.py
```

## 📝 Formato Correto do .env

```env
ACCOUNT_ADDRESS=0x6398a7ed26B1FDc452e0cd511f989927d244eD81
SECRET_KEY=0x[64 caracteres hex aqui - total de 66 caracteres]
```

**Importante:**
- ACCOUNT_ADDRESS: 42 caracteres (endereço público)
- SECRET_KEY: 66 caracteres (chave privada completa)
- Sem espaços, sem aspas
- Cada linha deve ter o formato `CHAVE=valor`

## 🔍 Verificar

Após atualizar, verifique o status:
```powershell
curl http://localhost:8000/api/status
```

Ou acesse no navegador: http://localhost:8000/api/status

## ⚠️ Segurança

- **NUNCA** compartilhe sua chave privada
- **NUNCA** commite o arquivo `.env` no Git
- Use apenas na **testnet** para testes
- Mantenha suas chaves seguras

