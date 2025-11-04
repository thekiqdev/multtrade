from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional, Dict, Set
import os
import eth_account
import logging
from datetime import datetime
from hyperliquid.exchange import Exchange
from hyperliquid.info import Info
from hyperliquid.utils import constants
import requests
import asyncio
import json
import websockets
from threading import Thread

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/logs/app.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Criar pasta de logs se não existir
os.makedirs('backend/logs', exist_ok=True)

load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://multtrade.vercel.app",
        "https://*.vercel.app"
    ],  # React dev servers + Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables (strip whitespace)
ACCOUNT_ADDRESS = os.getenv("ACCOUNT_ADDRESS", "").strip().strip('"\'')
SECRET_KEY = os.getenv("SECRET_KEY", "").strip().strip('"\'')
BASE_URL = constants.TESTNET_API_URL

# Initialize info client (can work without credentials for market data)
info_client = None
try:
    info_client = Info(base_url=BASE_URL, skip_ws=True)
    logger.info("=" * 80)
    logger.info("✅ Info client initialized successfully")
    logger.info(f"   Base URL: {BASE_URL}")
    logger.info("=" * 80)
    print(f"Info client initialized successfully")
except Exception as e:
    logger.error("=" * 80)
    logger.error("❌ Failed to initialize info client!")
    logger.error(f"   Error: {e}")
    logger.error("=" * 80)
    print(f"Warning: Could not initialize info client: {e}")
    import traceback
    traceback.print_exc()

# Initialize wallet and exchange client (requires credentials)
wallet = None
exchange = None

# WebSocket connections management
active_websocket_connections: Set[WebSocket] = set()
websocket_price_data: Dict[str, float] = {}  # Store latest prices per symbol
websocket_running = False
websocket_task = None

# Centralized price cache - stores all price data (REST + WebSocket)
price_cache: Dict[str, Dict] = {
    "BTC": {"mid_price": None, "bid_price": None, "ask_price": None, "spread": None, "last_update": None, "source": None},
    "ETH": {"mid_price": None, "bid_price": None, "ask_price": None, "spread": None, "last_update": None, "source": None},
    "SOL": {"mid_price": None, "bid_price": None, "ask_price": None, "spread": None, "last_update": None, "source": None}
}

def initialize_exchange():
    """Initialize or reinitialize exchange client - useful for hot reload"""
    global wallet, exchange, ACCOUNT_ADDRESS, SECRET_KEY
    # Reload env vars in case they changed
    load_dotenv(override=True)
    ACCOUNT_ADDRESS = os.getenv("ACCOUNT_ADDRESS", "").strip()
    SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
    
    # Remove espaços extras e quebras de linha
    if ACCOUNT_ADDRESS:
        ACCOUNT_ADDRESS = ACCOUNT_ADDRESS.strip('"\'')
    if SECRET_KEY:
        SECRET_KEY = SECRET_KEY.strip('"\'')
    
    logger.info("=" * 60)
    logger.info("Tentando inicializar Exchange client...")
    logger.info(f"ACCOUNT_ADDRESS presente: {bool(ACCOUNT_ADDRESS)}")
    logger.info(f"ACCOUNT_ADDRESS (primeiros 10 chars): {ACCOUNT_ADDRESS[:10] if ACCOUNT_ADDRESS else 'None'}...")
    logger.info(f"SECRET_KEY presente: {bool(SECRET_KEY)}")
    logger.info(f"SECRET_KEY (primeiros 10 chars): {SECRET_KEY[:10] if SECRET_KEY else 'None'}...")
    
    if ACCOUNT_ADDRESS and SECRET_KEY:
        # Check if values are not the default examples
        if ACCOUNT_ADDRESS == "0xSEU_ENDERECO" or SECRET_KEY == "SUA_CHAVE_PRIVADA":
            logger.warning("=" * 60)
            logger.warning("CREDENCIAIS SAO VALORES DE EXEMPLO!")
            logger.warning("Por favor, edite o arquivo backend/.env com suas credenciais reais")
            logger.warning("=" * 60)
            return False
            
        try:
            logger.info("Criando wallet a partir da SECRET_KEY...")
            wallet = eth_account.Account.from_key(SECRET_KEY)
            logger.info(f"Wallet criado com sucesso. Endereco: {wallet.address}")
            
            logger.info(f"Inicializando Exchange client com BASE_URL: {BASE_URL}")
            exchange = Exchange(wallet, BASE_URL, account_address=ACCOUNT_ADDRESS)
            logger.info("=" * 60)
            logger.info(f"✅ Exchange client inicializado com SUCESSO!")
            logger.info(f"   Endereco: {ACCOUNT_ADDRESS}")
            logger.info(f"   Base URL: {BASE_URL}")
            logger.info("=" * 60)
            return True
        except Exception as e:
            logger.error("=" * 60)
            logger.error("❌ ERRO ao inicializar Exchange client:")
            logger.error(f"   Tipo: {type(e).__name__}")
            logger.error(f"   Mensagem: {str(e)}")
            logger.error("=" * 60)
            import traceback
            logger.error(traceback.format_exc())
            return False
    else:
        logger.error("=" * 60)
        logger.error("❌ ACCOUNT_ADDRESS ou SECRET_KEY nao foram encontradas no .env")
        logger.error("=" * 60)
        return False

