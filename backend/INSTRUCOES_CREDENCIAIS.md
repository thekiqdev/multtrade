# 🔐 Instruções: Como Obter as Credenciais Corretas

## ⚠️ PROBLEMA IDENTIFICADO

Você está usando um valor de **42 caracteres** que a API da Hyperliquid retorna, mas o SDK precisa de uma **chave privada completa de 66 caracteres** da sua carteira.

## 📋 O Que Você Precisa

### 1. ACCOUNT_ADDRESS (42 caracteres) ✅
- O **endereço público** da sua carteira
- Formato: `0x` + 40 caracteres hex = **42 caracteres**
- Você já tem isso! ✅

### 2. SECRET_KEY (66 caracteres) ⚠️ NECESSÁRIO
- A **chave privada completa** da sua carteira
- Formato: `0x` + 64 caracteres hex = **66 caracteres**
- **NÃO** é o que a API da Hyperliquid retorna
- Você precisa **exportar da sua carteira** (MetaMask, etc.)

## 🔑 Como Obter a Chave Privada

### MetaMask (Mais Comum)

1. Abra o MetaMask
2. Clique no ícone de conta (canto superior direito)
3. Vá em **"Account Details"** ou **"Detalhes da Conta"**
4. Clique em **"Export Private Key"** ou **"Exportar Chave Privada"**
5. Digite sua senha do MetaMask
6. **Copie a chave privada** - ela deve ter **66 caracteres**
7. Cole no arquivo `.env` como `SECRET_KEY=`

**Exemplo:**
```
SECRET_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### Outras Carteiras

- **WalletConnect**: Exporte a chave privada da carteira conectada
- **Ledger/Trezor**: Você precisará usar o endereço e assinar transações de outra forma
- **Outras**: Procure por "Export Private Key" ou "Export Secret Key"

## 📝 Formato Final do .env

```env
ACCOUNT_ADDRESS=0x6398a7ed26B1FDc452e0cd511f989927d244eD81
SECRET_KEY=0x[SUA_CHAVE_PRIVADA_DE_66_CARACTERES_AQUI]
```

**Importante:**
- ✅ ACCOUNT_ADDRESS: 42 caracteres (você já tem)
- ✅ SECRET_KEY: 66 caracteres (exporte da carteira)
- ❌ NÃO use valores de 42 caracteres da API como SECRET_KEY

## 🔄 Após Atualizar

1. **Salve o arquivo `.env`**
2. O servidor vai recarregar automaticamente (ou reinicie)
3. Verifique o status:
   ```
   http://localhost:8000/api/status
   ```
4. Você deve ver: `"exchange_initialized": true`

## ❓ Por Que Precisa da Chave Privada?

O SDK `hyperliquid-python-sdk` usa `eth_account` que precisa:
- Criar uma wallet Ethereum para assinar transações
- Autenticar com a API da Hyperliquid
- A chave privada é necessária para **assinar** as ordens

O valor de 42 caracteres que a Hyperliquid retorna é apenas um identificador, não serve para assinar.

## 🛡️ Segurança

- **NUNCA** compartilhe sua chave privada
- **Use apenas na testnet** para testes
- O arquivo `.env` está no `.gitignore` e não será commitado

