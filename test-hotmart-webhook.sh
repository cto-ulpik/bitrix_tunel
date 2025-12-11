#!/bin/bash

# Script de prueba para el webhook de Hotmart
# Asegúrate de que el servidor esté corriendo antes de ejecutar este script

BASE_URL="http://localhost:3333/api"

# Token de seguridad (debe coincidir con el configurado en el servidor)
HOTTOK="ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc"

echo "=================================================="
echo "🧪 Pruebas del Webhook de Hotmart"
echo "=================================================="
echo ""
echo "🔐 Token: ${HOTTOK:0:20}...${HOTTOK: -10}"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Endpoint de prueba
echo -e "${BLUE}Test 1: Endpoint de prueba${NC}"
curl -X POST "${BASE_URL}/hotmart/test" \
  -H "Content-Type: application/json" \
  -s | jq '.'
echo ""
echo ""

# Test 2: Sin token (debería fallar)
echo -e "${YELLOW}Test 2: Sin Token (debería fallar con 401)${NC}"
curl -X POST "${BASE_URL}/hotmart/webhook" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "id": "test-no-token",
    "event": "PURCHASE_COMPLETE",
    "version": "2.0.0",
    "data": {
      "product": { "name": "Test Sin Token" },
      "buyer": { "name": "Test", "checkout_phone": "+593999999999" }
    }
  }' \
  -s | jq '.'
echo ""
echo ""

# Test 3: Token inválido (debería fallar)
echo -e "${YELLOW}Test 3: Token Inválido (debería fallar con 401)${NC}"
curl -X POST "${BASE_URL}/hotmart/webhook" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "id": "test-bad-token",
    "event": "PURCHASE_COMPLETE",
    "version": "2.0.0",
    "hottok": "token_invalido_123",
    "data": {
      "product": { "name": "Test Token Inválido" },
      "buyer": { "name": "Test", "checkout_phone": "+593999999999" }
    }
  }' \
  -s | jq '.'
echo ""
echo ""

# Test 4: Compra aprobada CON TOKEN (debería funcionar)
echo -e "${GREEN}Test 4: Compra Aprobada CON TOKEN (PURCHASE_COMPLETE)${NC}"
curl -X POST "${BASE_URL}/hotmart/webhook" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "id": "test-001",
    "event": "PURCHASE_COMPLETE",
    "version": "2.0.0",
    "creation_date": 1638360000,
    "hottok": "'"${HOTTOK}"'",
    "data": {
      "product": {
        "id": 123456,
        "name": "Curso ULPIK PRIV - Test",
        "ucode": "ulpik-priv"
      },
      "buyer": {
        "name": "Juan Pérez Test",
        "email": "juan.test@ejemplo.com",
        "checkout_phone": "+593999999999"
      },
      "purchase": {
        "order_date": 1638360000,
        "price": {
          "value": 199.90,
          "currency_code": "USD"
        },
        "payment": {
          "method": "credit_card",
          "type": "visa"
        },
        "status": "approved",
        "transaction": "HP-TEST-12345"
      }
    }
  }' \
  -s | jq '.'
echo ""
echo ""

# Test 5: Cancelación de compra
echo -e "${GREEN}Test 5: Cancelación de Compra CON TOKEN (PURCHASE_CANCELED)${NC}"
curl -X POST "${BASE_URL}/hotmart/webhook" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "id": "test-002",
    "event": "PURCHASE_CANCELED",
    "version": "2.0.0",
    "creation_date": 1638360000,
    "hottok": "'"${HOTTOK}"'",
    "data": {
      "product": {
        "id": 123456,
        "name": "Curso ULPIK PRIV - Test",
        "ucode": "ulpik-priv"
      },
      "buyer": {
        "name": "María García Test",
        "email": "maria.test@ejemplo.com",
        "checkout_phone": "+593988888888"
      },
      "purchase": {
        "status": "canceled"
      }
    }
  }' \
  -s | jq '.'
echo ""
echo ""

# Test 6: Cancelación de suscripción
echo -e "${GREEN}Test 6: Cancelación de Suscripción CON TOKEN (SUBSCRIPTION_CANCELLATION)${NC}"
curl -X POST "${BASE_URL}/hotmart/webhook" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "id": "test-003",
    "event": "SUBSCRIPTION_CANCELLATION",
    "version": "2.0.0",
    "creation_date": 1638360000,
    "hottok": "'"${HOTTOK}"'",
    "data": {
      "product": {
        "id": 123456,
        "name": "Membresía ULPIK PRIV - Test",
        "ucode": "membresia-ulpik"
      },
      "subscription": {
        "status": "canceled",
        "subscriber": {
          "name": "Pedro López Test",
          "email": "pedro.test@ejemplo.com",
          "phone": "+593977777777"
        },
        "plan": {
          "name": "Plan Premium"
        }
      }
    }
  }' \
  -s | jq '.'
echo ""
echo ""

# Test 7: Token por query parameter
echo -e "${GREEN}Test 7: Token en Query Parameter${NC}"
curl -X POST "${BASE_URL}/hotmart/webhook?hottok=${HOTTOK}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "id": "test-004",
    "event": "PURCHASE_COMPLETE",
    "version": "2.0.0",
    "data": {
      "product": { "name": "Test Query Param" },
      "buyer": {
        "name": "Test User",
        "checkout_phone": "+593966666666"
      },
      "purchase": {
        "price": { "value": 50.00, "currency_code": "USD" }
      }
    }
  }' \
  -s | jq '.'
echo ""
echo ""

echo -e "${GREEN}=================================================="
echo "✅ Pruebas completadas"
echo "==================================================${NC}"
echo ""
echo "📊 Resumen:"
echo "  - Test 1: Endpoint de prueba (sin autenticación)"
echo "  - Test 2: Sin token (❌ debería fallar)"
echo "  - Test 3: Token inválido (❌ debería fallar)"
echo "  - Test 4-7: Con token válido (✅ deberían funcionar)"
echo ""
echo "📂 Verifica los logs:"
echo "  - Logs de webhook: logs/hotmart.log"
echo "  - Logs de emails: logs/emails.log"
echo ""
echo "🎯 Verifica en Bitrix24:"
echo "  - Contactos creados"
echo "  - Negociaciones generadas"
echo "  - Actividades registradas"
echo ""

