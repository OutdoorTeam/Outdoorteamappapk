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

**⚠️ Importante**: 
- Cambia `JWT_SECRET` por una clave segura única
- `ALLOWED_ORIGINS` está configurado para outdoorteam.com y sus subdominios
- Asegúrate de que `DATA_DIRECTORY` exista y tenga permisos de escritura

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

## 🚀 Despliegue en Producción (app.outdoorteam.com)

### 1. Construir la Aplicación
```bash
npm run build
```

Este comando:
- Construye el frontend con Vite → `public/` (archivos estáticos)
- Compila el backend TypeScript → `dist/server/` (servidor)

**📁 Estructura después del build:**
```
outdoor-team/
├── public/              # Frontend construido (NUEVO)
│   ├── index.html
│   ├── assets/
│   ├── manifest.json
│   └── sw.js
├── dist/               # Backend compilado
│   └── server/
│       └── index.js
└── data/               # Base de datos
    └── database.sqlite
```

### 2. Configurar Variables de Entorno de Producción
```env
NODE_ENV=production
DATA_DIRECTORY=/var/www/outdoorteam/data
JWT_SECRET=outdoor-team-production-secret-key-2024
PORT=3001
ALLOWED_ORIGINS=https://app.outdoorteam.com,https://outdoorteam.com,https://www.outdoorteam.com
TRUST_PROXY=1
```

### 3. Iniciar en Producción
```bash
node dist/server/index.js
```

### 4. Verificar Health Check
```bash
curl https://app.outdoorteam.com/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "database": "connected",
  "uptime": 3600,
  "memory": {...},
  "version": "1.0.0"
}
```

## 🌐 Configuración de Dominio

### Configuración DNS
Para `app.outdoorteam.com`:
```
app.outdoorteam.com    A    [TU_IP_DEL_SERVIDOR]
outdoorteam.com        A    [TU_IP_DEL_SERVIDOR]  
www.outdoorteam.com    A    [TU_IP_DEL_SERVIDOR]
```

### Configuración Nginx (Actualizada)
El archivo `nginx.conf` incluido ya está configurado para servir desde la carpeta `public/`:

```nginx
# Root directory for static files - now using public folder
root /var/www/outdoorteam/public;
```

## 👤 Usuario Administrador

Se crea automáticamente un usuario administrador:

- **Email**: `franciscodanielechs@gmail.com`
- **Contraseña**: (definida durante el registro)
- **Rol**: `admin`
- **Acceso**: Todas las funcionalidades

**⚠️ Importante**: Cambia estas credenciales después del primer acceso.

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
- **Compilado a**: `dist/server/`

### Seguridad de Producción
- **HTTPS** obligatorio
- **HSTS** habilitado
- **CSP** configurado para outdoorteam.com
- **Headers de seguridad** completos
- **Rate limiting** por IP
- **CORS** estricto para dominios permitidos

## 🔧 Comandos de Despliegue

### Script de Despliegue Completo
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Iniciando despliegue de Outdoor Team..."

# Actualizar código
git pull origin main

# Instalar dependencias
npm ci --omit=dev

# Construir aplicación (genera public/ y dist/server/)
npm run build

# Verificar que se crearon los archivos
if [ ! -f "public/index.html" ]; then
    echo "❌ Error: public/index.html no fue creado"
    exit 1
fi

if [ ! -f "dist/server/index.js" ]; then
    echo "❌ Error: dist/server/index.js no fue creado"
    exit 1
fi

# Reiniciar PM2 (si usas PM2)
pm2 reload outdoor-team

# Verificar health check
sleep 5
curl -f https://app.outdoorteam.com/health || exit 1

echo "✅ Despliegue completado exitosamente!"
```

## 🔧 Troubleshooting de Producción

### Error: Static files not found
```bash
# Verificar que el build se completó correctamente
ls -la public/
# Debe contener: index.html, assets/, manifest.json, sw.js

# Si no existe public/, ejecutar:
npm run build

# Verificar permisos
chmod -R 755 public/
```

### Error: "/home/app/public/index.html" no encontrado
Este error se solucionó configurando Vite para que genere archivos en `public/` en lugar de `dist/public/`.

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
chown www-data:www-data data/
```

## 📈 URLs de Producción

- **Aplicación Principal**: https://app.outdoorteam.com
- **Sitio Web**: https://outdoorteam.com
- **Health Check**: https://app.outdoorteam.com/health
- **API Base**: https://app.outdoorteam.com/api

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📞 Soporte Técnico

Para soporte técnico o preguntas:
- **Email**: admin@outdoorteam.com
- **Issues**: Crear issue en el repositorio
- **Documentación**: Ver este README

## ⚠️ Cambios Importantes en Esta Versión

### ✅ Estructura de Archivos Actualizada
- **Antes**: Los archivos se construían en `dist/public/`
- **Ahora**: Los archivos se construyen directamente en `public/` (raíz)
- **Motivo**: Compatibilidad con el sistema de despliegue

### ✅ Configuración Vite Actualizada
- El `outDir` ahora apunta a `public/` en lugar de `dist/public/`
- Nginx configurado para servir desde `/var/www/outdoorteam/public`
- Static serving del servidor actualizado para usar `public/`

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 🚀 Comandos Rápidos de Producción

```bash
# Construcción (crea public/ y dist/server/)
npm run build

# Verificar archivos generados
ls -la public/          # Debe contener index.html
ls -la dist/server/     # Debe contener index.js

# Iniciar en producción
NODE_ENV=production node dist/server/index.js

# Health check
curl https://app.outdoorteam.com/health
```

¡Listo para transformar vidas con hábitos saludables desde app.outdoorteam.com! 🌱💪
