# Sistema de Logs

## 📋 Visão Geral

O sistema de logs registra todas as tentativas de envio de ordens, incluindo sucessos e erros, tanto no console quanto em arquivos.

## 📁 Localização dos Logs

### Logs de Aplicação
- **Arquivo**: `backend/logs/app.log`
- **Conteúdo**: Todos os logs da aplicação (inicialização, erros gerais, etc.)

### Logs de Ordens
- **Arquivo**: `backend/logs/orders_YYYY-MM-DD.txt`
- **Conteúdo**: Detalhes de cada tentativa de envio de ordem
- **Formato**: Um arquivo por dia

**Exemplo**: `backend/logs/orders_2025-11-03.txt`

## 📊 O que é Logado

### 1. Inicialização do Exchange Client
- Status das credenciais (sem expor valores completos)
- Sucesso ou erro na inicialização
- Detalhes do erro, se houver

### 2. Cada Requisição de Ordem
- **Timestamp** da requisição
- **Dados da ordem**:
  - Symbol (par de negociação)
  - Side (buy/sell)
  - Order Type (market/limit)
  - Quantity USD
  - Size
  - Price
  - Leverage
  - Take Profit
  - Stop Loss

### 3. Resultado da Ordem
- **Sucesso**: Resultado completo da API da Hyperliquid
- **Erro**: Tipo e mensagem de erro detalhada

## 🔍 Como Visualizar os Logs

### Método 1: Console do Backend
Todos os logs aparecem em tempo real no terminal onde o servidor está rodando.

### Método 2: Arquivos de Log
Abra diretamente os arquivos:
- **Windows**: `backend\logs\orders_2025-11-03.txt`
- **Linux/Mac**: `backend/logs/orders_2025-11-03.txt`

### Método 3: API Endpoint
Acesse via navegador ou curl:
```
http://localhost:8000/api/logs
```

Ou com limite personalizado:
```
http://localhost:8000/api/logs?limit=100
```

## 📝 Exemplo de Log

```
================================================================================
Timestamp: 2025-11-03 14:30:45
Order Data: {'symbol': 'BTC', 'side': 'buy', 'order_type': 'limit', 'quantity_usd': 100.0, 'size': 0.0009, 'price': 109950.5, 'leverage': 10, 'takeprofit': 110000.0, 'stoploss': 109000.0}
Result: {'success': True, 'result': {...}, 'order': {...}}
================================================================================
```

## ⚠️ Importante

- Os logs NÃO incluem as credenciais completas (apenas primeiros caracteres para identificação)
- Os arquivos de log são criados automaticamente na primeira ordem
- Logs antigos são mantidos por dia
- Para limpar logs antigos, delete manualmente os arquivos `orders_YYYY-MM-DD.txt`

## 🔧 Troubleshooting

**Pasta de logs não existe?**
- Ela será criada automaticamente na primeira ordem
- Ou crie manualmente: `mkdir backend\logs`

**Não consigo ver os logs no console?**
- Verifique se o servidor está rodando com `--reload`
- Os logs aparecem em tempo real

**API /api/logs retorna vazio?**
- Verifique se há ordens enviadas hoje
- O arquivo é criado apenas quando há tentativas de ordem

