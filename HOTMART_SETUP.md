# Configuración del Webhook de Hotmart

Este documento explica cómo configurar el webhook de Hotmart para que se comunique con el backend de NestJS.

## 📍 Endpoint del Webhook

Una vez que el servidor esté en producción, deberás configurar la siguiente URL en Hotmart:

```
https://TU-DOMINIO.com/hotmart/webhook
```

Por ejemplo:
- Producción: `https://api.elsagrario.fin.ec/hotmart/webhook`
- Desarrollo local: `http://localhost:3000/hotmart/webhook`
- Desarrollo con ngrok: `https://tu-id.ngrok.io/hotmart/webhook`

## 🔧 Configuración en Hotmart

1. Ingresa a tu cuenta de **Hotmart**
2. Ve a **Configuración** > **Webhooks**
3. Crea un nuevo webhook con los siguientes datos:
   - **Nombre**: `Bitrix Integration - ULPIK PRIV`
   - **URL**: `https://TU-DOMINIO.com/hotmart/webhook`
   - **Versión**: `2.0.0` (Recomendado)
   - **Token (hottok)**: `ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc`

⚠️ **IMPORTANTE**: El token debe coincidir EXACTAMENTE con el configurado en el código del servidor.
   
4. Selecciona los eventos que deseas recibir:

### ✅ Eventos de Compras (9 eventos)
- `PURCHASE_COMPLETE` - Compra completada
- `PURCHASE_APPROVED` - Compra aprobada
- `PURCHASE_CANCELED` - Compra cancelada
- `PURCHASE_REFUNDED` - Compra reembolsada
- `PURCHASE_CHARGEBACK` - Chargeback realizado
- `PURCHASE_DELAYED` - Pago atrasado
- `PURCHASE_PROTEST` - Pago protestado
- `PURCHASE_BILLET_PRINTED` - Boleto impreso
- Otros eventos de compra

### ✅ Eventos de Suscripciones (3 eventos)
- `SUBSCRIPTION_CANCELLATION` - Cancelación de suscripción
- `SUBSCRIPTION_REACTIVATION` - Reactivación de suscripción
- Otros eventos de suscripción

### ✅ Eventos de Club (2 eventos)
- `SWITCH_PLAN` - Cambio de plan
- Otros eventos de club

### ✅ Otros Eventos (1 evento)
- Eventos adicionales según necesidad

## 🚀 Cómo Funciona

Cuando Hotmart detecta un evento (por ejemplo, una compra), enviará un POST a tu endpoint con información como:

```json
{
  "id": "abc123",
  "event": "PURCHASE_COMPLETE",
  "version": "2.0.0",
  "creation_date": 1638360000,
  "data": {
    "product": {
      "id": 123456,
      "name": "Curso de Ejemplo",
      "ucode": "curso-ejemplo"
    },
    "buyer": {
      "name": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "checkout_phone": "+593999999999"
    },
    "purchase": {
      "order_date": 1638360000,
      "price": {
        "value": 99.90,
        "currency_code": "USD"
      },
      "payment": {
        "method": "credit_card",
        "type": "visa"
      },
      "status": "approved",
      "transaction": "HP12345678"
    }
  }
}
```

## 🔄 Flujo de Integración con Bitrix

1. **Webhook recibido** → `POST /hotmart/webhook`
2. **Procesamiento del evento** → `HotmartService.processWebhook()`
3. **Acciones automáticas en Bitrix:**
   - Busca o crea el **contacto** en Bitrix
   - Busca o crea una **negociación (deal)** 
   - Registra una **actividad** con los detalles del evento
   - Actualiza el estado según el tipo de evento

## 🧪 Pruebas

### Probar el Endpoint en Local

```bash
# Iniciar el servidor en modo desarrollo
npm run start:dev

# El servidor estará disponible en http://localhost:3000
```

### Probar con cURL

```bash
curl -X POST http://localhost:3000/hotmart/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test123",
    "event": "PURCHASE_COMPLETE",
    "version": "2.0.0",
    "data": {
      "product": {
        "name": "Producto de Prueba"
      },
      "buyer": {
        "name": "Test User",
        "email": "test@ejemplo.com",
        "checkout_phone": "+593999999999"
      },
      "purchase": {
        "price": {
          "value": 99.90,
          "currency_code": "USD"
        }
      }
    }
  }'
```

### Probar el Endpoint de Test

```bash
curl -X POST http://localhost:3000/hotmart/test
```

## 📊 Documentación Swagger

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva en:

```
http://localhost:3000/api
```

Ahí encontrarás todos los endpoints disponibles, incluyendo ejemplos de payloads.

## 🔐 Seguridad (Recomendado)

Para producción, es recomendable:

1. **Validar el origen** de las peticiones (IP de Hotmart)
2. **Implementar un token secreto** compartido con Hotmart
3. **Usar HTTPS** para todas las comunicaciones
4. **Implementar rate limiting** para evitar abusos

## 📝 Personalización

### Configurar Embudo Específico para Hotmart en Bitrix

En el archivo `hotmart.service.ts`, línea 242, puedes descomentar y configurar:

```typescript
const { data } = await axios.post(dealAdd, {
  fields: {
    TITLE: `Hotmart: ${producto} - ${nombre}`,
    CONTACT_ID: contactId,
    OPPORTUNITY: precio,
    CURRENCY_ID: moneda,
    CATEGORY_ID: '7', // ⬅️ ID del embudo de Hotmart
    STAGE_ID: 'C7:NEW', // ⬅️ Etapa inicial del embudo
  },
});
```

Para obtener estos IDs:
1. Ve a Bitrix24 → CRM → Embudos
2. Crea un embudo específico para "Hotmart"
3. Anota el ID del embudo y las etapas

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Logs en producción
pm2 logs

# Ver estado de la aplicación
pm2 status
```

## 📞 Soporte

Si tienes problemas con la integración:
1. Revisa los logs del servidor
2. Verifica que la URL esté accesible desde internet
3. Prueba con el endpoint de test primero
4. Revisa la documentación de Hotmart: https://developers.hotmart.com/docs/pt-BR/v1/webhooks/

## 🔗 URLs Relacionadas

- Documentación de Webhooks Hotmart: https://developers.hotmart.com/docs/pt-BR/v1/webhooks/
- Bitrix24 REST API: https://training.bitrix24.com/rest_help/
- NestJS: https://docs.nestjs.com/

