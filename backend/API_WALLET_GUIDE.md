# 🔑 Guia: Como Usar API Wallet da Hyperliquid

## 📋 Entendendo API Wallets vs Main Wallets

Quando você gera uma **API Key** na Hyperliquid, você cria uma **API Wallet separada**. Mas há uma diferença importante:

### Main Wallet (Carteira Principal)
- É a carteira que você conecta no site (MetaMask, etc.)
- Endereço: `0x6398a7ed26B1FDc452e0cd511f989927d244eD81` (exemplo)

### API Wallet (Carteira da API)
- É criada quando você gera uma API Key em `/API`
- Tem seu próprio endereço e chave privada
- Endereço: `0x9938251304b47474a6b961A38f7013fb0c9aaB80` (exemplo)

## ⚠️ IMPORTANTE: Como Configurar

Quando você usa uma **API Wallet**, precisa configurar:

### No arquivo `.env`:

```env
# ACCOUNT_ADDRESS = Endereço da MAIN WALLET (não da API wallet!)
ACCOUNT_ADDRESS=0x6398a7ed26B1FDc452e0cd511f989927d244eD81

# SECRET_KEY = Chave PRIVADA da API WALLET (não da main wallet!)
SECRET_KEY=0x[chave privada da API wallet - 66 caracteres]
```

### Por quê?

Segundo a documentação do SDK:
> "Generate and authorize a new API private key on https://app.hyperliquid-testnet.xyz/API, and set the API wallet's private key as the `secret_key` in examples/config.json. Note that you must still set the public key of the main wallet _not_ the API wallet as the `account_address` in examples/config.json."

**Isso significa:**
- `ACCOUNT_ADDRESS`: Use o endereço da **MAIN WALLET**
- `SECRET_KEY`: Use a chave privada da **API WALLET**

## 🔍 O Problema Atual

O sistema está criando uma wallet a partir da `SECRET_KEY`, que resulta no endereço `0x9938251304b47474a6b961A38f7013fb0c9aaB80`.

Mas esse endereço (da API wallet) **não existe** na Hyperliquid porque:
- A API wallet precisa ser autorizada pela main wallet primeiro
- Ou você precisa usar o `ACCOUNT_ADDRESS` da main wallet diretamente

## ✅ Solução Correta

### Opção 1: Usar API Wallet Corretamente

1. **Gere a API Key** em https://app.hyperliquid-testnet.xyz/API
2. **Copie a chave privada da API wallet** (66 caracteres)
3. **No `.env`, configure:**
   ```env
   ACCOUNT_ADDRESS=0x6398a7ed26B1FDc452e0cd511f989927d244eD81  # Main wallet
   SECRET_KEY=0x[chave privada da API wallet - 66 chars]         # API wallet private key
   ```
4. **Autorize a API wallet** na interface da Hyperliquid (main wallet precisa autorizar)

### Opção 2: Usar Main Wallet Diretamente

1. **Exporte a chave privada da MAIN WALLET** (MetaMask)
2. **No `.env`, configure:**
   ```env
   ACCOUNT_ADDRESS=0x6398a7ed26B1FDc452e0cd511f989927d244eD81  # Main wallet
   SECRET_KEY=0x[chave privada da main wallet - 66 chars]        # Main wallet private key
   ```
3. **Certifique-se de que a main wallet existe na testnet**

## 🐛 O Que Está Acontecendo

O sistema está usando `0x9938251304b47474a6b961A38f7013fb0c9aaB80` porque:
- Essa é a wallet criada a partir da `SECRET_KEY` atual
- Essa wallet pode ser uma API wallet que não foi autorizada ainda
- Ou é uma wallet que não existe na testnet

## 🔧 Verificar e Corrigir

1. **Verifique qual wallet você está usando:**
   - Acesse: `http://localhost:8000/api/status`
   - Veja `wallet_address_actual`: esse é o endereço sendo usado

2. **Escolha uma das opções:**
   - **Opção A**: Configure para usar a main wallet (mais simples)
   - **Opção B**: Configure API wallet corretamente (precisa autorização)

3. **Após configurar, certifique-se:**
   - A wallet existe na testnet (conecte no site)
   - A wallet tem fundos/foi criada
   - Tente enviar ordem novamente

## 📝 Exemplo Correto

### Para usar API Wallet:
```env
ACCOUNT_ADDRESS=0x6398a7ed26B1FDc452e0cd511f989927d244eD81
SECRET_KEY=0x[chave privada da API wallet que você gerou]
```

### Para usar Main Wallet:
```env
ACCOUNT_ADDRESS=0x6398a7ed26B1FDc452e0cd511f989927d244eD81
SECRET_KEY=0x[chave privada da main wallet do MetaMask]
```

**Importante**: O `ACCOUNT_ADDRESS` sempre deve ser da **main wallet**, mas o sistema pode usar o endereço da wallet criada a partir da `SECRET_KEY` se forem diferentes.

