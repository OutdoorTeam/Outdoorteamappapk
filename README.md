# Outdoor Team - Academia de Hábitos Saludables

Una aplicación web completa para el seguimiento de hábitos saludables, entrenamiento personalizado, nutrición y bienestar integral.

## 🚀 Características Principales

- **Seguimiento de Hábitos**: Sistema completo para rastrear ejercicio, nutrición, pasos diarios y meditación
- **Planes Personalizados**: Diferentes niveles de acceso a funcionalidades según el plan seleccionado
- **Panel de Administración**: Gestión completa de usuarios, contenido y planes
- **PWA**: Aplicación web progresiva instalable en dispositivos móviles y desktop
- **Métricas Detalladas**: Análisis de progreso con gráficos y estadísticas completas
- **Seguridad**: Sistema robusto con rate limiting, CORS, y validación de datos

## 📋 Requisitos del Sistema

- **Node.js**: v18 o superior
- **npm**: v8 o superior
- **SQLite**: Incluido con better-sqlite3
- **Sistema Operativo**: Windows, macOS, Linux
- **Dominio**: app.outdoorteam.com (producción)

## ⚡ Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd outdoor-team
```

### 2. Instalar Dependencias
```bash
npm install
cd client && npm install && cd ..
```

### 3. Configurar Variables de Entorno
Configura el archivo `.env` para producción:

```bash
# Environment (development/production)
NODE_ENV=production

# Database directory (must exist and have write permissions)
DATA_DIRECTORY=./data

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=outdoor-team-super-secure-jwt-key-change-in-production-2024

# Server port
PORT=3001

# Allowed CORS origins for production
ALLOWED_ORIGINS=https://app.outdoorteam.com,https://outdoorteam.com,https://www.outdoorteam.com
```

### 4. Crear Directorio de Datos
```bash
mkdir -p data
chmod 755 data
```

## 🛠️ Desarrollo

### Iniciar en Modo Desarrollo
```bash
npm run dev
```

Esto iniciará:
- **Frontend**: http://localhost:3000 (Vite dev server)
- **API Backend**: http://localhost:3001 (Express server)

### Scripts Disponibles
- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Construir para producción
- `npm start` - Iniciar servidor de producción
- `npm run start:dev` - Alias para desarrollo

## 🚀 Despliegue en Producción

### 1. Script Automático de Build (Recomendado)
```bash
chmod +x build-deploy.sh
./build-deploy.sh
```

### 2. Build Manual Paso a Paso
```bash
# Build del cliente
cd client
npm install
npm run build
cd ..

# Build del servidor
npm install --production
npm run build:server
npm run copy:assets

# Verificar estructura
ls -la public/
```

**📁 Estructura después del build:**
```
outdoor-team/
├── public/              # Todo listo para despliegue
│   ├── index.html       # Frontend principal
│   ├── assets/          # CSS, JS, imágenes optimizadas
│   ├── manifest.json    # PWA manifest
│   ├── sw.js           # Service Worker
│   └── server/         # Backend compilado
│       └── index.js    # Servidor listo para ejecutar
└── data/               # Base de datos
    └── database.sqlite
```

### 3. Iniciar en Producción
```bash
node public/server/index.js
```

### 4. Verificar Health Check
```bash
curl https://app.outdoorteam.com/health
```

## 👤 Usuario Administrador

Se crea automáticamente un usuario administrador:

- **Email**: `franciscodanielechs@gmail.com`
- **Contraseña**: (definida durante el registro)
- **Rol**: `admin`
- **Acceso**: Todas las funcionalidades

## 🏗️ Arquitectura de Producción

### Frontend
- **React 18** con TypeScript
- **Vite** para build optimizado
- **Tailwind CSS** para estilos
- **PWA** completa instalable
- **Servido desde**: `public/` (raíz del proyecto)

### Backend
- **Node.js** con Express 5
- **SQLite** con Kysely
- **JWT** para autenticación
- **Rate Limiting** y CORS estricto
- **Compilado a**: `public/server/`

## 🔧 Comandos de Despliegue

### Script de Despliegue Completo
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Iniciando despliegue de Outdoor Team..."

# Actualizar código
git pull origin main

# Usar script de build automático
chmod +x build-deploy.sh
./build-deploy.sh

# Reiniciar PM2 (si usas PM2)
pm2 reload outdoor-team

# Verificar health check
sleep 5
curl -f https://app.outdoorteam.com/health || exit 1

echo "✅ Despliegue completado exitosamente!"
```

## 🔧 Troubleshooting de Producción

### ✅ Error SOLUCIONADO: Cannot find module '/home/app/public/server/index.js'

**Causa**: El build no estaba generando los archivos en la estructura correcta.

**Solución implementada**:
1. **Separación de builds**: Cliente y servidor se construyen por separado
2. **Estructura correcta**: Todo se genera en `public/`
3. **Script automático**: `build-deploy.sh` maneja todo el proceso
4. **Verificación**: El script verifica que todos los archivos existan

**Para verificar que funciona**:
```bash
# Ejecutar build
./build-deploy.sh

# Verificar archivos
ls -la public/              # index.html + assets/
ls -la public/server/       # index.js

# Probar inicio
NODE_ENV=production node public/server/index.js
```

### Error: CORS issues
```bash
# Verificar dominios en .env
echo $ALLOWED_ORIGINS
# Debe incluir https://app.outdoorteam.com
```

### Error: Database connection
```bash
# Verificar directorio de datos
ls -la data/
chmod 755 data/
```

## 📈 URLs de Producción

- **Aplicación Principal**: https://app.outdoorteam.com
- **Sitio Web**: https://outdoorteam.com
- **Health Check**: https://app.outdoorteam.com/health
- **API Base**: https://app.outdoorteam.com/api

## ⚠️ Cambios Importantes en Esta Versión

### ✅ Estructura de Build Corregida
- **Problema**: El servidor buscaba `/home/app/public/server/index.js` pero no existía
- **Solución**: Build separado cliente/servidor con salida unificada en `public/`
- **Script**: `build-deploy.sh` automatiza todo el proceso
- **Verificación**: El script valida que todos los archivos se generen correctamente

### ✅ Configuración Mejorada
- Client tiene su propio `package.json` y configuración
- Build process simplificado con verificaciones
- Scripts npm actualizados para nueva estructura
- Configuración de PM2 corregida

### 📁 Estructura Final de Despliegue
```
public/
├── index.html        # ← Frontend (lo que busca /home/app/public/index.html) ✅
├── assets/           # ← CSS, JS, imágenes ✅
├── manifest.json     # ← PWA manifest ✅
├── sw.js            # ← Service Worker ✅
└── server/          # ← Backend ✅
    └── index.js     # ← Servidor compilado ✅
```

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 🚀 Comandos Rápidos de Producción

```bash
# Build automático (RECOMENDADO)
chmod +x build-deploy.sh
./build-deploy.sh

# Iniciar en producción
NODE_ENV=production node public/server/index.js

# Health check
curl https://app.outdoorteam.com/health
```

**🎯 Problema RESUELTO**: El error "Cannot find module '/home/app/public/server/index.js'" está solucionado con la nueva estructura de build.

¡Listo para transformar vidas con hábitos saludables desde app.outdoorteam.com! 🌱💪
