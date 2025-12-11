# 📊 Sistema de Auditoría con SQLite

Sistema completo de auditoría que registra todas las acciones realizadas en el sistema (Hotmart, Jelou, Bitrix).

---

## 🎯 **¿Qué Registra?**

El sistema registra automáticamente:

### 📝 Información General
- ✅ **Acción realizada** (crear_contacto, crear_negociacion, etc.)
- ✅ **Módulo** (hotmart, jelou, bitrix)
- ✅ **Tipo de evento** (PURCHASE_COMPLETE, mensaje WhatsApp, etc.)
- ✅ **Timestamp** (fecha y hora exacta)
- ✅ **Estado** (success, error, pending)

### 👤 Información del Usuario
- ✅ **Nombre del cliente**
- ✅ **Email**
- ✅ **Teléfono**

### 🎯 IDs de Bitrix
- ✅ **Contact ID** (ID del contacto en Bitrix)
- ✅ **Deal ID** (ID de la negociación)
- ✅ **Activity ID** (ID de la actividad)

### 💰 Información Comercial
- ✅ **Producto/Servicio**
- ✅ **Monto**
- ✅ **Moneda**

### 🔍 Metadata Adicional
- ✅ **Datos del webhook**
- ✅ **IP de origen**
- ✅ **Tiempo de procesamiento**
- ✅ **Mensajes de error** (si aplica)

---

## 📦 **Base de Datos**

### Ubicación
```
database.sqlite
```

### Tabla Principal
```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR,
  module VARCHAR,
  event_type VARCHAR,
  bitrix_contact_id VARCHAR,
  bitrix_deal_id VARCHAR,
  bitrix_activity_id VARCHAR,
  user_name VARCHAR,
  user_email VARCHAR,
  user_phone VARCHAR,
  product_name VARCHAR,
  amount DECIMAL(10,2),
  currency VARCHAR,
  metadata TEXT,
  status VARCHAR DEFAULT 'success',
  error_message TEXT,
  source_ip VARCHAR,
  webhook_id VARCHAR,
  processing_time_ms INTEGER
);
```

---

## 🚀 **Endpoints de la API**

### 1. Obtener Todos los Logs

```http
GET /api/audit/logs
```

**Query Parameters:**
- `module` - Filtrar por módulo (hotmart, jelou, bitrix)
- `action` - Filtrar por acción
- `status` - Filtrar por estado (success, error)
- `limit` - Límite de resultados (default: 50)
- `offset` - Offset para paginación

**Ejemplo:**
```bash
curl https://tunel.ulpik.com/api/audit/logs?module=hotmart&limit=10
```

**Respuesta:**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2024-12-11T10:00:00.000Z",
      "action": "compra_procesada",
      "module": "hotmart",
      "event_type": "PURCHASE_COMPLETE",
      "bitrix_contact_id": "12345",
      "bitrix_deal_id": "67890",
      "user_name": "Juan Pérez",
      "user_phone": "+593999999999",
      "product_name": "ULPIK PRIV",
      "amount": 299.90,
      "currency": "USD",
      "status": "success",
      "processing_time_ms": 1234
    }
  ],
  "total": 150
}
```

### 2. Obtener Estadísticas

```http
GET /api/audit/stats
```

**Ejemplo:**
```bash
curl https://tunel.ulpik.com/api/audit/stats
```

**Respuesta:**
```json
{
  "total_actions": 150,
  "success_count": 145,
  "error_count": 5,
  "success_rate": "96.67%",
  "by_module": [
    { "module": "hotmart", "count": 80 },
    { "module": "jelou", "count": 50 },
    { "module": "bitrix", "count": 20 }
  ],
  "by_action": [
    { "action": "compra_procesada", "count": 50 },
    { "action": "crear_contacto", "count": 50 },
    { "action": "registrar_actividad", "count": 50 }
  ]
}
```

### 3. Logs por Deal ID de Bitrix

```http
GET /api/audit/deal/:dealId
```

**Ejemplo:**
```bash
curl https://tunel.ulpik.com/api/audit/deal/67890
```

**Respuesta:**
```json
{
  "deal_id": "67890",
  "total": 5,
  "logs": [
    {
      "id": 1,
      "action": "compra_procesada",
      "timestamp": "2024-12-11T10:00:00.000Z",
      ...
    }
  ]
}
```

### 4. Logs por Contact ID de Bitrix

```http
GET /api/audit/contact/:contactId
```

**Ejemplo:**
```bash
curl https://tunel.ulpik.com/api/audit/contact/12345
```

### 5. Logs por Teléfono

```http
GET /api/audit/phone/:phone
```

**Ejemplo:**
```bash
curl https://tunel.ulpik.com/api/audit/phone/+593999999999
```

---

## 💻 **Uso Programático**

### Registrar una Acción

```typescript
import { AuditService } from './database/services/audit.service';

// En cualquier servicio
constructor(private readonly auditService: AuditService) {}

// Registrar acción exitosa
await this.auditService.log({
  action: 'crear_contacto',
  module: 'hotmart',
  event_type: 'PURCHASE_COMPLETE',
  bitrix_contact_id: '12345',
  user_name: 'Juan Pérez',
  user_phone: '+593999999999',
  status: 'success',
  metadata: { /* datos adicionales */ },
});

// Registrar error
await this.auditService.logError(
  'crear_contacto',
  'hotmart',
  'Error: Contacto duplicado',
  {
    user_phone: '+593999999999',
  }
);

