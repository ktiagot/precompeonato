#!/bin/bash
# Script executado após o build para criar .env a partir das variáveis de ambiente

cat > .env << EOF
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
EOF

echo "✅ .env criado com sucesso a partir das variáveis de ambiente"

