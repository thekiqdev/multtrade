# Verificação de Credenciais

## Problema
O erro "Exchange client not initialized. Check your credentials" indica que as credenciais não foram configuradas corretamente.

## Solução

### 1. Verifique o arquivo `.env`

O arquivo `.env` deve estar na pasta `backend/` e conter:

```env
ACCOUNT_ADDRESS=0xSEU_ENDERECO_REAL_AQUI
SECRET_KEY=SUA_CHAVE_PRIVADA_REAL_AQUI
```

**IMPORTANTE:**
- Substitua `0xSEU_ENDERECO_REAL_AQUI` pelo seu endereço real da Hyperliquid Testnet
- Substitua `SUA_CHAVE_PRIVADA_REAL_AQUI` pela sua chave privada real
- NÃO use os valores de exemplo!

### 2. Formato correto

O arquivo `.env` deve ter EXATAMENTE este formato (sem espaços extras, sem aspas):

```
ACCOUNT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
SECRET_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### 3. Reinicie o servidor

Após editar o `.env`:

1. Pare o servidor (Ctrl+C no terminal onde está rodando)
2. Reinicie:
   ```powershell
   cd backend
   venv\Scripts\activate
   uvicorn main:app --reload
   ```

### 4. Verificar se funcionou

Você deve ver no console do backend uma mensagem como:
```
Exchange client initialized successfully for 0x12345678...
```

Se aparecer "Warning: Credentials appear to be default/example values", significa que as credenciais ainda são os valores de exemplo.

## Onde obter credenciais da Hyperliquid Testnet?

1. Acesse: https://app.hyperliquid-testnet.xyz
2. Conecte sua carteira
3. Obtenha seu endereço (ACCOUNT_ADDRESS)
4. Para a chave privada, você precisará exportá-la da sua carteira

**ATENÇÃO:** Nunca compartilhe suas chaves privadas!

