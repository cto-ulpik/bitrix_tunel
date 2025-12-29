#!/bin/bash

# 🚀 Script de Despliegue - Bitrix Tunnel
# Uso: ./deploy.sh

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue en producción..."
echo ""

# Configuración
SERVER="root@159.223.204.96"
APP_DIR="/var/www/bitrix_tunel"
PM2_APP_NAME="bitrix-tunnel"

echo "📦 Paso 1: Conectando al servidor y actualizando código..."
ssh $SERVER << 'ENDSSH'
cd /var/www/bitrix_tunel

echo "📥 Obteniendo últimos cambios de GitHub..."
git pull origin master

echo "📦 Instalando/actualizando dependencias..."
npm install

echo "🔨 Compilando aplicación..."
npm run build

echo "🔄 Reiniciando aplicación con PM2..."
pm2 restart bitrix-tunnel

echo "✅ Verificando estado..."
pm2 status bitrix-tunnel

echo ""
echo "📊 Últimas líneas de log:"
pm2 logs bitrix-tunnel --lines 20 --nostream

ENDSSH

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "🔍 Para ver logs en tiempo real:"
echo "   ssh $SERVER 'pm2 logs $PM2_APP_NAME'"
echo ""
echo "🌐 Para probar el endpoint:"
echo "   curl -X POST http://tunel.ulpik.com/api/hotmart/test"

