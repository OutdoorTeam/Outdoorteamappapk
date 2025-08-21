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
- Construye el frontend con Vite → `dist/public/`
- Compila el backend TypeScript → `dist/server/`

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

### Configuración Nginx (Recomendada)
```nginx
server {
    listen 80;
    server_name app.outdoorteam.com outdoorteam.com www.outdoorteam.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.outdoorteam.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    # Static files
    location / {
        try_files $uri $uri/ @backend;
        root /var/www/outdoorteam/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # SPA fallback
    location @backend {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect www to non-www for main domain
server {
    listen 443 ssl http2;
    server_name www.outdoorteam.com;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/private.key;
    return 301 https://outdoorteam.com$request_uri;
}
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
- **Servido desde**: `dist/public/`

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

## 🔐 Configuración de Seguridad

### SSL/TLS (Let's Encrypt recomendado)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificados
sudo certbot --nginx -d app.outdoorteam.com -d outdoorteam.com -d www.outdoorteam.com

# Renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall (UFW)
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## 📊 Monitoring de Producción

### Health Check
- **Endpoint**: `https://app.outdoorteam.com/health`
- **Monitoreo**: Base de datos, memoria, tiempo de actividad
- **Alertas**: Configurar monitoreo externo

### Logs del Sistema
```bash
# Ver logs de la aplicación
tail -f /var/log/outdoorteam/app.log

# Ver logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### PM2 para Gestión de Procesos (Recomendado)
```bash
# Instalar PM2
npm install -g pm2

# Crear ecosystem.config.js
module.exports = {
  apps: [{
    name: 'outdoor-team',
    script: './dist/server/index.js',
    cwd: '/var/www/outdoorteam',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
}

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

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

# Construir aplicación
npm run build

# Reiniciar PM2
pm2 reload outdoor-team

# Verificar health check
sleep 5
curl -f https://app.outdoorteam.com/health || exit 1

echo "✅ Despliegue completado exitosamente!"
```

### Backup de Base de Datos
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
cp ./data/database.sqlite ./backups/database_$DATE.sqlite
echo "✅ Backup creado: database_$DATE.sqlite"
```

## 🔧 Troubleshooting de Producción

### Error: Static files not found
```bash
# Verificar build
ls -la dist/public/
# Debe contener index.html y assets/

# Verificar permisos
chmod -R 755 dist/public/
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

## ⚠️ Notas de Producción

- **Dominio Principal**: app.outdoorteam.com
- **Archivos Estáticos**: Servidos desde `dist/public/`
- **Base de Datos**: SQLite en directorio `data/`
- **HTTPS**: Obligatorio en producción
- **Logs**: Sistema completo de logging
- **Backup**: Configurar backups automáticos de la BD

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 🚀 Comandos Rápidos de Producción

```bash
# Construcción y despliegue
npm run build
NODE_ENV=production node dist/server/index.js

# Health check
curl https://app.outdoorteam.com/health

# Ver logs
tail -f logs/combined.log
```

¡Listo para transformar vidas con hábitos saludables desde app.outdoorteam.com! 🌱💪
