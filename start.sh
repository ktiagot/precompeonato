#!/bin/bash
# Script para manter o servidor rodando

cd "$(dirname "$0")"

# Criar diretório de logs se não existir
mkdir -p logs

# Matar processos antigos
pkill -f "node server.js" 2>/dev/null

# Iniciar servidor com logs
nohup node server.js >> logs/app.log 2>&1 &

echo "Servidor iniciado - logs em logs/app.log"
