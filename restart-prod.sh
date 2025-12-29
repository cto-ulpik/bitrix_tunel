#!/bin/bash

# 🔄 Script para Reiniciar NestJS en Producción
# Uso: ./restart-prod.sh

set -e

echo "🔄 Reiniciando aplicación NestJS en producción..."
echo ""

# Configuración
SERVER="root@159.223.204.96"
APP_DIR="/var/www/bitrix_tunel"
PM2_APP_NAME="bitrix-tunnel"

echo "📥 Actualizando código desde GitHub..."
ssh $SERVER << 'ENDSSH'
cd /var/www/bitrix_tunel

echo "📦 Obteniendo últimos cambios..."
git pull origin master

echo "🔨 Recompilando aplicación NestJS..."
nest build

echo "🔄 Reiniciando aplicación con PM2..."
pm2 restart bitrix-tunnel

echo ""
echo "⏳ Esperando 3 segundos para que la app inicie..."
sleep 3

echo ""
echo "📊 Estado de la aplicación:"
pm2 status bitrix-tunnel

echo ""
echo "📋 Últimas 30 líneas de log:"
pm2 logs bitrix-tunnel --lines 30 --nostream

echo ""
echo "✅ Reinicio completado!"
ENDSSH

echo ""
echo "🌐 Para probar el endpoint:"
echo "   curl -X POST http://tunel.ulpik.com/api/hotmart/test"
echo ""
echo "📊 Para ver logs en tiempo real:"
echo "   ssh $SERVER 'pm2 logs $PM2_APP_NAME'"

