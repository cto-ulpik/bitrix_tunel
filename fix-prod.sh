#!/bin/bash

# 🔧 Script para Resolver Problemas y Reiniciar en Producción
# Uso: ./fix-prod.sh

set -e

echo "🔧 Resolviendo problemas y reiniciando aplicación..."
echo ""

# Configuración
SERVER="root@159.223.204.96"

echo "📥 Conectando al servidor..."
ssh $SERVER << 'ENDSSH'
cd /var/www/bitrix_tunel

echo "📦 Guardando cambios locales de package-lock.json..."
git stash

echo "🗑️  Eliminando database.sqlite (si existe)..."
rm -f database.sqlite

echo "📥 Obteniendo últimos cambios de GitHub..."
git pull origin master

echo "📦 Instalando dependencias (por si hay cambios)..."
npm install

echo "🔨 Compilando aplicación NestJS..."
npm run build

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
echo "✅ Proceso completado!"
ENDSSH

echo ""
echo "🌐 Para probar el endpoint:"
echo "   curl -X POST http://tunel.ulpik.com/api/hotmart/test"

