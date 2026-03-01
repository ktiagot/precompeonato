#!/bin/bash
# Script para atualizar o código no VPS

echo "=== Atualizando código no VPS ==="

cd /var/www/precompeonato

echo "1. Verificando branch atual..."
git branch

echo "2. Fazendo pull das mudanças..."
git pull origin master

echo "3. Verificando se a query foi atualizada..."
grep -n "ORDER BY COUNT(h.id) DESC" server.js | head -3

echo "4. Reiniciando PM2..."
pm2 restart precompeonato

echo "5. Aguardando 3 segundos..."
sleep 3

echo "6. Verificando logs..."
pm2 logs precompeonato --lines 20 --nostream

echo "=== Atualização concluída ==="
