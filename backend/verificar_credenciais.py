#!/usr/bin/env python3
"""
Script para verificar se as credenciais estão configuradas corretamente
"""
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("VERIFICAÇÃO DE CREDENCIAIS")
print("=" * 60)
print()

ACCOUNT_ADDRESS = os.getenv("ACCOUNT_ADDRESS")
SECRET_KEY = os.getenv("SECRET_KEY")

# Verificar se existem
if not ACCOUNT_ADDRESS:
    print("[ERRO] ACCOUNT_ADDRESS nao encontrado no .env")
elif ACCOUNT_ADDRESS == "0xSEU_ENDERECO":
    print("[ERRO] ACCOUNT_ADDRESS ainda tem o valor de EXEMPLO: 0xSEU_ENDERECO")
    print("   Por favor, substitua pelo seu endereço real da Hyperliquid")
else:
    print(f"[OK] ACCOUNT_ADDRESS encontrado: {ACCOUNT_ADDRESS[:10]}...{ACCOUNT_ADDRESS[-4:]}")
    print(f"   Comprimento: {len(ACCOUNT_ADDRESS)} caracteres")
    if not ACCOUNT_ADDRESS.startswith("0x"):
        print("   ⚠️  AVISO: Endereços Ethereum geralmente começam com '0x'")
    if len(ACCOUNT_ADDRESS) != 42:
        print(f"   ⚠️  AVISO: Endereços Ethereum geralmente têm 42 caracteres (você tem {len(ACCOUNT_ADDRESS)})")

print()

if not SECRET_KEY:
    print("[ERRO] SECRET_KEY nao encontrado no .env")
elif SECRET_KEY == "SUA_CHAVE_PRIVADA":
    print("[ERRO] SECRET_KEY ainda tem o valor de EXEMPLO: SUA_CHAVE_PRIVADA")
    print("   Por favor, substitua pela sua chave privada real da Hyperliquid")
else:
    print(f"[OK] SECRET_KEY encontrado: {SECRET_KEY[:10]}...{SECRET_KEY[-4:]}")
    print(f"   Comprimento: {len(SECRET_KEY)} caracteres")
    if not SECRET_KEY.startswith("0x"):
        print("   [AVISO] Chaves privadas geralmente comecam com '0x'")
    if len(SECRET_KEY) != 66:
        print(f"   [AVISO] Chaves privadas devem ter 66 caracteres (0x + 64 hex) (voce tem {len(SECRET_KEY)})")
        if len(SECRET_KEY) == 42:
            print("   [ERRO CRITICO] Sua SECRET_KEY tem 42 caracteres - isso parece ser um ENDERECO, nao uma CHAVE PRIVADA!")
            print("   Chaves privadas sao diferentes de enderecos e devem ter 66 caracteres")

print()
print("=" * 60)

# Testar inicialização
if ACCOUNT_ADDRESS and SECRET_KEY and ACCOUNT_ADDRESS != "0xSEU_ENDERECO" and SECRET_KEY != "SUA_CHAVE_PRIVADA":
    print("Tentando inicializar Exchange client...")
    try:
        import eth_account
        from hyperliquid.exchange import Exchange
        from hyperliquid.utils import constants
        
        wallet = eth_account.Account.from_key(SECRET_KEY)
        print(f"[OK] Wallet criado com sucesso!")
        print(f"   Endereco da wallet: {wallet.address}")
        
        if wallet.address.lower() != ACCOUNT_ADDRESS.lower():
            print(f"[AVISO] O endereco da wallet ({wallet.address}) nao corresponde ao ACCOUNT_ADDRESS ({ACCOUNT_ADDRESS})")
        
        exchange = Exchange(wallet, constants.TESTNET_API_URL, account_address=ACCOUNT_ADDRESS)
        print("[OK] Exchange client inicializado com SUCESSO!")
        print("=" * 60)
        print("Tudo configurado corretamente!")
        
    except Exception as e:
        print(f"[ERRO] ERRO ao inicializar Exchange client:")
        print(f"   Tipo: {type(e).__name__}")
        print(f"   Mensagem: {str(e)}")
        import traceback
        traceback.print_exc()
else:
    print("[ERRO] Nao e possivel testar a inicializacao pois as credenciais nao estao corretas")
    print()
    print("PRÓXIMOS PASSOS:")
    print("1. Edite o arquivo backend/.env")
    print("2. Substitua ACCOUNT_ADDRESS pelo seu endereço real (começa com 0x)")
    print("3. Substitua SECRET_KEY pela sua chave privada real (começa com 0x)")
    print("4. Salve o arquivo")
    print("5. Execute este script novamente para verificar")

print("=" * 60)

