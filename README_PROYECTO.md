# 🔌 Bitrix Tunnel - Backend de Integración

Backend desarrollado en **NestJS** que actúa como puente de integración entre **Bitrix24**, **Hotmart** y **Jelou** (WhatsApp).

## 📋 Descripción

Este proyecto automatiza la sincronización de datos entre:
- **Hotmart**: Plataforma de productos digitales (eventos de compras, suscripciones, etc.)
- **Jelou**: Plataforma de mensajería WhatsApp
- **Bitrix24**: CRM para gestión de contactos, negociaciones y actividades

## 🏗️ Arquitectura

```
Hotmart Webhooks ────┐
                     │
Jelou WhatsApp ──────┼───► Backend NestJS ───► Bitrix24 CRM
                     │
Otros Servicios ─────┘
```

## 🚀 Módulos Principales

### 1. **Módulo Hotmart** 🛒
Recibe webhooks de Hotmart y procesa eventos de:
- ✅ Compras (aprobadas, canceladas, reembolsadas, chargeback)
- 📱 Suscripciones (activación, cancelación, reactivación)
- 🏢 Club (cambio de planes)
- 📄 Otros eventos (boletos impresos, pagos atrasados)

**Endpoints:**
- `POST /api/hotmart/webhook` - Recibe notificaciones de Hotmart
- `POST /api/hotmart/test` - Prueba de conexión

### 2. **Módulo Jelou** 💬
Gestiona la comunicación bidireccional con WhatsApp:
- Recibe mensajes de clientes vía WhatsApp
- Envía respuestas desde Bitrix a WhatsApp
- Cierra conversaciones

**Endpoints:**
- `POST /api/jelou/webhook` - Recibe mensajes de WhatsApp
- `POST /api/jelou/responder?id={dealId}` - Envía respuesta a WhatsApp
- `POST /api/jelou/terminar/chat?id={dealId}` - Cierra conversación

### 3. **Módulo Bitrix** 🎯
Servicio central que interactúa con Bitrix24 CRM:
- Gestión de contactos (búsqueda, creación)
- Gestión de negociaciones/deals (búsqueda, creación, actualización)
- Registro de actividades
- Integración con embudos personalizados

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/cto-ulpik/bitrix_tunel.git
cd bitrix_tunel

# Instalar dependencias
npm install

# Compilar el proyecto
npm run build
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Puerto del servidor
PORT=3333

# Bitrix24
BITRIX_DOMAIN=bitrix.elsagrario.fin.ec
BITRIX_USER_ID=138

# Jelou
JELOU_API_BASE=https://api.jelou.ai
JELOU_BOT_ID=2608e658-6100-41ec-905f-26eac23c47b8
JELOU_CLIENT_ID=S7U3JRPID6drZjpJJejDjznygNee8Qvw
JELOU_CLIENT_SECRET=pfAJNqbmRFai2rtYtUgQVmzbf4MUgqd6dRwCgCg1RDUStLqfQQ7QJ8XAPRjD0OCe
```

### Configurar Webhooks Externos

#### Hotmart
1. Ve a Hotmart → Configuración → Webhooks
2. Crea un nuevo webhook:
   - URL: `https://TU-DOMINIO.com/api/hotmart/webhook`
   - Versión: 2.0.0
   - Eventos: Selecciona todos los necesarios (compras, suscripciones, etc.)

Ver guía completa en: [`HOTMART_SETUP.md`](./HOTMART_SETUP.md)

#### Jelou
1. Ve a Jelou → Configuración → Webhooks
2. Configura el webhook:
   - URL: `https://TU-DOMINIO.com/api/jelou/webhook`

## 🏃 Ejecución

```bash
# Modo desarrollo (con hot-reload)
npm run start:dev

# Modo producción
npm run start:prod

# Modo debug
npm run start:debug
```

El servidor estará disponible en: `http://localhost:3333`

## 🧪 Pruebas

### Prueba Manual del Webhook de Hotmart

```bash
# Dar permisos de ejecución al script
chmod +x test-hotmart-webhook.sh

# Ejecutar pruebas (requiere que el servidor esté corriendo)
./test-hotmart-webhook.sh
```

### Prueba con cURL

```bash
# Test de conexión Hotmart
curl -X POST http://localhost:3333/api/hotmart/test

# Simular compra de Hotmart
curl -X POST http://localhost:3333/api/hotmart/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PURCHASE_COMPLETE",
    "data": {
      "buyer": {
        "name": "Test User",
        "checkout_phone": "+593999999999"
      },
      "product": {
        "name": "Producto Test"
      }
    }
  }'
```

## 📚 Documentación API (Swagger)

Una vez que el servidor esté corriendo, accede a la documentación interactiva:

```
http://localhost:3333/docs
```

