#!/bin/bash
# Script executado após o build para criar .env a partir das variáveis de ambiente

cat > .env << 'ENVEOF'
DB_HOST=${DB_HOST}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_PORT=${DB_PORT}
PORT=${PORT}
NODE_ENV=${NODE_ENV}
EMAIL_HOST=${EMAIL_HOST}
EMAIL_PORT=${EMAIL_PORT}
EMAIL_USER=${EMAIL_USER}
EMAIL_PASSWORD=${EMAIL_PASSWORD}
EMAIL_FROM=${EMAIL_FROM}
ENVEOF

# Substituir as variáveis manualmente para evitar problemas com caracteres especiais
sed -i "s|\${DB_HOST}|${DB_HOST}|g" .env
sed -i "s|\${DB_USER}|${DB_USER}|g" .env
sed -i "s|\${DB_PASSWORD}|${DB_PASSWORD}|g" .env
sed -i "s|\${DB_NAME}|${DB_NAME}|g" .env
sed -i "s|\${DB_PORT}|${DB_PORT}|g" .env
sed -i "s|\${PORT}|${PORT}|g" .env
sed -i "s|\${NODE_ENV}|${NODE_ENV}|g" .env
sed -i "s|\${EMAIL_HOST}|${EMAIL_HOST}|g" .env
sed -i "s|\${EMAIL_PORT}|${EMAIL_PORT}|g" .env
sed -i "s|\${EMAIL_USER}|${EMAIL_USER}|g" .env
sed -i "s|\${EMAIL_PASSWORD}|${EMAIL_PASSWORD}|g" .env
sed -i "s|\${EMAIL_FROM}|${EMAIL_FROM}|g" .env

echo "✅ .env criado com sucesso a partir das variáveis de ambiente"

