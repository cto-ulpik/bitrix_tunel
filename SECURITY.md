# 🔐 Guía de Seguridad - Bitrix Tunnel

## 🎯 Resumen Ejecutivo

Este documento describe las medidas de seguridad implementadas en el sistema de webhooks, especialmente para la integración con Hotmart.

---

## 🛡️ Arquitectura de Seguridad

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOTMART                                 │
│                     (Origen del Webhook)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /api/hotmart/webhook
                         │ + hottok token
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE VALIDACIÓN                           │
│                                                                 │
│  1. ¿Token presente?        → NO  → HTTP 401 + Log + Email    │
│  2. ¿Token válido?          → NO  → HTTP 401 + Log + Email    │
│  3. ¿Estructura válida?     → NO  → HTTP 400 + Log             │
│                                                                 │
│                    ↓ Todas las validaciones OK                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PROCESAMIENTO SEGURO                          │
│                                                                 │
│  • Log completo de la petición                                 │
│  • Procesamiento del evento                                    │
│  • Integración con Bitrix                                      │
│  • Email de confirmación                                       │
│  • HTTP 200 + Resultado                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Sistema de Autenticación - Token (hottok)

### ¿Qué es el hottok?

El `hottok` es un **token de seguridad compartido** (shared secret) entre Hotmart y tu servidor.

### Características

- **Tipo**: String de 73 caracteres
- **Formato**: Alfanumérico con guiones
- **Ubicación**: Hardcoded en el código (temporal) o variable de entorno (recomendado)
- **Validación**: Timing-safe comparison

### Token Actual

```
ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc
```

⚠️ **IMPORTANTE**: Este token debe mantenerse secreto y no exponerse públicamente.

### Formas de Envío Soportadas

#### 1. En el Body (Recomendado)
```json
{
  "event": "PURCHASE_COMPLETE",
  "hottok": "ktCAmqR5vpcqxdtW...",
  "data": { ... }
}
```

#### 2. Query Parameter
```
POST /api/hotmart/webhook?hottok=ktCAmqR5vpcqxdtW...
```

#### 3. Header HTTP
```
X-Hotmart-Hottok: ktCAmqR5vpcqxdtW...
```

---

## 🔒 Validación Timing-Safe

### ¿Por qué es importante?

La comparación normal de strings (`a === b`) puede ser vulnerable a **timing attacks**, donde un atacante mide el tiempo de respuesta para adivinar el token carácter por carácter.

### Implementación

```typescript
private secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
```

### Ventajas

- ✅ Tiempo de ejecución constante
- ✅ No revela información sobre el token
- ✅ Previene ataques de timing

---

## 📝 Sistema de Auditoría

### Logs Automáticos

Todos los intentos de acceso se registran en `logs/hotmart.log`:

#### Formato
```json
{
  "timestamp": "2024-12-11T10:30:45.123Z",
  "level": "HIT|OK|BAD_TOKEN|ERROR",
  "headers": { ... },
  "body": { ... },
  "result": { ... }
}
```

#### Niveles de Log

| Nivel | Descripción | Acción |
|-------|-------------|--------|
| `HIT` | Webhook recibido | Log inicial |
| `OK` | Procesado exitosamente | Log + Email de confirmación |
| `BAD_TOKEN` | Token inválido/faltante | Log + Email de alerta |
| `ERROR` | Error en procesamiento | Log + Email de error |

---

## 📧 Sistema de Alertas

### Emails Automáticos

Se envían emails para:

1. **✅ Webhook Exitoso**
   - Asunto: `[Hotmart Webhook] ✅ OK - PURCHASE_COMPLETE`
   - Contenido: Payload completo, headers, resultado

2. **⚠️ Token Inválido**
   - Asunto: `[Hotmart Webhook] 🚨 BAD_TOKEN - Token inválido`
   - Contenido: Token recibido (parcial), IP, headers

3. **⚠️ Sin Token**
   - Asunto: `[Hotmart Webhook] ⚠️ BAD_TOKEN - Sin token`
   - Contenido: Payload recibido, IP, headers

4. **❌ Error de Procesamiento**
   - Asunto: `[Hotmart Webhook] ❌ ERROR`
   - Contenido: Error message, stack trace, payload

### Destinatario

```typescript
private readonly NOTIFICATION_EMAIL = 'cto@ulpik.com';
```

### Activar/Desactivar

```typescript
private readonly EMAIL_ENABLED = false; // true para activar
```

---

## 🚨 Detección de Amenazas

### Indicadores de Compromiso

Monitorea los logs en busca de:

