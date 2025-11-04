# Script para iniciar Backend e Frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando Hyperliquid Trade Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se as pastas existem
if (-not (Test-Path "backend")) {
    Write-Host "ERRO: Pasta backend nao encontrada!" -ForegroundColor Red
    pause
    exit 1
}

if (-not (Test-Path "frontend")) {
    Write-Host "ERRO: Pasta frontend nao encontrada!" -ForegroundColor Red
    pause
    exit 1
}

# Verificar se o ambiente virtual existe
if (-not (Test-Path "backend\venv")) {
    Write-Host "ERRO: Ambiente virtual nao encontrado!" -ForegroundColor Red
    Write-Host "Execute: cd backend && python -m venv venv" -ForegroundColor Yellow
    pause
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "AVISO: node_modules nao encontrado. Instalando..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host "Iniciando Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload"

Start-Sleep -Seconds 3

Write-Host "Iniciando Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Servidores iniciados!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Os servidores estao rodando em janelas separadas." -ForegroundColor Cyan
Write-Host "Pressione qualquer tecla para fechar esta janela..." -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