# Initial initialization
initialize_exchange()


class OrderRequestModel(BaseModel):
    symbol: str
    price: Optional[float] = None
    size: float
    side: str  # "buy" or "sell"
    order_type: str  # "limit" or "market"
    takeprofit: Optional[float] = None
    stoploss: Optional[float] = None
    leverage: Optional[float] = None
    quantity_usd: Optional[float] = None  # Quantidade em USD


@app.get("/")
def read_root():
    return {"message": "Hyperliquid Trade Test API"}


@app.get("/api/status")
async def get_status():
    """Retorna o status da aplicação e credenciais"""
    # Reload env to get latest values
    load_dotenv(override=True)
    current_account = os.getenv("ACCOUNT_ADDRESS", "").strip().strip('"\'')
    current_secret = os.getenv("SECRET_KEY", "").strip().strip('"\'')
    
    status = {
        "backend_running": True,
        "exchange_initialized": exchange is not None,
        "info_client_initialized": info_client is not None,
        "credentials": {
            "account_address_present": bool(current_account),
            "account_address_length": len(current_account) if current_account else 0,
            "account_address_preview": f"{current_account[:10]}...{current_account[-4:]}" if current_account and len(current_account) > 14 else "N/A",
            "secret_key_present": bool(current_secret),
            "secret_key_length": len(current_secret) if current_secret else 0,
            "secret_key_preview": f"{current_secret[:10]}...{current_secret[-4:]}" if current_secret and len(current_secret) > 14 else "N/A",
            "is_example_account": current_account == "0xSEU_ENDERECO",
            "is_example_secret": current_secret == "SUA_CHAVE_PRIVADA",
        },
        "issues": []
    }
    
    # Detect issues
    if not current_account:
        status["issues"].append("ACCOUNT_ADDRESS não encontrado no .env")
    elif current_account == "0xSEU_ENDERECO":
        status["issues"].append("ACCOUNT_ADDRESS ainda tem valor de exemplo")
    elif len(current_account) != 42:
        status["issues"].append(f"ACCOUNT_ADDRESS deve ter 42 caracteres (tem {len(current_account)})")
    
    if not current_secret:
        status["issues"].append("SECRET_KEY não encontrado no .env")
    elif current_secret == "SUA_CHAVE_PRIVADA":
        status["issues"].append("SECRET_KEY ainda tem valor de exemplo")
    elif len(current_secret) != 66:
        status["issues"].append(f"SECRET_KEY deve ter 66 caracteres (0x + 64 hex). Você tem {len(current_secret)} caracteres")
        if len(current_secret) == 42:
            status["issues"].append("⚠️ SECRET_KEY tem 42 caracteres - parece ser um ENDEREÇO, não uma CHAVE PRIVADA!")
    
    if not exchange:
        status["issues"].append("Exchange client não foi inicializado")
    
    return status


@app.get("/api/config")
async def get_config():
    """Retorna a configuração atual (REST ou WebSocket)"""
    rest_enabled = os.getenv("REST_ENABLED", "true").lower() == "true"
    websocket_enabled = os.getenv("WEBSOCKET_ENABLED", "false").lower() == "true"
    price_source = os.getenv("PRICE_SOURCE", "rest")
    
    return {
        "price_source": price_source,
        "rest_enabled": rest_enabled,
        "websocket_enabled": websocket_enabled,
        "websocket_running": websocket_running,
        "websocket_prices": websocket_price_data
    }


@app.on_event("startup")
async def startup_event():
    """Inicia o WebSocket automaticamente se estiver habilitado"""
    websocket_enabled = os.getenv("WEBSOCKET_ENABLED", "false").lower() == "true"
    if websocket_enabled and not websocket_running:
        logger.info("🚀 Iniciando WebSocket automaticamente no startup...")
        start_websocket_background()
        # Also fetch initial prices from REST to populate cache
        await fetch_and_cache_rest_prices()


async def fetch_and_cache_rest_prices():
    """Busca preços do REST e atualiza o cache"""
    global price_cache
    symbols = ["BTC", "ETH", "SOL"]
    
    for symbol in symbols:
        try:
            market_data = await get_market_data(symbol)
            if market_data and market_data.get("mid_price"):
                # Cache is already updated in get_market_data, but ensure it's set
                price_cache[symbol] = {
                    "mid_price": market_data.get("mid_price"),
                    "bid_price": market_data.get("bid_price"),
                    "ask_price": market_data.get("ask_price"),
                    "spread": market_data.get("spread"),
                    "last_update": datetime.now().isoformat(),
                    "source": "rest"
                }
                logger.info(f"✅ Cache populado para {symbol}: {market_data.get('mid_price')}")
        except Exception as e:
            logger.error(f"Erro ao buscar preço REST para {symbol}: {e}")
            import traceback
            logger.error(traceback.format_exc())


