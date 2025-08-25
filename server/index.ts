import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { setupStaticServing } from './static-serve.js';
import { db } from './database.js';
import DailyResetScheduler from './scheduler.js';
import NotificationScheduler from './services/notification-scheduler.js';
import statsRoutes from './routes/stats-routes.js';
import userStatsRoutes from './routes/user-stats-routes.js';
import notificationRoutes from './routes/notification-routes.js';
import nutritionPlanRoutes from './routes/nutrition-plan-routes.js';
import trainingPlanRoutes from './routes/training-plan-routes.js';
import trainingScheduleRoutes from './routes/training-schedule-routes.js';
import userManagementRoutes from './routes/user-management-routes.js';
import userGoalsRoutes from './routes/user-goals-routes.js';
import apiRoutes from './routes/api-routes.js';
import { authenticateToken, requireAdmin } from './middleware/auth.js';
import {
  validateRequest,
  validateFile,
  sanitizeContent,
  ERROR_CODES,
  sendErrorResponse
} from './utils/validation.js';
import { SystemLogger } from './utils/logging.js';
import {
  globalApiLimit,
  burstLimit,
  loginLimit,
  registerLimit,
  passwordResetLimit,
  checkLoginBlock
} from './middleware/rate-limiter.js';
import {
  corsMiddleware,
  corsErrorHandler,
  securityHeaders,
  logCorsConfig
} from './config/cors.js';
import {
  registerSchema,
  loginSchema,
  dailyHabitsUpdateSchema,
  dailyNoteSchema,
  meditationSessionSchema,
  fileUploadSchema,
  contentLibrarySchema,
  broadcastMessageSchema,
  planAssignmentSchema,
  toggleUserStatusSchema
} from '../shared/validation-schemas.js';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATA_DIRECTORY = process.env.DATA_DIRECTORY || './data';

// CRITICAL: Detect deployment environment
const isDeploymentMode = (): boolean => {
  return !!(
    process.env.INSTANCE_APP_BUILD === 'true' ||
    process.env.NODE_ENV === 'production' ||
    process.env.BUILD_MODE === 'true' ||
    process.env.CI === 'true' ||
    process.env.DEPLOYMENT === 'true'
  );
};

// CRITICAL: Enable trust proxy for deployment platforms
app.set('trust proxy', true);

const deploymentMode = isDeploymentMode();

console.log('🚀 Starting Outdoor Team Server...');
console.log('📊 Environment Configuration:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- BUILD_MODE:', process.env.BUILD_MODE || 'false');
console.log('- INSTANCE_APP_BUILD:', process.env.INSTANCE_APP_BUILD || 'false');
console.log('- CI:', process.env.CI || 'false');
console.log('- DEPLOYMENT:', process.env.DEPLOYMENT || 'false');
console.log('- Deployment Mode:', deploymentMode ? 'ENABLED' : 'DISABLED');
console.log('- DATA_DIRECTORY:', DATA_DIRECTORY);

// Initialize schedulers only in non-deployment environments
let resetScheduler: DailyResetScheduler;
let notificationScheduler: NotificationScheduler;

const checkVapidConfiguration = () => {
  if (deploymentMode) {
    console.log('⚠️ VAPID check skipped in deployment mode');
    return false;
  }

  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

  const isConfigured = !!(VAPID_PUBLIC_KEY && 
                         VAPID_PRIVATE_KEY && 
                         VAPID_PRIVATE_KEY !== 'YOUR_PRIVATE_KEY_HERE' && 
                         VAPID_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY_HERE' &&
                         VAPID_PRIVATE_KEY.length >= 32 &&
                         VAPID_PUBLIC_KEY.length >= 32);

  if (!isConfigured) {
    console.log('⚠️ VAPID keys not configured - push notifications disabled');
    return false;
  }

  console.log('✅ VAPID keys are configured correctly');
  return true;
};

