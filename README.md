# Outdoor Team - Academia de Hábitos Saludables

Una aplicación web para el seguimiento de hábitos saludables, entrenamiento, nutrición y bienestar integral.

## 🚀 Características

- **Seguimiento de Hábitos**: Sistema completo para rastrear ejercicio, nutrición, pasos diarios y meditación
- **Planes Personalizados**: Diferentes niveles de acceso a funcionalidades
- **Panel de Administración**: Gestión completa de usuarios y contenido
- **PWA**: Instalable en dispositivos móviles y desktop
- **Métricas Detalladas**: Análisis de progreso con gráficos y estadísticas

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- SQLite

## ⚡ Instalación Rápida

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd outdoor-team
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
# Crear archivo .env con las siguientes variables:
DATA_DIRECTORY=./data
JWT_SECRET=tu-secreto-jwt-seguro
PORT=3001

# Para producción, también agregar:
NODE_ENV=production
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

4. **Iniciar el servidor de desarrollo**
```bash
npm run start
```

La aplicación estará disponible en `http://localhost:3000` (frontend) y `http://localhost:3001` (API).

## 👤 Usuario Administrador

Se crea automáticamente un usuario administrador con estas credenciales:

- **Email**: franciscodanielechs@gmail.com
- **Contraseña**: admin123
- **Rol**: admin

⚠️ **Importante**: Cambia estas credenciales en producción.

## 🏗️ Arquitectura

### Frontend
- **React 18** con TypeScript
- **Vite** para desarrollo y build
- **Tailwind CSS** para estilos
- **shadcn/ui** para componentes
- **React Router** para navegación
- **Tanstack Query** para gestión de estado del servidor

### Backend
- **Node.js** con Express 5
- **TypeScript** para type safety
- **SQLite** con Kysely como query builder
- **JWT** para autenticación
- **Multer** para subida de archivos

### PWA
- **Manifest.json** configurado
- **Service Worker** básico
- **Caché automático** de recursos
- **Instalable** en dispositivos

## 📊 Base de Datos

La aplicación usa SQLite con las siguientes tablas principales:

- `users` - Información de usuarios y planes
- `daily_habits` - Seguimiento diario de hábitos
- `meditation_sessions` - Sesiones de meditación registradas
- `plans` - Planes de suscripción disponibles
- `content_library` - Biblioteca de ejercicios y contenido

## 🔐 Seguridad

- Autenticación JWT con renovación automática
- Rate limiting en todas las rutas API
- Validación de entrada con Zod
- Headers de seguridad configurados
- CORS estricto por dominio
- Sanitización de contenido

## 📱 Funcionalidades Principales

### Para Usuarios
- Dashboard personalizado con seguimiento diario
- Contador de pasos con metas
- Sistema de puntos gamificado
- Notas diarias
- Sesiones de meditación guiada
- Biblioteca de ejercicios
- Estadísticas y progreso

### Para Administradores
- Panel de administración completo
- Gestión de usuarios y planes
- Subida de archivos para usuarios
- Estadísticas del sistema
- Logs de actividad

## 🚀 Despliegue

### Desarrollo
```bash
npm run start
```

### Producción

1. **Construir la aplicación**
```bash
npm run build
```

2. **Variables de entorno para producción**
```env
NODE_ENV=production
DATA_DIRECTORY=/path/to/data
JWT_SECRET=clave-super-segura-para-jwt
PORT=3001
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

3. **Iniciar en producción**
```bash
# Desde el directorio dist/
node server/index.js
```

### Configuración del Servidor de Producción

La aplicación está configurada para servir archivos estáticos desde `dist/public` en producción:

- **Static Files**: Se sirven desde `dist/public/`
- **API Routes**: Disponibles en `/api/*`
- **Health Check**: Disponible en `/health`
- **SPA Routing**: Todas las rutas no-API retornan `index.html`

### Health Check

El endpoint `/health` proporciona información del estado del servidor:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "uptime": 3600,
  "memory": {
    "used": "45MB",
    "total": "128MB"
  },
  "database": "connected"
}
```

### CORS Configuration

- **Desarrollo**: Permite `localhost` en múltiples puertos
- **Producción**: Solo permite dominios especificados en `ALLOWED_ORIGINS`
- **Health Check**: Exento de CORS para monitoring

### Estructura de Deployment

```
dist/
├── public/           # Static files (HTML, CSS, JS, assets)
│   ├── index.html
│   ├── assets/
│   └── ...
└── server/          # Compiled server code
    ├── index.js
    └── ...
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:

- Email: admin@outdoorteam.com
- Crea un issue en el repositorio

## 📈 Roadmap

- [ ] Integración con Google Fit / Apple Health
- [ ] App móvil nativa
- [ ] Integración de pagos
- [ ] Chat en vivo con entrenadores
- [ ] Retos y competencias grupales
- [ ] Análisis avanzado con IA

## ⚠️ Notas Importantes

- **Notificaciones Push**: Han sido desactivadas completamente del sistema
- **Base de Datos**: Compartida entre desarrollo y producción via `DATA_DIRECTORY`
- **VAPID**: Ya no se requieren claves VAPID
- **Static Serving**: Configurado automáticamente para desarrollo y producción

## 🔧 Troubleshooting

### Error: VAPID keys not found
Las notificaciones push han sido desactivadas. Si ves este error, asegúrate de tener la versión más reciente del código.

### Error: Static files not found
Verifica que hayas ejecutado `npm run build` y que los archivos estén en `dist/public/`.

### Error: CORS issues
Configura correctamente `ALLOWED_ORIGINS` en producción con tu dominio.

### Database connection issues
Verifica que `DATA_DIRECTORY` apunte a un directorio existente y que tenga permisos de escritura.
