# Script para parar Backend e Frontend
Write-Host "Parando servidores..." -ForegroundColor Yellow

# Parar processos Python/Uvicorn (Backend)
Get-Process | Where-Object {
    $_.ProcessName -like "*python*" -or 
    $_.ProcessName -like "*uvicorn*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Parar processos Node (Frontend)
Get-Process | Where-Object {
    $_.ProcessName -like "*node*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Servidores parados!" -ForegroundColor Green
Start-Sleep -Seconds 1

