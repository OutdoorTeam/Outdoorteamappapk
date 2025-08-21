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
Copia el archivo `.env` de ejemplo y configúralo:

```bash
# Environment (development/production)
NODE_ENV=production

# Database directory (must exist and have write permissions)
DATA_DIRECTORY=./data

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=clave-super-segura-para-jwt-cambiar-en-produccion

# Server port
PORT=3001

# Allowed CORS origins for production (comma separated)
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

**⚠️ Importante**: 
- Cambia `JWT_SECRET` por una clave segura única
- Configura `ALLOWED_ORIGINS` con tus dominios de producción
- Asegúrate de que `DATA_DIRECTORY` exista y tenga permisos de escritura

### 4. Crear Directorio de Datos
```bash
mkdir -p data
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

### 1. Construir la Aplicación
```bash
npm run build
```

Este comando:
- Construye el frontend con Vite → `dist/public/`
- Compila el backend TypeScript → `dist/server/`

### 2. Configurar Variables de Entorno
```env
NODE_ENV=production
DATA_DIRECTORY=/path/to/production/data
JWT_SECRET=clave-produccion-super-segura
PORT=3001
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

### 3. Iniciar en Producción
```bash
node dist/server/index.js
```

### 4. Verificar Health Check
```bash
curl http://localhost:3001/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "database": "connected",
  "uptime": 3600,
  "memory": {...}
}
```

## 👤 Usuario Administrador

Se crea automáticamente un usuario administrador:

- **Email**: `franciscodanielechs@gmail.com`
- **Contraseña**: (definida durante el registro)
- **Rol**: `admin`
- **Acceso**: Todas las funcionalidades

**⚠️ Importante**: Cambia estas credenciales después del primer acceso.

## 🏗️ Arquitectura Técnica

### Frontend
- **React 18** con TypeScript
- **Vite** para desarrollo y build optimizado
- **Tailwind CSS** para estilos utility-first
- **shadcn/ui** para componentes de interfaz
- **React Router** para navegación SPA
- **Tanstack Query** para gestión de estado del servidor
- **PWA** con Service Worker y manifest

### Backend
- **Node.js** con Express 5
- **TypeScript** para type safety completo
- **SQLite** con Kysely como query builder tipado
- **JWT** para autenticación segura
- **Multer** para manejo de archivos
- **Rate Limiting** para protección anti-abuse
- **CORS** configurado por ambiente

### Base de Datos
SQLite con esquema completo que incluye:
- `users` - Usuarios y planes
- `daily_habits` - Seguimiento diario
- `meditation_sessions` - Sesiones de meditación
- `training_plans` - Planes de entrenamiento
- `nutrition_plans` - Planes nutricionales
- `content_library` - Biblioteca de ejercicios
- `system_logs` - Logs del sistema

## 🔐 Seguridad Implementada

- **Autenticación JWT** con expiración
- **Rate Limiting** por IP y usuario
- **CORS estricto** configurado por dominio
- **Validación de entrada** con Zod schemas
- **Sanitización** de contenido HTML
- **Headers de seguridad** (CSP, HSTS, etc.)
- **Logs de seguridad** para auditoría

## 📱 Funcionalidades por Rol

### Para Usuarios
- Dashboard personalizado con métricas
- Seguimiento de hábitos diarios
- Contador de pasos con metas personalizables
- Sistema de puntos gamificado
- Notas diarias privadas
- Sesiones de meditación guiada
- Biblioteca de ejercicios
- Visualización de progreso y estadísticas

### Para Administradores
- Panel de administración completo
- Gestión de usuarios y estados
- Asignación de planes y permisos
- Subida de archivos personalizados (PDFs)
- Gestión de biblioteca de contenido
- Estadísticas del sistema
- Logs de actividad y errores
- Administración de planes de entrenamiento y nutrición

## 🌐 PWA (Progressive Web App)

La aplicación es una PWA completa que incluye:
- **Instalable** en dispositivos móviles y desktop
- **Funciona offline** con Service Worker
- **Caché inteligente** de recursos
- **Manifest configurado** con iconos y metadatos
- **Responsive design** para todos los dispositivos

## 📊 Monitoring y Logs

### Health Check Endpoint
`GET /health` proporciona:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "uptime": 3600,
  "memory": {"used": "45MB", "total": "128MB"},
  "database": "connected"
}
```

### System Logs
Logging completo con niveles:
- `info` - Eventos normales
- `warn` - Advertencias
- `error` - Errores manejables
- `critical` - Errores críticos

## 🛡️ Rate Limiting

Protección configurada para:
- **Login**: 5 intentos por 15 minutos
- **Registro**: 3 intentos por minuto
- **API Global**: 100 requests por minuto
- **Burst Protection**: 10 requests por segundo

## 📁 Estructura del Proyecto

```
outdoor-team/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Utilidades frontend
│   ├── public/            # Assets públicos
│   └── index.html
├── server/                # Backend Express
│   ├── routes/           # Rutas de la API
│   ├── middleware/       # Middleware personalizado
│   ├── utils/           # Utilidades backend
│   ├── config/          # Configuraciones
│   └── index.ts         # Punto de entrada
├── shared/               # Código compartido
│   └── validation-schemas.ts
├── dist/                # Build de producción
│   ├── public/         # Frontend construido
│   └── server/         # Backend compilado
├── data/               # Base de datos SQLite
├── .env               # Variables de entorno
└── package.json
```

## 🔧 Troubleshooting

### Error: Static files not found
```bash
# Asegúrate de hacer build antes de iniciar
npm run build
node dist/server/index.js
```

### Error: Database connection issues
```bash
# Verifica que el directorio de datos exista
mkdir -p data
chmod 755 data
```

### Error: CORS issues
Configura correctamente `ALLOWED_ORIGINS` en tu `.env`:
```env
ALLOWED_ORIGINS=https://tudominio.com,https://app.tudominio.com
```

### Error: JWT issues
Asegúrate de tener un `JWT_SECRET` seguro:
```env
JWT_SECRET=tu-clave-super-segura-y-unica-aqui
```

## 📈 Roadmap

- [ ] Integración con Google Fit / Apple Health
- [ ] Aplicación móvil nativa (React Native)
- [ ] Sistema de pagos integrado
- [ ] Chat en vivo con entrenadores
- [ ] Retos y competencias grupales
- [ ] Análisis avanzado con IA
- [ ] Notificaciones push nativas

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
- **Documentación**: Ver este README y comentarios en el código

## ⚠️ Notas Importantes

- **Notificaciones Push**: Completamente desactivadas del sistema
- **Base de Datos**: Compartida entre desarrollo y producción via `DATA_DIRECTORY`
- **VAPID**: Ya no requerido (notificaciones desactivadas)
- **Static Serving**: Configurado automáticamente para desarrollo y producción
- **Logs**: Sistema robusto de logging para debugging

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 🚀 Comandos Rápidos

```bash
# Desarrollo
npm run dev

# Producción
npm run build
NODE_ENV=production node dist/server/index.js

# Verificar
curl http://localhost:3001/health
```

¡Listo para transformar vidas con hábitos saludables! 🌱💪