#### 1. Múltiples BAD_TOKEN
```bash
grep "BAD_TOKEN" logs/hotmart.log | tail -20
```

**Alerta si**: Más de 5 en 1 hora desde la misma IP.

#### 2. Tokens Similares
```bash
grep "token_received" logs/hotmart.log
```

**Alerta si**: Patrones de fuerza bruta (tokens secuenciales, incrementales).

#### 3. Volumen Inusual
```bash
wc -l logs/hotmart.log
```

**Alerta si**: Incremento >200% vs promedio diario.

---

## 🛠️ Mejores Prácticas

### ✅ DO (Hacer)

1. **Usar HTTPS en producción**
   ```nginx
   server {
     listen 443 ssl;
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
   }
   ```

2. **Rotar el token periódicamente**
   - Recomendado: Cada 6 meses
   - Proceso: Generar nuevo token → Actualizar Hotmart → Actualizar código

3. **Limitar acceso por IP (opcional)**
   ```nginx
   location /api/hotmart/webhook {
     allow 191.232.0.0/16;  # IPs de Hotmart
     deny all;
   }
   ```

4. **Implementar rate limiting**
   ```typescript
   @UseGuards(ThrottlerGuard)
   @Throttle(10, 60) // 10 requests por minuto
   async receiveWebhook() { ... }
   ```

5. **Revisar logs regularmente**
   ```bash
   tail -f logs/hotmart.log
   ```

### ❌ DON'T (No hacer)

1. ❌ Subir el token al repositorio público
2. ❌ Compartir logs que contengan el token
3. ❌ Desactivar la validación "temporalmente"
4. ❌ Usar HTTP en producción
5. ❌ Ignorar alertas de BAD_TOKEN

---

## 🔧 Configuración de Producción

### 1. Variables de Entorno

**NO hacer esto** (hardcoded):
```typescript
private readonly HOTMART_SECRET = 'ktCAmqR5vp...'; // ❌
```

**Hacer esto** (variable de entorno):
```typescript
private readonly HOTMART_SECRET = process.env.HOTMART_SECRET; // ✅
```

### 2. Archivo .env

```env
HOTMART_SECRET=ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc
```

### 3. .gitignore

```gitignore
.env
.env.local
.env.production
*.log
logs/
```

---

## 📊 Monitoreo y Métricas

### KPIs de Seguridad

| Métrica | Objetivo | Alerta si |
|---------|----------|-----------|
| BAD_TOKEN/día | < 5 | > 20 |
| Tasa de éxito | > 99% | < 95% |
| Tiempo de respuesta | < 500ms | > 2000ms |
| IPs únicas/día | < 10 | > 50 |

### Dashboard Básico

```bash
# Total de webhooks hoy
grep "$(date +%Y-%m-%d)" logs/hotmart.log | wc -l

# Webhooks exitosos
grep "$(date +%Y-%m-%d).*OK" logs/hotmart.log | wc -l

# Tokens inválidos
grep "$(date +%Y-%m-%d).*BAD_TOKEN" logs/hotmart.log | wc -l

# IPs únicas
grep "$(date +%Y-%m-%d)" logs/hotmart.log | grep -o '"ip":"[^"]*"' | sort -u | wc -l
```

---

## 🆘 Plan de Respuesta a Incidentes

### Si detectas un ataque

1. **Inmediato** (< 5 minutos)
   ```bash
   # Revisar logs recientes
   tail -100 logs/hotmart.log | grep BAD_TOKEN
   
   # Identificar IPs atacantes
   grep BAD_TOKEN logs/hotmart.log | grep -o '"ip":"[^"]*"'
   ```

2. **Corto plazo** (< 1 hora)
   - Cambiar el token inmediatamente
   - Actualizar en Hotmart y en el código
   - Bloquear IPs maliciosas en firewall

3. **Mediano plazo** (< 24 horas)
   - Revisar todos los logs del día
   - Verificar si hubo accesos exitosos no autorizados
   - Notificar al equipo
   - Documentar el incidente

4. **Largo plazo** (< 1 semana)
   - Implementar medidas adicionales (IP whitelist, rate limiting)
   - Revisar toda la infraestructura de seguridad
   - Actualizar procedimientos

---

## 📚 Referencias

- [OWASP Timing Attack](https://owasp.org/www-community/attacks/Timing_attack)
- [Hotmart Webhooks Documentation](https://developers.hotmart.com/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)

---

**Última revisión**: Diciembre 2024  
**Próxima revisión**: Junio 2025  
**Responsable**: CTO ULPIK