// Registrar acción en Bitrix
await this.auditService.logBitrixAction(
  'crear_negociacion',
  'hotmart',
  '12345', // contactId
  '67890', // dealId
  null,    // activityId
  {
    product_name: 'ULPIK PRIV',
    amount: 299.90,
    currency: 'USD',
  }
);
```

---

## 📊 **Consultas Útiles**

### Ver últimas 20 acciones
```bash
curl https://tunel.ulpik.com/api/audit/logs?limit=20
```

### Ver solo errores
```bash
curl https://tunel.ulpik.com/api/audit/logs?status=error
```

### Ver acciones de Hotmart
```bash
curl https://tunel.ulpik.com/api/audit/logs?module=hotmart
```

### Ver compras procesadas
```bash
curl https://tunel.ulpik.com/api/audit/logs?action=compra_procesada
```

### Historial de un cliente (por teléfono)
```bash
curl https://tunel.ulpik.com/api/audit/phone/+593999999999
```

### Historial de una negociación
```bash
curl https://tunel.ulpik.com/api/audit/deal/67890
```

---

## 🔍 **Consultas SQL Directas**

Si necesitas hacer consultas personalizadas:

```bash
# Conectar a la base de datos
sqlite3 database.sqlite

# Ver últimas 10 acciones
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;

# Contar acciones por módulo
SELECT module, COUNT(*) as total 
FROM audit_logs 
GROUP BY module;

# Ver errores recientes
SELECT * FROM audit_logs 
WHERE status = 'error' 
ORDER BY timestamp DESC 
LIMIT 20;

# Acciones del día de hoy
SELECT * FROM audit_logs 
WHERE DATE(timestamp) = DATE('now');

# Tiempo promedio de procesamiento
SELECT module, AVG(processing_time_ms) as avg_time_ms 
FROM audit_logs 
WHERE processing_time_ms IS NOT NULL 
GROUP BY module;

# Clientes más activos
SELECT user_phone, user_name, COUNT(*) as actions 
FROM audit_logs 
WHERE user_phone IS NOT NULL 
GROUP BY user_phone 
ORDER BY actions DESC 
LIMIT 10;
```

---

## 📈 **Dashboards y Reportes**

### Reporte Diario
```bash
curl https://tunel.ulpik.com/api/audit/stats | jq '.'
```

### Exportar a CSV (desde SQLite)
```bash
sqlite3 database.sqlite -csv \
  -header "SELECT * FROM audit_logs WHERE DATE(timestamp) = DATE('now');" \
  > reporte_hoy.csv
```

### Exportar a JSON
```bash
curl https://tunel.ulpik.com/api/audit/logs?limit=1000 > audit_backup.json
```

---

## 🛠️ **Mantenimiento**

### Limpiar Logs Antiguos

El sistema tiene un método automático para limpiar logs antiguos:

```typescript
// Mantener solo últimos 90 días
await this.auditService.cleanOldLogs(90);
```

### Backup de la Base de Datos

```bash
# Copiar la base de datos
cp database.sqlite database_backup_$(date +%Y%m%d).sqlite

# O usar SQLite dump
sqlite3 database.sqlite .dump > backup.sql
```

### Restaurar desde Backup

```bash
# Desde archivo .sqlite
cp database_backup_20241211.sqlite database.sqlite

# Desde dump SQL
sqlite3 database_new.sqlite < backup.sql
```

---

## 🎨 **Visualización con Herramientas**

### DB Browser for SQLite
1. Descarga: https://sqlitebrowser.org/
2. Abre `database.sqlite`
3. Explora visualmente los datos

### Grafana + SQLite Plugin
1. Instala Grafana
2. Agrega SQLite como datasource
3. Crea dashboards personalizados

### Metabase
1. Instala Metabase
2. Conecta a SQLite
3. Crea reportes automáticos

---

## 📊 **Ejemplos de Uso Real**

### Caso 1: Rastrear una Compra

```bash
# 1. Cliente compra en Hotmart
# 2. Webhook llega al sistema
# 3. Se registra automáticamente en audit_logs

# Ver el registro
curl https://tunel.ulpik.com/api/audit/phone/+593999999999

# Respuesta muestra:
# - Cuándo llegó el webhook
# - Qué contacto se creó
# - Qué negociación se generó
# - Qué actividades se registraron
# - Tiempo que tomó todo el proceso
```

### Caso 2: Detectar Problemas

```bash
# Ver todos los errores
curl https://tunel.ulpik.com/api/audit/logs?status=error

# Analizar qué está fallando
# - ¿Qué módulo?
# - ¿Qué acción?
# - ¿Cuál es el mensaje de error?
```

### Caso 3: Métricas de Negocio

```bash
# Ver estadísticas
curl https://tunel.ulpik.com/api/audit/stats

# Saber:
# - Cuántas ventas se procesaron
# - Cuál es la tasa de éxito
# - Qué módulo es más usado
# - Tiempo promedio de procesamiento
```

---

## 🔐 **Seguridad**

### Datos Sensibles

El sistema NO almacena:
- ❌ Contraseñas
- ❌ Tokens de API
- ❌ Datos de tarjetas de crédito

El sistema SÍ almacena:
- ✅ Nombres de clientes
- ✅ Emails (ofuscados en logs)
- ✅ Teléfonos
- ✅ Montos de compra

### Recomendaciones

1. **Backup Regular**: Hacer backup diario de `database.sqlite`
2. **Limpieza Periódica**: Eliminar logs antiguos (90+ días)
3. **Acceso Restringido**: Solo personal autorizado

---

## 📞 **Soporte**

Para consultas o problemas:
- Ver logs de la aplicación: `pm2 logs bitrix-tunnel`
- Ver logs de auditoría: SQLite queries
- Contactar: cto@ulpik.com

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0.0

