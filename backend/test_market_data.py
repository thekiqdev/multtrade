"""Script para testar a API de market data da Hyperliquid"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from hyperliquid.info import Info
from hyperliquid.utils import constants

def test_market_data():
    print("=" * 80)
    print("TESTE DE MARKET DATA - Hyperliquid Testnet")
    print("=" * 80)
    
    try:
        # Initialize info client
        print("\n1. Inicializando Info client...")
        info_client = Info(base_url=constants.TESTNET_API_URL, skip_ws=True)
        print("   ✅ Info client inicializado")
        
        # Get metadata
        print("\n2. Obtendo metadata...")
        meta = info_client.meta()
        print(f"   Tipo: {type(meta)}")
        if isinstance(meta, dict):
            print(f"   Keys: {list(meta.keys())}")
            if "universe" in meta:
                universe = meta.get("universe", [])
                print(f"   Universe tem {len(universe)} assets")
                
                # Find BTC
                btc_index = None
                for i, asset in enumerate(universe):
                    if asset.get("name") == "BTC":
                        btc_index = i
                        print(f"   ✅ BTC encontrado no índice {i}")
                        print(f"   Asset info: {asset}")
                        break
                
                if btc_index is None:
                    print("   ❌ BTC não encontrado no universe")
                    return
            else:
                print("   ❌ 'universe' não encontrado em meta")
                print(f"   Meta completo: {meta}")
                return
        else:
            print(f"   ❌ Meta não é um dict: {meta}")
            return
        
        # Get all mids
        print("\n3. Obtendo all_mids()...")
        market_data = info_client.all_mids()
        print(f"   Tipo: {type(market_data)}")
        if isinstance(market_data, list):
            print(f"   Tamanho: {len(market_data)}")
            print(f"   Primeiros 5 valores: {market_data[:5]}")
            
            if btc_index is not None and btc_index < len(market_data):
                btc_price = market_data[btc_index]
                print(f"\n   ✅ Preço BTC (índice {btc_index}): {btc_price}")
            else:
                print(f"   ❌ Índice {btc_index} fora do range (tamanho: {len(market_data)})")
        else:
            print(f"   ❌ all_mids() não retornou uma lista: {market_data}")
            return
        
        # Get l2_snapshot
        print("\n4. Obtendo l2_snapshot para BTC...")
        try:
            l2_data = info_client.l2_snapshot("BTC")
            print(f"   Tipo: {type(l2_data)}")
            if isinstance(l2_data, dict):
                print(f"   Keys: {list(l2_data.keys())}")
                print(f"   Dados: {l2_data}")
            elif isinstance(l2_data, list):
                print(f"   Tamanho: {len(l2_data)}")
                print(f"   Primeiros 3: {l2_data[:3]}")
            else:
                print(f"   Dados: {l2_data}")
        except Exception as e:
            print(f"   ⚠️ Erro ao obter l2_snapshot: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n" + "=" * 80)
        print("✅ TESTE CONCLUÍDO")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_market_data()

