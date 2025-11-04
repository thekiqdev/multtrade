# Hyperliquid Python SDK - Referência de API

## 📚 Documentação Oficial
**Repositório**: https://github.com/hyperliquid-dex/hyperliquid-python-sdk

## 🔧 Métodos da Classe Exchange

### Métodos Principais

#### `exchange.order(coin, is_buy, sz, limit_px, order_type)`
Envia uma única ordem.

**Parâmetros:**
- `coin` (str): Símbolo do ativo (ex: "BTC", "ETH")
- `is_buy` (bool): True para compra, False para venda
- `sz` (str): Tamanho da ordem como string
- `limit_px` (str|None): Preço limite como string. None para market orders
- `order_type` (dict): Tipo de ordem
  - Market: `{"market": {}}`
  - Limit: `{"limit": {"tif": "Gtc"}}` ou `{"limit": {"tif": "Ioc"}}`

**Retorna:** Resultado da ordem

**Exemplo:**
```python
# Market order
result = exchange.order("BTC", True, "0.001", None, {"market": {}})

# Limit order
result = exchange.order("BTC", True, "0.001", "50000.00", {"limit": {"tif": "Gtc"}})
```

#### `exchange.bulk_orders(order_requests, builder)`
Envia múltiplas ordens em lote.

**Parâmetros:**
- `order_requests` (list): Lista de dicionários com ordens
- `builder` (optional): Builder para construção das ordens

#### `exchange.update_leverage(leverage, coin, is_cross)`
Atualiza o leverage para um ativo.

**Parâmetros:**
- `leverage` (float): Novo leverage (ex: 10.0)
- `coin` (str): Símbolo do ativo
- `is_cross` (bool): Se é cross margin

## 📝 Formato de Ordens

### Market Order
```python
{
    "coin": "BTC",
    "is_buy": True,
    "sz": "0.001",
    "limit_px": None,  # None para market
    "order_type": {"market": {}}
}
```

### Limit Order
```python
{
    "coin": "BTC",
    "is_buy": True,
    "sz": "0.001",
    "limit_px": "50000.00",  # Preço como string
    "order_type": {"limit": {"tif": "Gtc"}}  # Gtc = Good Till Cancel, IoC = Immediate or Cancel
}
```

## ⚠️ Observações Importantes

1. **Market Orders**: O parâmetro `limit_px` deve ser `None`, não `0` ou string vazia
2. **Size**: Deve ser uma string, não float
3. **Price**: Para limit orders, deve ser string formatada corretamente
4. **Order Type**: 
   - Market: `{"market": {}}` (sem outros campos)
   - Limit: `{"limit": {"tif": "Gtc"}}` ou `{"limit": {"tif": "Ioc"}}`

## 🔗 Links Úteis

- **SDK GitHub**: https://github.com/hyperliquid-dex/hyperliquid-python-sdk
- **Exemplos**: Ver pasta `examples/` no repositório
- **Documentação**: Ver README.md do repositório

## 📌 Notas de Implementação

- O método `exchange.order()` é o método recomendado para envio de ordens
- Não existe método `post_action()` na classe Exchange
- Use `exchange.order()` com os parâmetros corretos
- Para market orders, `limit_px` deve ser `None`