@app.post("/api/config")
async def update_config(config: dict):
    """Atualiza a configuração de fonte de preço"""
    price_source = config.get("price_source", "rest")
    rest_enabled = config.get("rest_enabled", True)
    websocket_enabled = config.get("websocket_enabled", False)
    
    # Determine primary source (WebSocket takes priority if both enabled)
    if websocket_enabled:
        primary_source = "websocket"
    elif rest_enabled:
        primary_source = "rest"
    else:
        primary_source = "rest"  # Default to REST if both disabled
    
    # Save to environment variable
    os.environ["PRICE_SOURCE"] = primary_source
    os.environ["REST_ENABLED"] = str(rest_enabled)
    os.environ["WEBSOCKET_ENABLED"] = str(websocket_enabled)
    
    # Manage WebSocket connection
    if websocket_enabled and not websocket_running:
        # Start WebSocket connection if enabled but not running
        start_websocket_background()
        # Fetch initial REST prices to populate cache
        await fetch_and_cache_rest_prices()
    elif not websocket_enabled and websocket_running:
        # Stop WebSocket if disabled
        stop_websocket_background()
    
    return {
        "success": True,
        "price_source": primary_source,
        "rest_enabled": rest_enabled,
        "websocket_enabled": websocket_enabled,
        "message": f"Configuração atualizada: REST={rest_enabled}, WebSocket={websocket_enabled}"
    }


async def websocket_price_updater():
    """WebSocket client that connects to Hyperliquid and updates prices"""
    global websocket_running, websocket_price_data, active_websocket_connections, price_cache
    
    uri = "wss://api.hyperliquid-testnet.xyz/ws"
    symbols_to_subscribe = ["BTC", "ETH", "SOL"]
    
    while websocket_running:
        try:
            async with websockets.connect(uri) as ws:
                logger.info("✅ WebSocket connected to Hyperliquid")
                
                for symbol in symbols_to_subscribe:
                    subscription_msg = {
                        "method": "subscribe",
                        "subscription": {
                            "type": "trades",
                            "coin": symbol
                        }
                    }
                    await ws.send(json.dumps(subscription_msg))
                    logger.info(f"Subscribed to trades for {symbol}")
                    await asyncio.sleep(0.1)
                
                while websocket_running:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=30.0)
                        
                        if isinstance(msg, bytes):
                            try:
                                msg = msg.decode('utf-8')
                            except:
                                continue
                        
                        if msg.strip() in ['-1', '1', 'ping', 'pong']:
                            continue
                        
                        try:
                            data = json.loads(msg)
                        except json.JSONDecodeError:
                            continue
                        
                        if isinstance(data, dict):
                            if "error" in data:
                                continue
                            
                            if "channel" in data and data["channel"] == "trades":
                                if "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
                                    for trade in data["data"]:
                                        if isinstance(trade, dict):
                                            price = float(trade.get("px", 0))
                                            symbol = trade.get("coin", "").upper()
                                            
                                            if price > 0 and symbol:
                                                old_price = websocket_price_data.get(symbol, 0)
                                                websocket_price_data[symbol] = price
                                                
                                                # Update centralized cache
                                                if symbol in price_cache:
                                                    existing = price_cache[symbol]
                                                    
                                                    # ALWAYS keep existing bid/ask/spread from REST (real values)
                                                    # WebSocket only updates mid_price, not bid/ask
                                                    price_cache[symbol] = {
                                                        "mid_price": price,  # Update mid_price from WebSocket
                                                        "bid_price": existing.get("bid_price"),  # Keep REST bid_price
                                                        "ask_price": existing.get("ask_price"),  # Keep REST ask_price
                                                        "spread": existing.get("spread"),  # Keep REST spread
                                                        "last_update": datetime.now().isoformat(),
                                                        "source": "websocket"  # But mark as websocket for mid_price
                                                    }
                                                
                                                logger.info(f"📊 {symbol} price updated via WebSocket: {price} (old: {old_price})")
                                                
                                                # Always send price_update when we have active connections
                                                if active_websocket_connections:
                                                    message = {
                                                        "type": "price_update",
                                                        "symbol": symbol,
                                                        "price": price,
                                                        "cache_data": price_cache.get(symbol)
                                                    }
                                                    disconnected = set()
                                                    sent_count = 0
                                                    for connection in active_websocket_connections:
                                                        try:
                                                            await connection.send_json(message)
                                                            sent_count += 1
                                                        except Exception as e:
                                                            logger.error(f"Error sending to WebSocket client: {e}")
                                                            disconnected.add(connection)
                                                    active_websocket_connections -= disconnected
                                                    if sent_count > 0:
                                                        logger.info(f"✅ Sent price_update to {sent_count} client(s) for {symbol}: {price}")
                                                else:
                                                    logger.warning(f"⚠️ No active WebSocket connections to send price_update for {symbol}")
                    except asyncio.TimeoutError:
                        try:
                            await ws.send(json.dumps({"method": "ping"}))
                        except:
                            pass
                    except Exception as e:
                        logger.error(f"Error processing WebSocket message: {e}")
                        await asyncio.sleep(1)
                        
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            if websocket_running:
                await asyncio.sleep(5)


def start_websocket_background():
    """Start WebSocket in background thread"""
    global websocket_running, websocket_task
    
    if websocket_running:
        return
    
    websocket_running = True
    
    def run_websocket():
        asyncio.run(websocket_price_updater())
    
    websocket_task = Thread(target=run_websocket, daemon=True)
    websocket_task.start()
    logger.info("🚀 WebSocket background task started")