// Ensure uploads directory exists
const uploadsDir = path.join(DATA_DIRECTORY, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const { user_id, file_type } = req.body;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    const filename = `user${user_id}_${file_type}_${timestamp}_${baseName}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const validation = validateFile(file, {
      allowedMimeTypes: ['application/pdf'],
      maxSizeBytes: 10 * 1024 * 1024
    });

    if (validation.isValid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// CRITICAL: Lightweight middleware setup for deployment
console.log('🔧 Setting up middleware...');

// Body parsing with reasonable limits
app.use(express.json({ limit: deploymentMode ? '10mb' : '50mb' }));
app.use(express.urlencoded({ extended: true, limit: deploymentMode ? '10mb' : '50mb' }));

// Security headers (lightweight in deployment mode)
if (deploymentMode) {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
} else {
  app.use(securityHeaders);
}

// CORS middleware (ultra-permissive in deployment)
app.use(corsMiddleware);
app.use(corsErrorHandler);

// Rate limiting (disabled in deployment mode)
if (!deploymentMode) {
  console.log('🚦 Rate limiting enabled for development');
  app.use('/api/', globalApiLimit);
  app.use('/api/', burstLimit);
} else {
  console.log('🚫 Rate limiting DISABLED for deployment');
}

// CRITICAL: Health check endpoints (always first, never blocked)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    app: 'outdoor-team',
    deployment_mode: deploymentMode,
    database_ready: true
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    api_status: 'ok', 
    timestamp: new Date().toISOString(),
    database_ready: true,
    deployment_mode: deploymentMode
  });
});

// Simple root endpoint
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  } else {
    res.json({ 
      message: 'Outdoor Team API Server', 
      status: 'running',
      environment: process.env.NODE_ENV || 'development',
      deployment_mode: deploymentMode
    });
  }
});

const getUserFeatures = (featuresJson: string) => {
  try {
    return JSON.parse(featuresJson || '{}');
  } catch (error) {
    console.error('Error parsing features JSON:', error);
    return {};
  }
};

const formatUserResponse = (user: any) => {
  const features = getUserFeatures(user.features_json);
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    plan_type: user.plan_type,
    created_at: user.created_at,
    is_active: user.is_active,
    features: {
      habits: features.habits || false,
      training: features.training || false,
      nutrition: features.nutrition || false,
      meditation: features.meditation || false,
      active_breaks: features.active_breaks || false
    }
  };
};

// CRITICAL: Mount API routes BEFORE static serving
console.log('🔧 Mounting API routes...');

// Mount API routes with /api prefix
app.use('/api', statsRoutes);
app.use('/api', userStatsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', nutritionPlanRoutes);
app.use('/api', trainingPlanRoutes);
app.use('/api', trainingScheduleRoutes);
app.use('/api/admin', userManagementRoutes);
app.use('/api/admin', userGoalsRoutes);
app.use('/api', apiRoutes);

console.log('✅ API routes mounted successfully');

// Auth Routes with conditional rate limiting
const authLimiter = deploymentMode ? [] : [registerLimit];
const loginLimiter = deploymentMode ? [] : [checkLoginBlock, loginLimit];
const passwordLimiter = deploymentMode ? [] : [passwordResetLimit];

app.post('/api/auth/register',
  ...authLimiter,
  validateRequest(registerSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const { full_name, email, password } = req.body;

      console.log('Registration attempt for:', email);

      const existingUser = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email.toLowerCase())
        .executeTakeFirst();

      if (existingUser) {
        console.log('User already exists:', email);
        if (!deploymentMode) {
          await SystemLogger.logAuthError('Registration attempt with existing email', email, req);
        }
        sendErrorResponse(res, ERROR_CODES.DUPLICATE_ERROR, 'Ya existe un usuario con este correo electrónico');
        return;
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const role = email.toLowerCase() === 'franciscodanielechs@gmail.com' ? 'admin' : 'user';
      const defaultFeatures = '{}';

      const newUser = await db
        .insertInto('users')
        .values({
          full_name: full_name.trim(),
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          role,
          plan_type: role === 'admin' ? 'Programa Totum' : null,
          is_active: 1,
          features_json: role === 'admin' ? '{"habits": true, "training": true, "nutrition": true, "meditation": true, "active_breaks": true}' : defaultFeatures,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'email', 'full_name', 'role', 'plan_type', 'features_json', 'created_at'])
        .executeTakeFirst();

      if (!newUser) {
        sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al crear el usuario');
        return;
      }

      await db
        .insertInto('user_permissions')
        .values({
          user_id: newUser.id,
          dashboard_enabled: 1,
          training_enabled: 1,
          nutrition_enabled: 1,
          meditation_enabled: 1,
          active_breaks_enabled: 1,
          exercises_enabled: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .execute();

      await db
        .insertInto('user_goals')
        .values({
          user_id: newUser.id,
          daily_steps_goal: 8000,
          weekly_points_goal: 28,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .execute();

      const token = jwt.sign(
        {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('User registered successfully:', newUser.email, 'Role:', newUser.role);
      if (!deploymentMode) {
        await SystemLogger.log('info', 'User registered', {
          userId: newUser.id,
          metadata: { email: newUser.email, role: newUser.role }
        });
      }

      res.status(201).json({
        user: formatUserResponse(newUser),
        token
      });
    } catch (error) {
      console.error('Error registering user:', error);
      if (!deploymentMode) {
        await SystemLogger.logCriticalError('Registration error', error as Error);
      }
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor al registrar usuario');
    }
  });

app.post('/api/auth/login',
  ...loginLimiter,
  validateRequest(loginSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const { email, password } = req.body;

      console.log('Login attempt for:', email);

      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email.toLowerCase().trim())
        .executeTakeFirst();

      if (!user) {
        console.log('User not found:', email);
        if (!deploymentMode) {
          await SystemLogger.logAuthError('Login attempt with non-existent email', email, req);
        }
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Credenciales inválidas');
        return;
      }

      if (!user.is_active) {
        console.log('User account is inactive:', email);
        if (!deploymentMode) {
          await SystemLogger.logAuthError('Login attempt with inactive account', email, req);
        }
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Tu cuenta ha sido desactivada. Contacta al administrador.');
        return;
      }

      if (!user.password_hash) {
        console.log('User has no password set:', email);
        if (!deploymentMode) {
          await SystemLogger.logAuthError('Login attempt with user having no password', email, req);
        }
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Credenciales inválidas');
        return;
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        console.log('Invalid password for user:', email);
        if (!deploymentMode) {
          await SystemLogger.logAuthError('Login attempt with invalid password', email, req);
        }
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Credenciales inválidas');
        return;
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      await db
        .updateTable('users')
        .set({ updated_at: new Date().toISOString() })
        .where('id', '=', user.id)
        .execute();

      console.log('Login successful for user:', user.email, 'Role:', user.role, 'Plan:', user.plan_type);
      if (!deploymentMode) {
        await SystemLogger.log('info', 'User login successful', {
          userId: user.id,
          metadata: { email: user.email, role: user.role }
        });
      }

      res.json({
        user: formatUserResponse(user),
        token
      });
    } catch (error) {
      console.error('Error logging in user:', error);
      if (!deploymentMode) {
        await SystemLogger.logCriticalError('Login error', error as Error);
      }
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor al iniciar sesión');
    }
  });

app.post('/api/auth/reset-password',
  ...passwordLimiter,
  async (req: express.Request, res: express.Response) => {
    try {
      if (!deploymentMode) {
        await SystemLogger.log('info', 'Password reset requested');
      }
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Funcionalidad de reset de contraseña aún no implementada');
    } catch (error) {
      console.error('Password reset error:', error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error en reset de contraseña');
    }
  });

app.get('/api/auth/me', authenticateToken, (req: any, res: express.Response) => {
  res.json(formatUserResponse(req.user));
});

// User goals endpoint
app.get('/api/my-goals', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    console.log('Fetching goals for user:', userId);

    let goals = await db
      .selectFrom('user_goals')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!goals) {
      goals = await db
        .insertInto('user_goals')
        .values({
          user_id: userId,
          daily_steps_goal: 8000,
          weekly_points_goal: 28,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'daily_steps_goal', 'weekly_points_goal', 'created_at', 'updated_at'])
        .executeTakeFirst();
    }

    res.json(goals);
  } catch (error) {
    console.error('Error fetching user goals:', error);
    if (!deploymentMode) {
      await SystemLogger.logCriticalError('User goals fetch error', error as Error, { userId: req.user?.id });
    }
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener metas del usuario');
  }
});

// CRITICAL: Setup static serving AFTER all API routes
if (process.env.NODE_ENV === 'production') {
  console.log('🗂️ Setting up static file serving for production...');
  setupStaticServing(app);
  console.log('✅ Static file serving configured for production');
}

// API route fallback - must be AFTER all specific API routes but BEFORE static serving
app.use('/api/*splat', (req, res) => {
  console.warn(`404 - API route not found: ${req.method} ${req.path}`);
  sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'API endpoint not found');
});

// Ultra-permissive global error handler for deployment
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  // In deployment mode, be more permissive with errors
  if (deploymentMode) {
    console.log('⚠️ Error in deployment mode - responding with generic error');
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
  
  sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor');
});

export const startServer = async (port = 3001) => {
  try {
    // Test database connection
    await db.selectFrom('users').select('id').limit(1).execute();
    console.log('✅ Database connection established');

    // Only check VAPID and initialize schedulers in non-deployment mode
    let vapidConfigured = false;
    if (!deploymentMode) {
      vapidConfigured = checkVapidConfiguration();

      console.log('🔄 Initializing daily reset scheduler...');
      resetScheduler = new DailyResetScheduler(db);
      await resetScheduler.initialize();

      console.log('🔔 Initializing notification scheduler...');
      notificationScheduler = new NotificationScheduler();
    } else {
      console.log('⚠️ Skipping scheduler initialization in deployment mode');
    }

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Listening on: 0.0.0.0:${port}`);
      console.log(`🚦 Rate limiting: ${deploymentMode ? 'DISABLED' : 'ENABLED'}`);
      console.log(`🔧 Deployment mode: ${deploymentMode ? 'YES' : 'NO'}`);
      console.log(`🌍 CORS: ${deploymentMode ? 'Ultra-permissive' : 'Standard'} mode`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🌐 Frontend dev server: http://localhost:3000`);
        console.log(`🔌 API server: http://localhost:${port}`);
      }
      
      if (!deploymentMode) {
        logCorsConfig();
        
        if (vapidConfigured) {
          console.log('📱 Push notifications: Ready');
        } else {
          console.log('📱 Push notifications: Disabled (not configured)');
        }
      } else {
        console.log('📱 Push notifications: Disabled (deployment mode)');
      }

      console.log('📋 API Routes Summary:');
      console.log('   - /health - Health check (always available)');
      console.log('   - /api/health - API health check');
      console.log('   - /api/auth/* - Authentication routes');
      console.log('   - /api/users - Users management');
      console.log('   - /api/plans - Plans management');
      console.log('   - /api/admin/* - Admin routes');
      console.log(`   - Rate limiting: ${deploymentMode ? 'DISABLED' : 'ENABLED'}`);
      console.log(`   - CORS: ${deploymentMode ? 'Ultra-permissive' : 'Standard'}`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
      
      try {
        server.close(async () => {
          console.log('🔌 HTTP server closed');
          
          if (resetScheduler) {
            resetScheduler.stop();
            console.log('⏹️  Daily reset scheduler stopped');
          }
          
          try {
            await db.destroy();
            console.log('🗄️  Database connection closed');
          } catch (dbError) {
            console.error('Error closing database:', dbError);
          }
          
          console.log('✅ Graceful shutdown complete');
          process.exit(0);
        });
        
        setTimeout(() => {
          console.error('❌ Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000); // Reduced timeout for faster deployment
        
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3001', 10);
  startServer(port);
}

export default app;
