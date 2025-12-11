# 🔧 Guía de Configuración

Este documento detalla todas las variables de configuración del proyecto.

## 📋 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

### 🖥️ Servidor

```env
PORT=3333
NODE_ENV=development
```

### 🎯 Bitrix24 CRM

```env
BITRIX_DOMAIN=bitrix.elsagrario.fin.ec
BITRIX_USER_ID=138
```

**Tokens REST API de Bitrix:**
```env
BITRIX_TOKEN_LEAD_ADD=yk2aztg75p2nn0ia
BITRIX_TOKEN_ACTIVITY_ADD=cfa8x0ca0m4euzxg
BITRIX_TOKEN_DEAL_UPDATE=18i0vg3zyg5kxi9v
BITRIX_TOKEN_CONTACT_LIST=fvpaq81k0yvk9eas
BITRIX_TOKEN_CONTACT_ADD=tnnabkmaf49qy5w8
BITRIX_TOKEN_DEAL_ADD=wswyvle82l8ajlut
BITRIX_TOKEN_DEAL_LIST=uu3tnphw928s8cxn
```

### 💬 Jelou (WhatsApp)

```env
JELOU_API_BASE=https://api.jelou.ai
JELOU_BOT_ID=2608e658-6100-41ec-905f-26eac23c47b8
JELOU_CLIENT_ID=S7U3JRPID6drZjpJJejDjznygNee8Qvw
JELOU_CLIENT_SECRET=pfAJNqbmRFai2rtYtUgQVmzbf4MUgqd6dRwCgCg1RDUStLqfQQ7QJ8XAPRjD0OCe
JELOU_TIMEOUT_MS=8000
```

### 🛒 Hotmart Webhooks

```env
# Token secreto - DEBE coincidir con el configurado en Hotmart
HOTMART_SECRET=ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc
```

⚠️ **IMPORTANTE**: Este token debe configurarse también en el panel de Hotmart al crear el webhook.

### 📧 Notificaciones por Email

```env
EMAIL_ENABLED=false
NOTIFICATION_EMAIL=cto@ulpik.com
```

Para habilitar emails con SendGrid:
```env
EMAIL_ENABLED=true
SENDGRID_API_KEY=tu_api_key_aqui
```

### 📝 Logs

```env
LOG_LEVEL=debug
LOG_DIR=./logs
```

---

## 🔐 Configuración de Seguridad - Token de Hotmart

### ¿Qué es el hottok?

El `hottok` es un token de seguridad compartido entre Hotmart y tu servidor. Su función es:
- ✅ Verificar que las peticiones provienen realmente de Hotmart
- ✅ Prevenir webhooks falsos o maliciosos
- ✅ Asegurar la integridad de la comunicación

### Cómo configurarlo:

1. **En tu código (ya está configurado):**
   - Ubicación: `src/hotmart/hotmart.controller.ts`
   - Línea: `private readonly HOTMART_SECRET = '...'`
   - Token actual: `ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc`

2. **En Hotmart:**
   - Ve a tu panel de Hotmart
   - Configuración → Webhooks
   - Al crear/editar el webhook, configura el parámetro `hottok` con el **mismo valor**

3. **Formas de enviar el token:**

   Hotmart puede enviar el token de 3 formas (todas soportadas):

   a) **En el body del JSON:**
   ```json
   {
     "event": "PURCHASE_COMPLETE",
     "hottok": "ktCAmqR5vpcqxdtW...",
     "data": { ... }
   }
   ```

   b) **Como query parameter:**
   ```
   POST /api/hotmart/webhook?hottok=ktCAmqR5vpcqxdtW...
   ```

   c) **En el header HTTP:**
   ```
   X-Hotmart-Hottok: ktCAmqR5vpcqxdtW...
   ```

---

## 🏗️ Configuración de Bitrix

### Embudos (Funnels)

El sistema usa embudos específicos para cada integración:

- **Embudo Jelou**: `CATEGORY_ID: 6`
  - Etapa inicial: `C6:NEW`
  
- **Embudo Hotmart**: Configurable en `hotmart.service.ts`
  - Recomendado: Crear embudo específico para Hotmart
  - Ejemplo: `CATEGORY_ID: 7`, `STAGE_ID: C7:NEW`

### Campos Personalizados

- **Respuesta desde Bitrix**: `UF_CRM_1753983007521`
  - Campo de texto para que el asesor escriba respuestas
  - Se envía automáticamente a WhatsApp vía Jelou

---

## 📁 Estructura de Logs

Los logs se guardan en el directorio `logs/`:

```
logs/
├── hotmart.log       # Todos los webhooks de Hotmart
└── emails.log        # Emails enviados (cuando EMAIL_ENABLED=true)
```

### Formato de logs:

```
2024-12-11T10:30:45.123Z [HIT] → {"event":"PURCHASE_COMPLETE",...}
2024-12-11T10:30:45.234Z [OK] → {"status":"compra procesada",...}
2024-12-11T10:30:50.456Z [BAD_TOKEN] → {"error":"Token inválido",...}
```

---

## 🌐 URLs en Producción

Configura estos endpoints en los servicios externos:

### Hotmart
```
URL: https://TU-DOMINIO.com/api/hotmart/webhook
Método: POST
Token: Agregar hottok en la configuración
```

### Jelou
```
URL: https://TU-DOMINIO.com/api/jelou/webhook
Método: POST
```

---

## 🧪 Testing

### Variables para testing local:

```bash
# URL base
BASE_URL="http://localhost:3333/api"

# Token de prueba
HOTTOK="ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc"
```

### Script de pruebas:

```bash
./test-hotmart-webhook.sh
```

---

## 🔒 Mejores Prácticas de Seguridad

1. **Token Único**: Genera un token único y complejo para Hotmart
2. **HTTPS**: Siempre usa HTTPS en producción
3. **Variables de Entorno**: Nunca subas el archivo `.env` al repositorio
4. **Rotación**: Considera cambiar el token periódicamente
5. **Logs**: Revisa los logs regularmente para detectar intentos de acceso no autorizado
6. **Rate Limiting**: Implementa límite de peticiones por IP
7. **Whitelist IP**: Si es posible, restringe acceso solo a IPs de Hotmart

---

## 📊 Monitoreo

### Logs a revisar:

- ✅ `[HIT]` - Webhook recibido
- ✅ `[OK]` - Procesado exitosamente
- ⚠️ `[BAD_TOKEN]` - Intento con token inválido
- ❌ `[ERROR]` - Error en el procesamiento

### Alertas recomendadas:

- Múltiples `[BAD_TOKEN]` en poco tiempo
- Incremento inusual de webhooks
- Errores recurrentes en el procesamiento

---

## 🆘 Troubleshooting

### "Token inválido" (401)

**Problema**: El webhook responde con error 401
**Solución**:
1. Verifica que el token en Hotmart sea exactamente igual al del código
2. Revisa los logs: `tail -f logs/hotmart.log`
3. No debe haber espacios ni caracteres extra

### Webhooks no llegan

**Problema**: No se reciben notificaciones
**Solución**:
1. Verifica que el servidor esté accesible desde internet
2. Prueba la URL desde fuera: `curl https://TU-DOMINIO.com/api/hotmart/test`
3. Revisa la configuración en Hotmart
4. Verifica logs del servidor

### No se crean contactos en Bitrix

**Problema**: El webhook se procesa pero no aparece en Bitrix
**Solución**:
1. Verifica los tokens REST API de Bitrix
2. Revisa que el teléfono tenga formato válido
3. Comprueba permisos del usuario en Bitrix
4. Revisa logs para ver el error específico

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0.0

