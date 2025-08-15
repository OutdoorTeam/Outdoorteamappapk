# Outdoor Team - Academia de Hábitos Saludables

Una aplicación web para el seguimiento de hábitos saludables, entrenamiento, nutrición y bienestar integral.

## 🚀 Características

- **Seguimiento de Hábitos**: Sistema completo para rastrear ejercicio, nutrición, pasos diarios y meditación
- **Notificaciones Push**: Recordatorios personalizados para mantener tus hábitos
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
# Generar claves VAPID para notificaciones push
node scripts/generate-vapid.js

# O crear manualmente .env con:
VAPID_PUBLIC_KEY=tu_clave_publica
VAPID_PRIVATE_KEY=tu_clave_privada
VAPID_EMAIL=admin@outdoorteam.com
DATA_DIRECTORY=./data
JWT_SECRET=tu-secreto-jwt-seguro
PORT=3001
```

4. **Iniciar el servidor de desarrollo**
```bash
npm run start
```

La aplicación estará disponible en `http://localhost:3000` (frontend) y `http://localhost:3001` (API).

## 🔧 Configuración de Notificaciones Push

### Generar Claves VAPID

Las notificaciones push requieren claves VAPID. Puedes generarlas ejecutando:

```bash
node scripts/generate-vapid.js
```

Este script:
- Genera automáticamente las claves VAPID
- Crea/actualiza tu archivo `.env`
- Proporciona instrucciones para la configuración

### Configuración Manual

Si prefieres generar las claves manualmente:

```bash
npx web-push generate-vapid-keys
```

Luego agrega las claves a tu archivo `.env`:

```env
VAPID_PUBLIC_KEY=tu_clave_publica_aqui
VAPID_PRIVATE_KEY=tu_clave_privada_aqui
VAPID_EMAIL=admin@outdoorteam.com
```

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
- **Web Push** para notificaciones
- **Multer** para subida de archivos

### PWA y Service Worker
- **Manifest.json** configurado
- **Service Worker** para notificaciones push
- **Caché automático** de recursos
- **Instalable** en dispositivos

## 📊 Base de Datos

La aplicación usa SQLite con las siguientes tablas principales:

- `users` - Información de usuarios y planes
- `daily_habits` - Seguimiento diario de hábitos
- `meditation_sessions` - Sesiones de meditación registradas
- `user_notifications` - Configuración de notificaciones
- `notification_jobs` - Jobs programados para recordatorios
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
- Configuración de notificaciones
- Estadísticas y progreso

### Para Administradores
- Panel de administración completo
- Gestión de usuarios y planes
- Envío de notificaciones masivas
- Subida de archivos para usuarios
- Estadísticas del sistema
- Logs de actividad

## 🚀 Despliegue

### Desarrollo
```bash
npm run start
```

### Producción
```bash
# Construir la aplicación
npm run build

# En el servidor de producción
NODE_ENV=production node dist/server/index.js
```

### Variables de Entorno para Producción
```env
NODE_ENV=production
VAPID_PUBLIC_KEY=tu_clave_publica
VAPID_PRIVATE_KEY=tu_clave_privada
VAPID_EMAIL=admin@tudominio.com
DATA_DIRECTORY=/path/to/data
JWT_SECRET=clave-super-segura-para-jwt
PORT=3001
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
- [ ] Notificaciones en tiempo real con WebSockets  
- [ ] App móvil nativa
- [ ] Integración de pagos
- [ ] Chat en vivo con entrenadores
- [ ] Retos y competencias grupales
- [ ] Análisis avanzado con IA
