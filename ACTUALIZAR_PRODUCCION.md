# 🚀 Instrucciones para Actualizar en Producción

## 📋 Pasos para Actualizar con los Nuevos Cambios (API de Cursos)

### Opción 1: Script Automático (Recomendado)

```bash
# Desde tu máquina local, ejecuta:
./fix-prod.sh
```

Este script:
- Guarda cambios locales
- Elimina database.sqlite si existe
- Hace pull de los cambios
- Instala dependencias
- Compila la aplicación
- Reinicia PM2

### Opción 2: Comandos Manuales

#### Paso 1: Conectarse al servidor

```bash
ssh root@159.223.204.96
```

#### Paso 2: Ir al directorio de la aplicación

```bash
cd /var/www/bitrix_tunel
```

#### Paso 3: Guardar cambios locales (si hay conflictos)

```bash
git stash
```

#### Paso 4: Eliminar database.sqlite (si existe y causa conflictos)

```bash
rm -f database.sqlite
```

#### Paso 5: Obtener los últimos cambios de GitHub

```bash
git pull origin master
```

#### Paso 6: Instalar nuevas dependencias

```bash
npm install
```

**Nota importante**: Esta vez necesitas instalar dependencias porque agregamos TypeORM y SQLite que pueden requerir paquetes adicionales.

#### Paso 7: Compilar la aplicación

```bash
npm run build
```

#### Paso 8: Reiniciar la aplicación con PM2

```bash
pm2 restart bitrix-tunnel
```

#### Paso 9: Verificar que todo esté funcionando

```bash
# Ver estado
pm2 status bitrix-tunnel

# Ver logs
pm2 logs bitrix-tunnel --lines 30

# Probar el endpoint de cursos
curl http://localhost:3333/api/cursos
```

## ✅ Verificación Post-Despliegue

### 1. Verificar que la aplicación esté corriendo

```bash
pm2 status bitrix-tunnel
```

Debería mostrar `online` en verde.

### 2. Probar el endpoint de cursos

```bash
# Desde el servidor
curl http://localhost:3333/api/cursos

# O desde internet (si DNS está configurado)
curl http://tunel.ulpik.com/api/cursos
```

**Respuesta esperada**: Un array JSON con los 13 cursos iniciales.

### 3. Verificar que la base de datos se creó

```bash
ls -la /var/www/bitrix_tunel/database.sqlite
```

Debería existir el archivo `database.sqlite`.

### 4. Verificar que los cursos se cargaron

```bash
# Verificar en los logs que se inicializaron los cursos
pm2 logs bitrix-tunnel | grep -i curso

# O verificar directamente en la base de datos
sqlite3 /var/www/bitrix_tunel/database.sqlite "SELECT COUNT(*) FROM cursos;"

# Debería mostrar 13 cursos
# Ver todos los cursos
sqlite3 /var/www/bitrix_tunel/database.sqlite "SELECT * FROM cursos;"
```

### 4. Verificar logs de inicialización

```bash
pm2 logs bitrix-tunnel --lines 50
```

Busca mensajes que indiquen que los cursos se inicializaron correctamente. Deberías ver:
- `Inicializando datos de cursos...`
- `✅ Cursos inicializados: X creados, Y ya existían`
- `✅ Inicialización de cursos completada`

### 5. Probar el endpoint de cursos

```bash
# Desde el servidor
curl http://localhost:3333/api/cursos

# Debería devolver un array JSON con 13 cursos
```

## 🔍 Solución de Problemas

### Si hay errores de compilación

```bash
# Ver errores detallados
npm run build

# Si falta alguna dependencia
npm install
npm run build
```

### Si PM2 no inicia

```bash
# Ver logs de errores
pm2 logs bitrix-tunnel --err

# Reiniciar desde cero
pm2 delete bitrix-tunnel
pm2 start dist/main.js --name bitrix-tunnel
pm2 save
```

### Si la base de datos no se crea

```bash
# Verificar permisos
ls -la database.sqlite

# Si no existe, la aplicación la creará automáticamente al iniciar
# Verifica los logs para ver si hay errores de TypeORM
pm2 logs bitrix-tunnel
```

### Si los cursos no se cargan

```bash
# Verificar que el módulo se inicializó
pm2 logs bitrix-tunnel | grep -i curso

# Verificar la base de datos directamente
sqlite3 database.sqlite "SELECT * FROM cursos;"
```

## 📊 Comandos Útiles Post-Despliegue

### Ver todos los cursos en la base de datos

```bash
sqlite3 /var/www/bitrix_tunel/database.sqlite "SELECT * FROM cursos;"
```

### Ver estructura de la tabla

```bash
sqlite3 /var/www/bitrix_tunel/database.sqlite ".schema cursos"
```

### Probar todos los endpoints

```bash
# GET todos los cursos
curl http://localhost:3333/api/cursos

# GET un curso específico
curl http://localhost:3333/api/cursos/5634737

# POST crear un curso
curl -X POST http://localhost:3333/api/cursos \
  -H "Content-Type: application/json" \
  -d '{"id": 9999999, "curso": "Test", "mes": "Enero", "desc": "Test"}'

# PUT actualizar un curso
curl -X PUT http://localhost:3333/api/cursos/5634737 \
  -H "Content-Type: application/json" \
  -d '{"curso": "DGW Actualizado", "mes": "Enero", "desc": "Nueva desc"}'
```

## 🎯 Checklist de Actualización

- [ ] Conectarse al servidor
- [ ] Hacer `git stash` (si hay cambios locales)
- [ ] Eliminar `database.sqlite` (si causa conflictos)
- [ ] Hacer `git pull origin master`
- [ ] Ejecutar `npm install` (importante: nuevas dependencias)
- [ ] Ejecutar `npm run build`
- [ ] Reiniciar con `pm2 restart bitrix-tunnel`
- [ ] Verificar estado con `pm2 status`
- [ ] Probar endpoint `/api/cursos`
- [ ] Verificar que `database.sqlite` se creó
- [ ] Verificar logs para confirmar inicialización

## 📝 Notas Importantes

1. **Base de datos SQLite**: Se creará automáticamente en `/var/www/bitrix_tunel/database.sqlite` la primera vez que la aplicación arranque.

2. **Datos iniciales**: Los 13 cursos se cargarán automáticamente al iniciar la aplicación. Si ya existen, no se duplicarán.

3. **Dependencias nuevas**: Asegúrate de ejecutar `npm install` porque agregamos TypeORM y SQLite.

4. **Reinicio necesario**: Después de compilar, siempre reinicia PM2 para que cargue los nuevos cambios.

5. **Logs**: Revisa los logs después del reinicio para confirmar que todo inició correctamente.

## 🆘 Si Algo Sale Mal

Si después de actualizar algo no funciona:

1. **Revisar logs**: `pm2 logs bitrix-tunnel --lines 100`
2. **Verificar compilación**: `ls -la dist/` (debe tener archivos .js)
3. **Verificar base de datos**: `ls -la database.sqlite`
4. **Reiniciar desde cero**: `pm2 restart bitrix-tunnel --update-env`
5. **Si todo falla**: Volver a la versión anterior con `git reset --hard HEAD~1` y `pm2 restart bitrix-tunnel`

