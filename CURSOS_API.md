# 📚 API de Cursos

API REST para gestionar cursos en SQLite con operaciones GET, POST y PUT.

## 🚀 Endpoints

Base URL: `/api/cursos`

### GET - Obtener todos los cursos

```bash
GET /api/cursos
```

**Respuesta:**
```json
[
  {
    "id": 5634737,
    "curso": "DGW",
    "mes": "Enero",
    "desc": "DGW"
  },
  {
    "id": 6647281,
    "curso": "Emprende MMV",
    "mes": "Febrero",
    "desc": "Emprende MMV"
  }
]
```

### GET - Obtener un curso por ID

```bash
GET /api/cursos/:id
```

**Ejemplo:**
```bash
GET /api/cursos/5634737
```

**Respuesta:**
```json
{
  "id": 5634737,
  "curso": "DGW",
  "mes": "Enero",
  "desc": "DGW"
}
```

### POST - Crear un nuevo curso

```bash
POST /api/cursos
Content-Type: application/json
```

**Body:**
```json
{
  "id": 1234567,
  "curso": "Nuevo Curso",
  "mes": "Enero",
  "desc": "Descripción del nuevo curso"
}
```

**Respuesta:**
```json
{
  "id": 1234567,
  "curso": "Nuevo Curso",
  "mes": "Enero",
  "desc": "Descripción del nuevo curso"
}
```

### PUT - Actualizar un curso existente

```bash
PUT /api/cursos/:id
Content-Type: application/json
```

**Ejemplo:**
```bash
PUT /api/cursos/5634737
```

**Body:**
```json
{
  "curso": "DGW Actualizado",
  "mes": "Enero",
  "desc": "Nueva descripción"
}
```

**Respuesta:**
```json
{
  "id": 5634737,
  "curso": "DGW Actualizado",
  "mes": "Enero",
  "desc": "Nueva descripción"
}
```

## 📝 Ejemplos con cURL

### Obtener todos los cursos
```bash
curl http://localhost:3333/api/cursos
```

### Obtener un curso específico
```bash
curl http://localhost:3333/api/cursos/5634737
```

### Crear un nuevo curso
```bash
curl -X POST http://localhost:3333/api/cursos \
  -H "Content-Type: application/json" \
  -d '{
    "id": 9999999,
    "curso": "Nuevo Curso Test",
    "mes": "Enero",
    "desc": "Descripción del curso test"
  }'
```

### Actualizar un curso
```bash
curl -X PUT http://localhost:3333/api/cursos/5634737 \
  -H "Content-Type: application/json" \
  -d '{
    "curso": "DGW Actualizado",
    "mes": "Enero",
    "desc": "Nueva descripción actualizada"
  }'
```

## 🗄️ Base de Datos

- **Tipo**: SQLite
- **Archivo**: `database.sqlite`
- **Tabla**: `cursos`
- **Columnas**:
  - `id` (INTEGER, PRIMARY KEY)
  - `curso` (TEXT)
  - `mes` (TEXT)
  - `desc` (TEXT)

## 🔄 Inicialización Automática

Los datos iniciales se cargan automáticamente al arrancar la aplicación. Si un curso ya existe (por ID), no se duplicará.

## 📊 Cursos Iniciales

La base de datos se inicializa con 13 cursos predefinidos:

1. DGW (Enero)
2. Emprende MMV (Febrero)
3. Impuestos sin Miedo (marzo)
4. Evento presencial Quito (abril)
5. Curso de alguien del team (mayo)
6. Cripto Pro (junio)
7. DGW (julio)
8. Curso de alguien del team (agosto)
9. Emprende MMV (2ª edición) (septiembre)
10. DGW (3ª edición) (octubre)
11. Cripto Pro (2ª edición) (noviembre)
12. Nuevo curso que facture 15k (diciembre)
13. Ulpik Priv - Comunidad

## 🔍 Swagger Documentation

Una vez que la aplicación esté corriendo, puedes ver la documentación interactiva en:

```
http://localhost:3333/docs
```

Busca la sección "Cursos" para ver todos los endpoints con ejemplos.