Ahí encontrarás:
- Lista completa de endpoints
- Esquemas de datos
- Ejemplos de requests/responses
- Interfaz para probar los endpoints

## 📊 Flujo de Datos

### Flujo Hotmart → Bitrix
```
1. Cliente compra en Hotmart
2. Hotmart envía webhook → /api/hotmart/webhook
3. Backend procesa el evento:
   - Busca/crea contacto en Bitrix
   - Busca/crea negociación (deal)
   - Registra actividad con detalles de la compra
4. Bitrix actualizado con la información
```

### Flujo Jelou (WhatsApp) → Bitrix
```
1. Cliente envía mensaje por WhatsApp
2. Jelou envía webhook → /api/jelou/webhook
3. Backend procesa:
   - Busca/crea contacto por teléfono
   - Busca/crea negociación en embudo Jelou
   - Registra mensaje como actividad
4. Asesor ve el mensaje en Bitrix
```

### Flujo Bitrix → Jelou (WhatsApp)
```
1. Asesor escribe respuesta en campo personalizado de Bitrix
2. Asesor ejecuta acción (webhook) → /api/jelou/responder?id=123
3. Backend:
   - Obtiene mensaje del campo personalizado
   - Obtiene teléfono del contacto
   - Envía mensaje vía Jelou API
   - Registra actividad en Bitrix
4. Cliente recibe mensaje en WhatsApp
```

## 🗂️ Estructura del Proyecto

```
bitrix_tunel/
├── src/
│   ├── hotmart/              # Módulo de Hotmart
│   │   ├── dto/
│   │   │   └── hotmart-webhook.dto.ts
│   │   ├── hotmart.controller.ts
│   │   ├── hotmart.module.ts
│   │   └── hotmart.service.ts
│   ├── jelou/                # Módulo de Jelou
│   │   ├── jelou.controller.ts
│   │   ├── jelou.module.ts
│   │   └── jelou.service.ts
│   ├── bitrix/               # Módulo de Bitrix
│   │   ├── bitrix.controller.ts
│   │   ├── bitrix.module.ts
│   │   └── bitrix.service.ts
│   ├── app.module.ts         # Módulo principal
│   ├── app.swagger.ts        # Configuración de Swagger
│   └── main.ts               # Punto de entrada
├── test/                     # Tests E2E
├── dist/                     # Código compilado
├── package.json
├── tsconfig.json
├── Dockerfile                # Para despliegue en Docker
├── README_PROYECTO.md        # Este archivo
├── HOTMART_SETUP.md          # Guía de configuración Hotmart
└── test-hotmart-webhook.sh   # Script de pruebas
```

## 🔐 Seguridad

Para producción, considera implementar:

1. **Autenticación de Webhooks**: Validar tokens o firmas
2. **Rate Limiting**: Limitar peticiones por IP
3. **HTTPS**: Usar certificado SSL
4. **Variables de entorno**: No subir credenciales al repositorio
5. **Logs**: Implementar logging robusto
6. **Monitoreo**: Alertas ante errores

## 🛠️ Tecnologías

- **Framework**: NestJS v11
- **Runtime**: Node.js v22
- **Language**: TypeScript v5.7
- **HTTP Client**: Axios
- **Validación**: class-validator, class-transformer
- **Documentación**: Swagger/OpenAPI
- **Testing**: Jest

## 📝 Scripts Disponibles

```bash
npm run start          # Inicia en modo normal
npm run start:dev      # Inicia con hot-reload
npm run start:prod     # Inicia en producción
npm run build          # Compila el proyecto
npm run lint           # Ejecuta linter
npm run test           # Ejecuta tests unitarios
npm run test:e2e       # Ejecuta tests E2E
npm run format         # Formatea el código
```

## 🐛 Debugging

### Ver logs del servidor
```bash
# En desarrollo
npm run start:dev
# Los logs aparecerán en consola

# En producción con PM2
pm2 logs bitrix-tunnel
```

### Problemas comunes

**1. Error de conexión con Bitrix**
- Verifica las URLs y tokens en el código
- Asegúrate de tener acceso a la API REST de Bitrix

**2. Webhook no recibe datos**
- Verifica que la URL sea accesible desde internet
- Usa ngrok para desarrollo local: `ngrok http 3333`
- Revisa los logs para ver si llegan las peticiones

**3. Error en módulos**
- Ejecuta `npm install` nuevamente
- Limpia cache: `rm -rf node_modules package-lock.json && npm install`

## 📞 Soporte y Contacto

Para problemas o consultas sobre el proyecto:
- Revisar los logs: `pm2 logs` (producción) o consola (desarrollo)
- Documentación Bitrix: https://training.bitrix24.com/rest_help/
- Documentación Hotmart: https://developers.hotmart.com/
- Documentación NestJS: https://docs.nestjs.com/

## 📄 Licencia

UNLICENSED - Uso privado

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024