def stop_websocket_background():
    """Stop WebSocket background task"""
    global websocket_running
    
    websocket_running = False
    logger.info("🛑 WebSocket background task stopped")


@app.websocket("/ws/price")
async def websocket_price_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time price updates"""
    await websocket.accept()
    active_websocket_connections.add(websocket)
    logger.info(f"WebSocket client connected. Total connections: {len(active_websocket_connections)}")
    
    try:
        # Don't send initial prices - only send real-time price_update messages
        # Keep connection alive and wait for disconnection
        while True:
            try:
                # Wait for messages (or timeout to check connection)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                # Client can send ping/pong messages if needed
            except asyncio.TimeoutError:
                # Connection is still alive, continue waiting
                continue
            except:
                # Connection closed or error
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Error in WebSocket endpoint: {e}")
    finally:
        active_websocket_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total connections: {len(active_websocket_connections)}")


@app.get("/api/debug/market")
async def debug_market():
    """Endpoint de debug para verificar status do info_client"""
    debug_info = {
        "info_client_initialized": info_client is not None,
        "base_url": BASE_URL,
        "test_results": {}
    }
    
    if info_client:
        try:
            # Test meta()
            meta = info_client.meta()
            debug_info["test_results"]["meta"] = {
                "success": True,
                "type": str(type(meta)),
                "has_universe": "universe" in meta if isinstance(meta, dict) else False,
                "universe_length": len(meta.get("universe", [])) if isinstance(meta, dict) else 0
            }
        except Exception as e:
            debug_info["test_results"]["meta"] = {
                "success": False,
                "error": str(e)
            }
        
        try:
            # Test all_mids()
            mids = info_client.all_mids()
            first_5 = None
            if mids:
                if isinstance(mids, dict):
                    first_5 = list(mids.values())[:5] if len(mids) >= 5 else list(mids.values())
                elif isinstance(mids, list):
                    first_5 = mids[:5] if len(mids) >= 5 else mids
                else:
                    first_5 = mids
            debug_info["test_results"]["all_mids"] = {
                "success": True,
                "type": str(type(mids)),
                "length": len(mids) if mids else 0,
                "first_5": first_5
            }
        except Exception as e:
            debug_info["test_results"]["all_mids"] = {
                "success": False,
                "error": str(e)
            }
        
        try:
            # Test l2_snapshot for BTC
            l2 = info_client.l2_snapshot("BTC")
            debug_info["test_results"]["l2_snapshot"] = {
                "success": True,
                "type": str(type(l2)),
                "data": str(l2)[:200] if l2 else None  # First 200 chars
            }
        except Exception as e:
            debug_info["test_results"]["l2_snapshot"] = {
                "success": False,
                "error": str(e)
            }
    else:
        debug_info["error"] = "info_client is None"
    
    return debug_info


@app.get("/api/logs")
async def get_logs(limit: int = 50):
    """Retorna os últimos logs de ordens"""
    try:
        log_dir = "backend/logs"
        today = datetime.now().strftime('%Y-%m-%d')
        log_file = os.path.join(log_dir, f"orders_{today}.txt")
        
        if not os.path.exists(log_file):
            return {
                "message": "Nenhum log encontrado para hoje",
                "log_file": log_file,
                "logs": []
            }
        
        with open(log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Retornar últimas N linhas
        recent_logs = lines[-limit:] if len(lines) > limit else lines
        
        return {
            "log_file": log_file,
            "total_lines": len(lines),
            "returned_lines": len(recent_logs),
            "logs": "".join(recent_logs)
        }
    except Exception as e:
        logger.error(f"Error reading logs: {e}")
        return {
            "error": str(e),
            "logs": []
        }


@app.get("/api/cache/prices")
async def get_cached_prices():
    """Retorna todos os preços do cache centralizado"""
    return {
        "success": True,
        "cache": price_cache,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/cache/prices/{symbol}")
async def get_cached_price(symbol: str):
    """Retorna preço do cache para um símbolo específico"""
    symbol_upper = symbol.upper()
    if symbol_upper in price_cache:
        return {
            "success": True,
            "symbol": symbol_upper,
            "data": price_cache[symbol_upper],
            "timestamp": datetime.now().isoformat()
        }
    return {
        "success": False,
        "error": f"Symbol {symbol_upper} not found in cache",
        "symbol": symbol_upper
    }


@app.get("/api/market/{symbol}")
async def get_market_data(symbol: str):
    """Retorna dados de mercado para o símbolo especificado - usa cache quando disponível"""
    global info_client, price_cache  # Declare global at the start of the function
    symbol_upper = symbol.upper()
    
    # Check cache first - if cache is recent (less than 5 seconds old), use it
    if symbol_upper in price_cache:
        cached = price_cache[symbol_upper]
        if cached.get("last_update") and cached.get("mid_price"):
            try:
                last_update = datetime.fromisoformat(cached["last_update"])
                age_seconds = (datetime.now() - last_update).total_seconds()
                if age_seconds < 5:  # Cache is fresh (less than 5 seconds old)
                    logger.info(f"✅ Using cached price for {symbol_upper}: {cached.get('mid_price')} (age: {age_seconds:.2f}s)")
                    return {
                        "symbol": symbol_upper,
                        "mid_price": cached.get("mid_price"),
                        "bid_price": cached.get("bid_price"),
                        "ask_price": cached.get("ask_price"),
                        "spread": cached.get("spread"),
                        "spread_percent": (cached.get("spread") / cached.get("mid_price")) * 100 if cached.get("spread") and cached.get("mid_price") else None,
                        "source": cached.get("source", "cache"),
                        "cached": True,
                        "last_update": cached.get("last_update")
                    }
            except Exception as e:
                logger.warning(f"Error checking cache age: {e}, fetching fresh data")
    
    # Try to get real market data from Hyperliquid API
    if not info_client:
        logger.error("=" * 80)
        logger.error("❌ Info client not initialized!")
        logger.error("=" * 80)
        mock_prices = {
            "BTC": 109950.5,
            "ETH": 3500.0,
            "SOL": 150.0,
        }
        return {
            "symbol": symbol,
            "asset_index": 0,
            "mid_price": mock_prices.get(symbol_upper, 1000.0),
            "bid_price": None,
            "ask_price": None,
            "spread": None,
            "spread_percent": None,
            "warning": "Info client not initialized - using mock data",
            "error": "Info client is None"
        }
    
    # Try to reinitialize if needed
    if info_client is None:
        try:
            logger.warning("Attempting to reinitialize info_client...")
            info_client = Info(base_url=BASE_URL, skip_ws=True)
            logger.info("✅ Info client reinitialized successfully")
        except Exception as e:
            logger.error(f"Failed to reinitialize info_client: {e}")
    
    try:
        logger.info(f"Getting market data for {symbol_upper}...")
        logger.info(f"Info client initialized: {info_client is not None}")
        
        # Get metadata to find asset index
        logger.info("Calling info_client.meta()...")
        meta = info_client.meta()
        logger.info(f"Meta response type: {type(meta)}")
        logger.info(f"Meta keys: {list(meta.keys()) if isinstance(meta, dict) else 'Not a dict'}")
        
        if not meta or "universe" not in meta:
            logger.error(f"Meta response: {meta}")
            raise Exception("Could not get metadata or 'universe' not found")
        
        # Find asset index for the symbol
        asset_index = None
        for i, asset in enumerate(meta.get("universe", [])):
            if asset.get("name") == symbol_upper:
                asset_index = i
                break
        
        if asset_index is None:
            raise Exception(f"Symbol {symbol_upper} not found in universe")
        
        # Get mid prices from all_mids()
        logger.info(f"Calling info_client.all_mids()...")
        logger.info(f"Looking for asset_index: {asset_index}")
        market_data = info_client.all_mids()
        logger.info(f"Market data type: {type(market_data)}")
        logger.info(f"Market data length: {len(market_data) if market_data else 0}")
        
        # Handle both dict and list responses
        if isinstance(market_data, dict):
            # If it's a dict, try to get by symbol name first, then by asset_index
            if symbol_upper in market_data:
                mid_price = float(market_data[symbol_upper])
                logger.info(f"Mid price for {symbol_upper} from dict: {mid_price}")
            else:
                # Try to convert to list if keys are numeric
                market_list = list(market_data.values()) if market_data else []
                if asset_index < len(market_list):
                    mid_price = float(market_list[asset_index])
                    logger.info(f"Mid price for {symbol_upper} at index {asset_index} from dict values: {mid_price}")
                else:
                    raise Exception(f"Asset index {asset_index} out of range (market data length: {len(market_list)})")
        elif isinstance(market_data, list):
            # If it's a list, access by index
            if asset_index >= len(market_data):
                raise Exception(f"Asset index {asset_index} out of range (market data length: {len(market_data)})")
            mid_price = float(market_data[asset_index])
            logger.info(f"Mid price for {symbol_upper} at index {asset_index}: {mid_price}")
        else:
            raise Exception(f"Unexpected market_data type: {type(market_data)}")
        
        if not market_data:
            raise Exception("all_mids() returned None or empty")
        
        if not mid_price or mid_price <= 0:
            raise Exception(f"Invalid mid price: {mid_price}")
        
        # Get bid/ask from l2_snapshot
        bid_price = None
        ask_price = None
        spread = None
        spread_percent = None
        
        try:
            l2_data = info_client.l2_snapshot(symbol_upper)
            logger.info(f"L2 snapshot data for {symbol_upper}: {l2_data}")
            
            if l2_data:
                # l2_snapshot typically returns: {"levels": [[price, size], ...]}
                # Or might be: {"bids": [[price, size], ...], "asks": [[price, size], ...]}
                # Or might be: [[price, size], ...] directly
                
                # Try different possible structures
                if isinstance(l2_data, dict):
                    # Check for "levels" key
                    if "levels" in l2_data:
                        levels = l2_data["levels"]
                    # Check for "bids" and "asks" keys
                    elif "bids" in l2_data and "asks" in l2_data:
                        bids = l2_data["bids"]
                        asks = l2_data["asks"]
                        if bids and len(bids) > 0 and isinstance(bids[0], (list, tuple)) and len(bids[0]) >= 1:
                            bid_price = float(bids[0][0])
                        if asks and len(asks) > 0 and isinstance(asks[0], (list, tuple)) and len(asks[0]) >= 1:
                            ask_price = float(asks[0][0])
                    # Check for "data" key that might contain levels
                    elif "data" in l2_data and isinstance(l2_data["data"], dict):
                        if "levels" in l2_data["data"]:
                            levels = l2_data["data"]["levels"]
                        elif "bids" in l2_data["data"] and "asks" in l2_data["data"]:
                            bids = l2_data["data"]["bids"]
                            asks = l2_data["data"]["asks"]
                            if bids and len(bids) > 0 and isinstance(bids[0], (list, tuple)) and len(bids[0]) >= 1:
                                bid_price = float(bids[0][0])
                            if asks and len(asks) > 0 and isinstance(asks[0], (list, tuple)) and len(asks[0]) >= 1:
                                ask_price = float(asks[0][0])
                    else:
                        # Try to find any list-like structure
                        for key, value in l2_data.items():
                            if isinstance(value, list) and len(value) > 0:
                                levels = value
                                break
                    
                    # If we have levels but not bid/ask yet, parse them
                    if 'levels' in locals() and levels and bid_price is None and ask_price is None:
                        if isinstance(levels, list) and len(levels) > 0:
                            # Try to parse levels - they might be [price, size] pairs
                            for level in levels:
                                if isinstance(level, (list, tuple)) and len(level) >= 1:
                                    price = float(level[0])
                                    # Find best bid (highest price below mid) and best ask (lowest price above mid)
                                    if price < mid_price:
                                        if bid_price is None or price > bid_price:
                                            bid_price = price
                                    elif price > mid_price:
                                        if ask_price is None or price < ask_price:
                                            ask_price = price
                
                elif isinstance(l2_data, list):
                    # l2_data is directly a list of levels
                    levels = l2_data
                    for level in levels:
                        if isinstance(level, (list, tuple)) and len(level) >= 1:
                            price = float(level[0])
                            if price < mid_price:
                                if bid_price is None or price > bid_price:
                                    bid_price = price
                            elif price > mid_price:
                                if ask_price is None or price < ask_price:
                                    ask_price = price
                
                # Calculate spread
                if bid_price and ask_price:
                    spread = ask_price - bid_price
                    spread_percent = (spread / mid_price) * 100 if mid_price > 0 else 0
                    logger.info(f"Bid/Ask from l2_snapshot: bid={bid_price}, ask={ask_price}, spread={spread}")
                elif bid_price or ask_price:
                    logger.warning(f"Only partial bid/ask data: bid={bid_price}, ask={ask_price}")
                    
        except Exception as e:
            logger.warning(f"Could not get bid/ask from l2_snapshot: {e}")
            import traceback
            logger.warning(traceback.format_exc())
        
        # Fallback: estimate bid/ask from mid price (±0.1%) if not available
        if not bid_price or not ask_price:
            if mid_price:
                if not bid_price:
                    bid_price = mid_price * 0.999
                if not ask_price:
                    ask_price = mid_price * 1.001
                spread = ask_price - bid_price
                spread_percent = (spread / mid_price) * 100 if mid_price > 0 else 0
                logger.info(f"Using estimated bid/ask from mid: bid={bid_price}, ask={ask_price}")
        
        logger.info(f"Market data for {symbol_upper}: mid={mid_price}, bid={bid_price}, ask={ask_price}, spread={spread}")
        
        # Update cache with fresh REST data
        price_cache[symbol_upper] = {
            "mid_price": mid_price,
            "bid_price": bid_price,
            "ask_price": ask_price,
            "spread": spread,
            "last_update": datetime.now().isoformat(),
            "source": "rest"
        }
        
        return {
            "symbol": symbol_upper,
            "asset_index": asset_index,
            "mid_price": mid_price,
            "bid_price": bid_price,
            "ask_price": ask_price,
            "spread": spread,
            "spread_percent": spread_percent,
            "calculated_mid": (bid_price + ask_price) / 2 if (bid_price and ask_price) else mid_price,
            "source": "rest",
            "cached": False
        }
        
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"❌ ERRO ao obter dados de mercado para {symbol_upper}:")
        logger.error(f"   Tipo: {type(e).__name__}")
        logger.error(f"   Mensagem: {str(e)}")
        logger.error("=" * 80)
        import traceback
        logger.error(traceback.format_exc())
        
        # Fallback to mock data on error
        mock_prices = {
            "BTC": 109950.5,
            "ETH": 3500.0,
            "SOL": 150.0,
        }
        return {
            "symbol": symbol_upper,
            "asset_index": 0,
            "mid_price": mock_prices.get(symbol_upper, 1000.0),
            "bid_price": None,
            "ask_price": None,
            "spread": None,
            "spread_percent": None,
            "error": str(e),
            "warning": f"Error getting real-time data: {e} - using mock data"
        }
    


def log_order_request(order_data: dict, result: dict = None, error: str = None):
    """Log order request to file"""
    try:
        log_dir = "backend/logs"
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, f"orders_{datetime.now().strftime('%Y-%m-%d')}.txt")
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write("\n" + "=" * 80 + "\n")
            f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Order Data: {order_data}\n")
            if result:
                f.write(f"Result: {result}\n")
            if error:
                f.write(f"ERROR: {error}\n")
            f.write("=" * 80 + "\n")
    except Exception as e:
        logger.error(f"Error writing to log file: {e}")


@app.post("/api/order")
async def create_order(order: OrderRequestModel):
    order_start_time = datetime.now()
    logger.info("\n" + "=" * 80)
    logger.info("NOVA REQUISIÇÃO DE ORDEM")
    logger.info(f"Timestamp: {order_start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Symbol: {order.symbol}")
    logger.info(f"Side: {order.side}")
    logger.info(f"Order Type: {order.order_type}")
    logger.info(f"Quantity USD: {order.quantity_usd}")
    logger.info(f"Size: {order.size}")
    logger.info(f"Price: {order.price}")
    logger.info(f"Leverage: {order.leverage}")
    logger.info(f"Take Profit: {order.takeprofit}")
    logger.info(f"Stop Loss: {order.stoploss}")
    logger.info("=" * 80)
    
    order_data = {
        "symbol": order.symbol,
        "side": order.side,
        "order_type": order.order_type,
        "quantity_usd": order.quantity_usd,
        "size": order.size,
        "price": order.price,
        "leverage": order.leverage,
        "takeprofit": order.takeprofit,
        "stoploss": order.stoploss
    }
    
    try:
        # Try to initialize exchange if not already done
        if not exchange:
            logger.warning("Exchange client nao inicializado. Tentando inicializar...")
            if not initialize_exchange():
                error_msg = "Exchange client not initialized. Please check your .env file and ensure ACCOUNT_ADDRESS and SECRET_KEY are set correctly (not the example values)."
                logger.error(f"ERRO: {error_msg}")
                log_order_request(order_data, error=error_msg)
                raise HTTPException(
                    status_code=500,
                    detail=error_msg
                )
        
        if not ACCOUNT_ADDRESS or not SECRET_KEY:
            raise HTTPException(
                status_code=500,
                detail="ACCOUNT_ADDRESS and SECRET_KEY must be set in .env file"
            )

        # Determine if it's a buy order
        is_buy = order.side.lower() == "buy"
        
        # If quantity_usd is provided, convert to size based on current price or limit price
        size = order.size if order.size is not None else 0
        if order.quantity_usd and order.quantity_usd > 0:
            # Use limit price if provided, otherwise get current market price
            price_for_calc = None
            if order.order_type.lower() == "limit" and order.price and order.price > 0:
                price_for_calc = order.price
                logger.info(f"Using limit price for size calculation: {price_for_calc}")
            else:
                # Get current market price
                try:
                    market_data = info_client.all_mids() if info_client else None
                    meta = info_client.meta() if info_client else None
                    if meta and market_data:
                        asset_index = None
                        for i, asset in enumerate(meta.get("universe", [])):
                            if asset["name"] == order.symbol:
                                asset_index = i
                                break
                        if asset_index is not None and asset_index < len(market_data):
                            price_for_calc = market_data[asset_index]
                            if price_for_calc and price_for_calc > 0:
                                logger.info(f"Using market price for size calculation: {price_for_calc}")
                except Exception as e:
                    logger.warning(f"Could not get market price for size calculation: {e}")
            
            if price_for_calc and price_for_calc > 0:
                size = order.quantity_usd / price_for_calc
                logger.info(f"Calculated size from quantity_usd ({order.quantity_usd}) / price ({price_for_calc}) = {size}")
        
        # Round size to appropriate precision based on asset szDecimals
        # This is CRITICAL to avoid float_to_wire rounding errors
        if size > 0 and info_client:
            try:
                meta = info_client.meta() if info_client else None
                if meta:
                    asset_info = next((a for a in meta.get("universe", []) if a["name"] == order.symbol.upper()), None)
                    if asset_info and "szDecimals" in asset_info:
                        sz_decimals = asset_info["szDecimals"]
                        logger.info(f"Asset {order.symbol.upper()} uses szDecimals: {sz_decimals}")
                        # Round to szDecimals precision
                        size_rounded = round(size, sz_decimals)
                        # Convert to string with 8 decimal places for SDK compatibility
                        size_str = f"{size_rounded:.8f}"
                        size = float(size_str)
                        logger.info(f"Size rounded to {sz_decimals} decimals: {size_rounded}, final size: {size}")
                    else:
                        # Default: round to 5 decimals for BTC (most common)
                        size_rounded = round(size, 5)
                        size_str = f"{size_rounded:.8f}"
                        size = float(size_str)
                        logger.warning(f"Could not get szDecimals, using default rounding to 5 decimals: {size}")
            except Exception as e:
                logger.warning(f"Could not round size based on szDecimals: {e}")
                # Fallback: round to 5 decimals
                size_rounded = round(size, 5)
                size_str = f"{size_rounded:.8f}"
                size = float(size_str)
                logger.warning(f"Using fallback rounding to 5 decimals: {size}")
        
        # Set leverage if provided
        if order.leverage and order.leverage > 0:
            try:
                # Update leverage for the symbol
                exchange.update_leverage(order.leverage, order.symbol, False)
            except Exception as e:
                print(f"Warning: Could not set leverage: {e}")
        
        # Build order type
        if order.order_type.lower() == "market":
            order_type = {"market": {}}
            # For market orders, price should be 0, not None (to avoid format string errors)
            price = 0
        else:
            order_type = {"limit": {"tif": "Gtc"}}  # Good Till Cancel
            # For limit orders, validate and round price to tick size
            # Hyperliquid BTC tick size is 0.01 (2 decimal places)
            # Round to 2 decimal places to match valid tick size
            price = float(order.price) if order.price and order.price > 0 else None
            if price:
                # Round to 2 decimal places (tick size 0.01)
                price = round(price, 2)
                logger.info(f"Limit order price (rounded to 2 decimals): {price}")
                
                # Validate price is within 80% of reference price (20% to 180% of mid price)
                # Hyperliquid requires: price cannot be more than 80% away from reference
                try:
                    market_data = info_client.all_mids() if info_client else None
                    meta = info_client.meta() if info_client else None
                    if meta and market_data:
                        asset_index = None
                        for i, asset in enumerate(meta.get("universe", [])):
                            if asset["name"] == order.symbol:
                                asset_index = i
                                break
                        if asset_index is not None and asset_index < len(market_data):
                            reference_price = market_data[asset_index]
                            if reference_price and reference_price > 0:
                                min_price = reference_price * 0.2  # 20% of reference
                                max_price = reference_price * 1.8  # 180% of reference
                                
                                if price < min_price or price > max_price:
                                    error_msg = (
                                        f"Order price cannot be more than 80% away from the reference price. "
                                        f"Reference price: {reference_price:.2f}, "
                                        f"Valid range: {min_price:.2f} - {max_price:.2f}, "
                                        f"Your price: {price:.2f}"
                                    )
                                    logger.error(f"❌ {error_msg}")
                                    log_order_request(order_data, error=error_msg)
                                    raise HTTPException(
                                        status_code=400,
                                        detail=error_msg
                                    )
                                logger.info(f"Price validation OK: {price:.2f} is within range ({min_price:.2f} - {max_price:.2f})")
                except HTTPException:
                    raise
                except Exception as e:
                    logger.warning(f"Could not validate price against reference: {e}")
                    # Continue anyway - let Hyperliquid API validate
            if not price:
                # If no price provided for limit order, get current market price
                try:
                    market_data = info_client.all_mids() if info_client else None
                    meta = info_client.meta() if info_client else None
                    if meta and market_data:
                        asset_index = None
                        for i, asset in enumerate(meta.get("universe", [])):
                            if asset["name"] == order.symbol:
                                asset_index = i
                                break
                        if asset_index is not None and asset_index < len(market_data):
                            price = market_data[asset_index]
                except Exception as e:
                    print(f"Warning: Could not get market price: {e}")
        
        # Final check: ensure size is properly rounded before sending
        # This prevents float_to_wire rounding errors in the SDK
        if size > 0:
            # Get szDecimals for final rounding
            sz_decimals_final = 5  # Default for BTC
            try:
                if info_client:
                    meta_final = info_client.meta() if info_client else None
                    if meta_final:
                        asset_info_final = next((a for a in meta_final.get("universe", []) if a["name"] == order.symbol.upper()), None)
                        if asset_info_final and "szDecimals" in asset_info_final:
                            sz_decimals_final = asset_info_final["szDecimals"]
            except:
                pass
            
            # Round to szDecimals and format to avoid rounding errors
            size_rounded_final = round(size, sz_decimals_final)
            size_str_final = f"{size_rounded_final:.8f}"
            size = float(size_str_final)
            logger.info(f"Final size before sending: {size} (rounded to {sz_decimals_final} decimals)")
        
        # Send order
        logger.info(f"Enviando ordem para Hyperliquid...")
        logger.info(f"  Symbol: {order.symbol}")
        logger.info(f"  Is Buy: {is_buy}")
        logger.info(f"  Size: {size}")
        logger.info(f"  Price: {price}")
        logger.info(f"  Order Type: {order_type}")
        
        result = exchange.order(
            order.symbol,
            is_buy,
            size,
            price,
            order_type
        )
        
        logger.info("=" * 80)
        logger.info("✅ ORDEM ENVIADA COM SUCESSO!")
        logger.info(f"Resultado da API: {result}")
        logger.info("=" * 80)
        
        response_data = {
            "success": True,
            "result": result,
            "order": {
                "symbol": order.symbol,
                "side": order.side,
                "size": size,
                "price": price,
                "order_type": order.order_type,
                "leverage": order.leverage,
                "takeprofit": order.takeprofit,
                "stoploss": order.stoploss
            }
        }
        
        # Log to file
        log_order_request(order_data, result=response_data)
        
        return response_data

    except HTTPException as http_ex:
        error_msg = str(http_ex.detail)
        logger.error("=" * 80)
        logger.error(f"❌ ERRO HTTP: {error_msg}")
        logger.error("=" * 80)
        log_order_request(order_data, error=error_msg)
        raise
    except Exception as e:
        error_msg = f"Error creating order: {str(e)}"
        logger.error("=" * 80)
        logger.error(f"❌ ERRO AO CRIAR ORDEM:")
        logger.error(f"   Tipo: {type(e).__name__}")
        logger.error(f"   Mensagem: {str(e)}")
        logger.error("=" * 80)
        import traceback
        logger.error(traceback.format_exc())
        log_order_request(order_data, error=error_msg)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )

