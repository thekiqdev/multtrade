# 🎯 Como Resolver o Erro "Wallet does not exist"

## ❌ Problema

Você está vendo o erro:
```
User or API Wallet 0x9938251304b47474a6b961a38f7013fb0c9aab80 does not exist.
```

## 🔍 Entendendo o Problema

### Por que isso acontece?

1. **O endereço usado é o da wallet criada a partir da SECRET_KEY**
   - O sistema cria uma wallet a partir da sua `SECRET_KEY`
   - O endereço da wallet é calculado automaticamente
   - **Esse endereço é o que está sendo usado**, não necessariamente o `ACCOUNT_ADDRESS` no `.env`

2. **Esse endereço precisa existir na Hyperliquid Testnet**
   - Antes de enviar ordens, a wallet precisa ser criada/fundada na testnet
   - Isso acontece automaticamente quando você faz o primeiro acesso

## ✅ Solução Passo a Passo

### 1. Identifique o endereço sendo usado

O sistema mostra qual endereço está sendo usado:
- No erro: `0x9938251304b47474a6b961a38f7013fb0c9aab80`
- No endpoint `/api/status`: campo `address_being_used`

### 2. Acesse a Hyperliquid Testnet

1. Abra: https://app.hyperliquid-testnet.xyz
2. Conecte sua carteira MetaMask
3. **Importante**: Certifique-se de que a carteira conectada corresponde ao endereço sendo usado

### 3. Crie/Funde sua wallet

1. Na interface da Hyperliquid, faça login com a carteira
2. Se for a primeira vez, você precisará:
   - Criar a wallet (pode ser automático)
   - Fazer um depósito inicial (pode usar faucet se disponível)
3. Aguarde a confirmação

### 4. Verifique se funcionou

1. Após criar/fundar a wallet, tente enviar uma ordem novamente
2. O erro não deve mais aparecer

## 📝 Nota Importante sobre ACCOUNT_ADDRESS

### O que acontece:

- **SECRET_KEY**: Cria a wallet e determina o endereço real
- **ACCOUNT_ADDRESS no .env**: Pode ser diferente do endereço da wallet
- **Sistema usa**: Sempre o endereço da wallet criada a partir da SECRET_KEY

### Se os endereços não correspondem:

Se você configurou:
```env
ACCOUNT_ADDRESS=0x6398a7ed26B1FDc452e0cd511f989927d244eD81
```

Mas a wallet criada é:
```
0x9938251304b47474a6b961a38f7013fb0c9aab80
```

**O sistema vai usar**: `0x9938251304b47474a6b961a38f7013fb0c9aab80`

### Para usar outro endereço:

Se você quer usar `0x6398a7ed26B1FDc452e0cd511f989927d244eD81`, você precisa:
1. Exportar a chave privada dessa carteira
2. Usar essa chave privada como `SECRET_KEY` no `.env`

## 🔍 Verificar Status

Acesse: `http://localhost:8000/api/status`

Você verá:
- `wallet_address_actual`: O endereço da wallet criada
- `account_address_configured`: O que está no `.env`
- `address_being_used`: Qual está sendo usado
- `addresses_match`: Se correspondem

## 🚀 Após Configurar

Depois de criar/fundar a wallet na testnet:
1. ✅ A wallet existirá na Hyperliquid
2. ✅ Você poderá enviar ordens
3. ✅ O erro não aparecerá mais

## 📚 Recursos

- Hyperliquid Testnet: https://app.hyperliquid-testnet.xyz
- Documentação: https://hyperliquid.gitbook.io/

