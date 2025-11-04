"""Script para testar envio de ordem na Hyperliquid"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from hyperliquid.info import Info
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants
from eth_account import Account
import os
from dotenv import load_dotenv

load_dotenv()

def test_order():
    print("=" * 80)
    print("TESTE DE ORDEM - Hyperliquid Testnet")
    print("=" * 80)
    
    # Get credentials
    ACCOUNT_ADDRESS = os.getenv("ACCOUNT_ADDRESS", "").strip().strip('"\'')
    SECRET_KEY = os.getenv("SECRET_KEY", "").strip().strip('"\'')
    
    if not ACCOUNT_ADDRESS or not SECRET_KEY:
        print("❌ ACCOUNT_ADDRESS ou SECRET_KEY não configurados no .env")
        return
    
    try:
        # Initialize info client
        print("\n1. Inicializando Info client...")
        info_client = Info(base_url=constants.TESTNET_API_URL, skip_ws=True)
        print("   ✅ Info client inicializado")
        
        # Initialize exchange client
        print("\n2. Inicializando Exchange client...")
        wallet = Account.from_key(SECRET_KEY)
        exchange = Exchange(wallet, constants.TESTNET_API_URL)
        print("   ✅ Exchange client inicializado")
        print(f"   Endereço: {ACCOUNT_ADDRESS}")
        
        # Get market data
        print("\n3. Obtendo dados de mercado para BTC...")
        market_data = info_client.all_mids()
        meta = info_client.meta()
        
        # Find BTC
        btc_index = None
        btc_price = None
        if meta and "universe" in meta:
            for i, asset in enumerate(meta["universe"]):
                if asset.get("name") == "BTC":
                    btc_index = i
                    break
        
        if btc_index is not None:
            if isinstance(market_data, dict):
                btc_price = market_data.get("BTC") or market_data.get("btc")
                if btc_price is None:
                    market_list = list(market_data.values())
                    if btc_index < len(market_list):
                        btc_price = market_list[btc_index]
            elif isinstance(market_data, list) and btc_index < len(market_data):
                btc_price = market_data[btc_index]
        
        if btc_price:
            print(f"   ✅ Preço BTC: {btc_price}")
        else:
            print("   ❌ Não foi possível obter preço BTC")
            return
        
        # Get bid/ask prices
        print("\n4. Obtendo bid/ask prices...")
        l2_data = info_client.l2_snapshot("BTC")
        bid_price = None
        ask_price = None
        
        if l2_data:
            if isinstance(l2_data, dict):
                if "bids" in l2_data and "asks" in l2_data:
                    bids = l2_data["bids"]
                    asks = l2_data["asks"]
                    if bids and len(bids) > 0:
                        bid_price = float(bids[0][0])
                    if asks and len(asks) > 0:
                        ask_price = float(asks[0][0])
                elif "levels" in l2_data:
                    levels = l2_data["levels"]
                    for level in levels:
                        if isinstance(level, (list, tuple)) and len(level) >= 1:
                            price = float(level[0])
                            if price < btc_price:
                                if bid_price is None or price > bid_price:
                                    bid_price = price
                            elif price > btc_price:
                                if ask_price is None or price < ask_price:
                                    ask_price = price
        
        print(f"   Bid: {bid_price}")
        print(f"   Ask: {ask_price}")
        
        # Calculate size for $15 USD
        quantity_usd = 15.0
        if ask_price:
            size = quantity_usd / ask_price
        else:
            size = quantity_usd / btc_price
        
        print(f"\n5. Calculando tamanho da ordem...")
        print(f"   Quantidade USD: ${quantity_usd}")
        print(f"   Tamanho calculado: {size}")
        
        # Round size
        sz_decimals = 5  # Default for BTC
        if meta and "universe" in meta:
            btc_info = next((a for a in meta["universe"] if a.get("name") == "BTC"), None)
            if btc_info and "szDecimals" in btc_info:
                sz_decimals = btc_info["szDecimals"]
        
        size_rounded = round(size, sz_decimals)
        print(f"   Tamanho arredondado ({sz_decimals} decimais): {size_rounded}")
        
        # Set leverage
        print("\n6. Configurando leverage...")
        try:
            exchange.update_leverage(10, "BTC", False)
            print("   ✅ Leverage configurado: 10x")
        except Exception as e:
            print(f"   ⚠️ Aviso ao configurar leverage: {e}")
        
        # Prepare order
        print("\n7. Preparando ordem MARKET (IOC)...")
        
        # For market buy order, use ask_price
        if ask_price:
            order_price = round(float(ask_price), 2)
        else:
            # Fallback: use mid_price + 0.5%
            order_price = round(btc_price * 1.005, 2)
        
        print(f"   Tipo: Market (IOC)")
        print(f"   Lado: Buy")
        print(f"   Símbolo: BTC")
        print(f"   Tamanho: {size_rounded}")
        print(f"   Preço: {order_price} (ask_price para garantir execução)")
        print(f"   Order Type: {{'limit': {{'tif': 'Ioc'}}}}")
        
        # Send order
        print("\n8. Enviando ordem...")
        try:
            result = exchange.order(
                "BTC",
                True,  # is_buy
                size_rounded,
                order_price,
                {"limit": {"tif": "Ioc"}}
            )
            
            print("   ✅ Ordem enviada!")
            print(f"   Resultado: {result}")
            
            if result and isinstance(result, dict):
                if result.get("status") == "ok":
                    response = result.get("response", {})
                    if isinstance(response, dict):
                        data = response.get("data", {})
                        statuses = data.get("statuses", [])
                        if statuses:
                            for status in statuses:
                                if "error" in status:
                                    print(f"   ❌ Erro: {status['error']}")
                                elif "resting" in status:
                                    print(f"   ✅ Ordem aceita: {status}")
            
        except Exception as e:
            print(f"   ❌ Erro ao enviar ordem: {e}")
            import traceback
            print(traceback.format_exc())
        
        print("\n" + "=" * 80)
        print("TESTE CONCLUÍDO")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ ERRO GERAL: {e}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    test_order()

