#!/bin/bash
# Script para manter o servidor rodando

cd "$(dirname "$0")"

# Matar processos antigos
pkill -f "node server.js" 2>/dev/null

# Iniciar servidor
nohup node server.js > /dev/null 2>&1 &

echo "Servidor iniciado"
