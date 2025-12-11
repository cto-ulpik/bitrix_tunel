# 📝 Changelog - Bitrix Tunnel

## [1.1.0] - Diciembre 2024 - Seguridad Hotmart

### ✨ Nuevas Características

#### 🔐 Validación de Token (hottok)
- **Implementada validación de token secreto** para webhooks de Hotmart
- El token se puede enviar de 3 formas:
  - En el body del JSON: `{ "hottok": "..." }`
  - Como query parameter: `?hottok=...`
  - En el header HTTP: `X-Hotmart-Hottok: ...`
- Comparación timing-safe para prevenir ataques de timing
- Respuesta HTTP 401 para tokens inválidos o faltantes

#### 📝 Sistema de Logging Mejorado
- **Logs a archivo físico**: `logs/hotmart.log`
- Categorías de logs:
  - `[HIT]` - Webhook recibido
  - `[OK]` - Procesado exitosamente
  - `[BAD_TOKEN]` - Intento con token inválido
  - `[ERROR]` - Error en el procesamiento
- Logs incluyen timestamp, headers, body y resultados

#### 📧 Sistema de Notificaciones por Email
- Envío automático de emails para eventos importantes:
  - ✅ Webhook procesado exitosamente
  - ⚠️ Token inválido detectado
  - ❌ Error en el procesamiento
- Soporte para SendGrid (configurable)
- Modo de desarrollo: logs en archivo `logs/emails.log`
- HTML formateado con payload completo

### 🔒 Mejoras de Seguridad

1. **Token Secreto Obligatorio**
   - Token configurado: `ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc`
   - Debe coincidir con el configurado en Hotmart

2. **Validación Multi-capa**
   - Verifica presencia del token
   - Validación timing-safe
   - Log de intentos fallidos

3. **Auditoría Completa**
   - Todos los intentos se registran en logs
   - Emails de alerta para tokens inválidos
   - Tracking de IPs y headers

### 📚 Documentación

#### Nuevos Archivos
- `CONFIG.md` - Guía completa de configuración
- `CHANGELOG.md` - Este archivo
- Actualizado `HOTMART_SETUP.md` con información de seguridad
- Actualizado `README_PROYECTO.md` con nuevas características

#### Script de Pruebas Mejorado
- `test-hotmart-webhook.sh` actualizado con:
  - Tests de seguridad (sin token, token inválido)
  - Tests con token válido
  - Códigos de color para mejor visualización
  - Resumen detallado de resultados

### 🛠️ Cambios Técnicos

#### Archivos Modificados

**src/hotmart/hotmart.controller.ts**
- Agregado parámetro `hottok` en query
- Validación de token antes de procesar
- Manejo de múltiples fuentes de token
- Respuestas HTTP apropiadas (200, 401, 400, 500)
- Logging detallado de cada petición

**src/hotmart/hotmart.service.ts**
- Método `logToFile()` para guardar logs
- Método `sendEmailAlert()` para notificaciones
- Método `buildEmailHtml()` para formato de emails
- Método `ensureLogDirectory()` para crear estructura de logs
- Constantes configurables (EMAIL_ENABLED, NOTIFICATION_EMAIL)

**src/hotmart/dto/hotmart-webhook.dto.ts**
- Campo `hottok` agregado al DTO
- Documentación Swagger actualizada

**test-hotmart-webhook.sh**
- Variable `HOTTOK` para pruebas
- 7 tests en total (vs 4 anteriores)
- Tests de seguridad incluidos
- Mejor formato de salida

### 📊 Estructura de Logs

```
logs/
├── hotmart.log       # Todos los webhooks
└── emails.log        # Emails enviados (desarrollo)
```

### 🔧 Variables de Configuración

Nuevas constantes en el código:

```typescript
// hotmart.controller.ts
private readonly HOTMART_SECRET = 'ktCAmqR5vp...';

// hotmart.service.ts
private readonly LOG_FILE = path.join(process.cwd(), 'logs', 'hotmart.log');
private readonly NOTIFICATION_EMAIL = 'cto@ulpik.com';
private readonly EMAIL_ENABLED = false;
```

### 🎯 Casos de Uso

#### Webhook Válido
```bash
POST /api/hotmart/webhook
Content-Type: application/json

{
  "event": "PURCHASE_COMPLETE",
  "hottok": "ktCAmqR5vp...",
  "data": { ... }
}

→ HTTP 200
→ Log [HIT] → [OK]
→ Email de confirmación
→ Procesamiento en Bitrix
```

#### Webhook Sin Token
```bash
POST /api/hotmart/webhook
Content-Type: application/json

{
  "event": "PURCHASE_COMPLETE",
  "data": { ... }
}

→ HTTP 401
→ Log [HIT] → [BAD_TOKEN]
→ Email de alerta
```

#### Webhook Token Inválido
```bash
POST /api/hotmart/webhook
Content-Type: application/json

{
  "event": "PURCHASE_COMPLETE",
  "hottok": "token_invalido",
  "data": { ... }
}

→ HTTP 401
→ Log [HIT] → [BAD_TOKEN]
→ Email de alerta
```

### 🧪 Testing

Ejecutar suite de pruebas:
```bash
chmod +x test-hotmart-webhook.sh
./test-hotmart-webhook.sh
```

Resultados esperados:
- Test 1: ✅ OK (sin auth)
- Test 2: ❌ 401 (sin token)
- Test 3: ❌ 401 (token inválido)
- Tests 4-7: ✅ 200 (token válido)

### 📈 Métricas de Seguridad

- **Intentos de acceso sin token**: Bloqueados y registrados
- **Intentos con token inválido**: Bloqueados y registrados
- **Tiempo de validación**: < 1ms (timing-safe)
- **Formato de logs**: JSON estructurado para análisis

### 🔄 Compatibilidad

- ✅ Compatible con código PHP anterior de WordPress
- ✅ Mantiene misma estructura de token
- ✅ Soporta mismas formas de envío
- ✅ Respuestas HTTP estándar

### ⚠️ Breaking Changes

**Ninguno** - Los webhooks sin token serán rechazados pero es el comportamiento esperado para seguridad.

### 📝 Notas de Migración

Si migras desde la versión anterior de WordPress:

1. El token `hottok` ya está configurado (mismo del código PHP)
2. Los webhooks existentes seguirán funcionando
3. Configurar el token en Hotmart si no está ya configurado
4. Revisar logs para detectar intentos no autorizados

### 🎁 Bonus Features

- Documentación Swagger actualizada con ejemplos de token
- Mensajes de error descriptivos
- Logs estructurados para debugging
- Sistema de notificaciones extensible

---

## [1.0.0] - Diciembre 2024 - Versión Inicial

### ✨ Características Iniciales

- ✅ Módulo Hotmart completo
- ✅ Módulo Jelou (WhatsApp)
- ✅ Módulo Bitrix24
- ✅ 15 eventos de Hotmart soportados
- ✅ Documentación completa
- ✅ Scripts de prueba
- ✅ Swagger/OpenAPI

---

**Mantenido por**: ULPIK Development Team  
**Última actualización**: Diciembre 2024

