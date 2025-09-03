
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
import plansManagementRoutes from './routes/plans-management-routes.js';
import dailyHabitsRoutes from './routes/daily-habits-routes.js';
import dailyNotesRoutes from './routes/daily-notes-routes.js';
import myGoalsRoutes from './routes/my-goals-routes.js';
import apiRoutes from './routes/api-routes.js';
import authRoutes from './routes/auth-routes.js';
import evaluationsRoutes from './routes/evaluations-routes.js';
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

// Enable trust proxy for deployment platforms
app.set('trust proxy', true);

// Initialize schedulers
let resetScheduler: DailyResetScheduler;
let notificationScheduler: NotificationScheduler;

const checkVapidConfiguration = () => {
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

  const isConfigured = !!(VAPID_PUBLIC_KEY && 
                         VAPID_PRIVATE_KEY && 
                         VAPID_PRIVATE_KEY !== 'YOUR_PRIVATE_KEY_HERE' && 
                         VAPID_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY_HERE' &&
                         VAPID_PRIVATE_KEY.length >= 32 &&
                         VAPID_PUBLIC_KEY.length >= 32);

  if (!isConfigured) {
    return false;
  }

  console.log('✅ VAPID keys are configured correctly');
  return true;
};

const uploadsDir = path.join(DATA_DIRECTORY, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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

// Security headers first (RELAXED for deployment)
app.use(securityHeaders);

// Body parsing middleware with larger limits for deployment
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply CORS to all routes (VERY PERMISSIVE for deployment)
app.use(corsMiddleware);
app.use(corsErrorHandler);

// CONDITIONAL rate limiting - disabled for builds and deployment
const isDeploymentMode = process.env.BUILD_MODE === 'true' || 
                        process.env.INSTANCE_APP_BUILD === 'true' ||
                        process.env.NODE_ENV === 'production';

if (!isDeploymentMode) {
  app.use('/api/', globalApiLimit);
  app.use('/api/', burstLimit);
  console.log('📊 Rate limiting enabled for development');
} else {
  console.log('🚀 Rate limiting disabled for deployment/production');
}

// Health check endpoint (FIRST - no auth needed)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    app: 'outdoor-team',
    build_mode: process.env.BUILD_MODE || 'false',
    instance_app_build: process.env.INSTANCE_APP_BUILD || 'false',
    deployment_url: process.env.DEPLOYMENT_URL || 'unknown',
    cwd: process.cwd()
  });
});

// Deployment info endpoint
app.get('/deployment-info', (req, res) => {
  const publicPath = path.join(process.cwd(), 'public');
  const indexExists = fs.existsSync(path.join(publicPath, 'index.html'));
  
  res.json({
    status: 'deployment-info',
    environment: process.env.NODE_ENV || 'development',
    cwd: process.cwd(),
    publicPath,
    indexExists,
    dataDirectory: DATA_DIRECTORY,
    timestamp: new Date().toISOString(),
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']
    }
  });
});

// System logs endpoint for debugging (admin only)
app.get('/api/system-logs', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    console.log('Admin fetching system logs');

    const { level, limit = 100 } = req.query;
    
    let query = db
      .selectFrom('system_logs')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string));

    if (level) {
      query = query.where('level', '=', level as string);
    }

    const logs = await query.execute();

    console.log('System logs fetched:', logs.length);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    await SystemLogger.logCriticalError('System logs fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener logs del sistema');
  }
});

// Diagnostic endpoint (admin only)
app.get('/api/diagnostics', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    console.log('Admin requesting diagnostics');

    // Check database connection
    const dbTest = await db.selectFrom('users').select('id').limit(1).execute();
    
    // Check file system
    const dataExists = fs.existsSync(DATA_DIRECTORY);
    const uploadsExists = fs.existsSync(uploadsDir);
    const publicExists = fs.existsSync(path.join(process.cwd(), 'public'));
    const indexExists = fs.existsSync(path.join(process.cwd(), 'public', 'index.html'));
    
    // Get environment info
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      BUILD_MODE: process.env.BUILD_MODE,
      INSTANCE_APP_BUILD: process.env.INSTANCE_APP_BUILD,
      DATA_DIRECTORY: DATA_DIRECTORY,
      VAPID_CONFIGURED: checkVapidConfiguration(),
      CWD: process.cwd()
    };

    const diagnostics = {
      database: {
        connected: true,
        test_query_rows: dbTest.length
      },
      filesystem: {
        data_directory_exists: dataExists,
        uploads_directory_exists: uploadsExists,
        public_directory_exists: publicExists,
        index_html_exists: indexExists,
        data_path: DATA_DIRECTORY,
        uploads_path: uploadsDir,
        public_path: path.join(process.cwd(), 'public')
      },
      environment: envInfo,
      timestamp: new Date().toISOString()
    };

    console.log('Diagnostics completed:', diagnostics);
    res.json(diagnostics);
  } catch (error) {
    console.error('Error running diagnostics:', error);
    await SystemLogger.logCriticalError('Diagnostics error', error as Error, { userId: req.user?.id });
    res.status(500).json({
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple root endpoint (before static serving)
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Outdoor Team API Server', 
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    deployment: {
      url: process.env.DEPLOYMENT_URL || req.headers.host,
      cwd: process.cwd(),
      platform: 'instance.app'
    }
  });
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

// Mount routes
app.use('/api', statsRoutes);
app.use('/api', userStatsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', nutritionPlanRoutes);
app.use('/api', trainingPlanRoutes);
app.use('/api', trainingScheduleRoutes);
app.use('/api/admin', userManagementRoutes);
app.use('/api/admin', userGoalsRoutes);
app.use('/api/admin', plansManagementRoutes);
app.use('/api', dailyHabitsRoutes);
app.use('/api', dailyNotesRoutes);
app.use('/api', myGoalsRoutes);
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', evaluationsRoutes);

// Admin Users Route (Critical for AdminPage)
app.get('/api/users', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    console.log('Admin fetching all users');

    const users = await db
      .selectFrom('users')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    console.log('Users fetched:', users.length);

    const formattedUsers = users.map(user => formatUserResponse(user));
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    await SystemLogger.logCriticalError('Users fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener usuarios');
  }
});

// Plans Route (Critical for AdminPage)
app.get('/api/plans', authenticateToken, async (req: any, res: express.Response) => {
  try {
    console.log('Fetching plans for user:', req.user.email);

    const plans = await db
      .selectFrom('plans')
      .selectAll()
      .where('is_active', '=', 1)
      .orderBy('created_at', 'desc')
      .execute();

    console.log('Plans fetched:', plans.length);
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    await SystemLogger.logCriticalError('Plans fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener planes');
  }
});

// Content Library Route (Critical for AdminPage)
app.get('/api/content-library', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { category } = req.query;
    console.log('Fetching content library for user:', req.user.email, 'category:', category);
    
    let query = db
      .selectFrom('content_library')
      .selectAll()
      .where('is_active', '=', 1);
    
    if (category) {
      query = query.where('category', '=', category as string);
    }
    
    const content = await query.execute();
    
    console.log('Content library items fetched:', content.length);
    res.json(content);
  } catch (error) {
    console.error('Error fetching content library:', error);
    await SystemLogger.logCriticalError('Content library fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener biblioteca de contenido');
  }
});

// Auth Routes with CONDITIONAL Rate Limiting (disabled for deployment)
const authRateLimit = isDeploymentMode ? 
  (req: express.Request, res: express.Response, next: express.NextFunction) => next() : 
  registerLimit;

const loginRateLimit = isDeploymentMode ? 
  (req: express.Request, res: express.Response, next: express.NextFunction) => next() : 
  loginLimit;

const loginBlockCheck = isDeploymentMode ? 
  (req: express.Request, res: express.Response, next: express.NextFunction) => next() : 
  checkLoginBlock;

app.post('/api/auth/register',
  authRateLimit,
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
        await SystemLogger.logAuthError('Registration attempt with existing email', email, req);
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
      await SystemLogger.log('info', 'User registered', {
        userId: newUser.id,
        metadata: { email: newUser.email, role: newUser.role }
      });

      res.status(201).json({
        user: formatUserResponse(newUser),
        token
      });
    } catch (error) {
      console.error('Error registering user:', error);
      await SystemLogger.logCriticalError('Registration error', error as Error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor al registrar usuario');
    }
  });

app.post('/api/auth/login',
  loginBlockCheck,
  loginRateLimit,
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
        await SystemLogger.logAuthError('Login attempt with non-existent email', email, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Credenciales inválidas');
        return;
      }

      if (!user.is_active) {
        console.log('User account is inactive:', email);
        await SystemLogger.logAuthError('Login attempt with inactive account', email, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Tu cuenta ha sido desactivada. Contacta al administrador.');
        return;
      }

      if (!user.password_hash) {
        console.log('User has no password set:', email);
        await SystemLogger.logAuthError('Login attempt with user having no password', email, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Credenciales inválidas');
        return;
      }

      console.log('Checking password for user:', email);

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Password validation result:', isValidPassword);

      if (!isValidPassword) {
        console.log('Invalid password for user:', email);
        await SystemLogger.logAuthError('Login attempt with invalid password', email, req);
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
      await SystemLogger.log('info', 'User login successful', {
        userId: user.id,
        metadata: { email: user.email, role: user.role }
      });

      res.json({
        user: formatUserResponse(user),
        token
      });
    } catch (error) {
      console.error('Error logging in user:', error);
      await SystemLogger.logCriticalError('Login error', error as Error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor al iniciar sesión');
    }
  });

app.post('/api/auth/reset-password',
  passwordResetLimit,
  async (req: express.Request, res: express.Response) => {
    try {
      await SystemLogger.log('info', 'Password reset requested');
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Funcionalidad de reset de contraseña aún no implementada');
    } catch (error) {
      console.error('Password reset error:', error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error en reset de contraseña');
    }
  });

app.get('/api/auth/me', authenticateToken, (req: any, res: express.Response) => {
  res.json(formatUserResponse(req.user));
});

// Setup static serving for production (ALWAYS in production)
if (process.env.NODE_ENV === 'production') {
  setupStaticServing(app);
  console.log('📁 Static file serving configured for production');
}

// More permissive error handling for deployment
app.use((req, res, next) => {
  console.warn(`404 - Route not found: ${req.method} ${req.path}`);
  
  if (req.path.startsWith('/api/')) {
    sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'API endpoint not found');
    return;
  }
  
  // In production, try to serve the SPA
  if (process.env.NODE_ENV === 'production') {
    const indexPath = path.join(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ 
        error: 'App not built',
        message: 'Missing index.html - run npm run build',
        cwd: process.cwd()
      });
    }
    return;
  }
  
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (very permissive for deployment)
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor');
});

export const startServer = async (port = 3001) => {
  try {
    console.log('🔄 Starting server initialization...');
    console.log('📂 Data directory:', DATA_DIRECTORY);
    console.log('🏗️  Build mode:', process.env.BUILD_MODE || 'false');
    console.log('🌐 Instance app build:', process.env.INSTANCE_APP_BUILD || 'false');
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    console.log('📁 Current working directory:', process.cwd());

    // Test database connection with detailed logging
    console.log('🔌 Testing database connection...');
    await db.selectFrom('users').select('id').limit(1).execute();
    console.log('✅ Database connection established');

    const vapidConfigured = checkVapidConfiguration();

    console.log('🔄 Initializing daily reset scheduler...');
    resetScheduler = new DailyResetScheduler(db);
    await resetScheduler.initialize();

    console.log('🔔 Initializing notification scheduler...');
    notificationScheduler = new NotificationScheduler();

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Listening on: 0.0.0.0:${port}`);
      console.log(`📂 Current working directory: ${process.cwd()}`);
      console.log(`📁 Data directory: ${DATA_DIRECTORY}`);
      
      // Log deployment info
      if (process.env.NODE_ENV === 'production') {
        console.log(`🚀 Production deployment ready`);
        
        // Check if built files exist
        const publicPath = path.join(process.cwd(), 'public');
        const indexExists = fs.existsSync(path.join(publicPath, 'index.html'));
        console.log(`📁 Public directory: ${publicPath}`);
        console.log(`📄 Index.html exists: ${indexExists}`);
        
        if (!indexExists) {
          console.log('⚠️  WARNING: index.html not found - run npm run build');
        }
      } else {
        console.log(`🌐 Frontend dev server: http://localhost:3000`);
        console.log(`🔌 API server: http://localhost:${port}`);
      }
      
      logCorsConfig();
      
      if (vapidConfigured) {
        console.log('📱 Push notifications: Ready');
      } else {
        console.log('📱 Push notifications: Disabled');
        console.log('   To enable: npm run generate-vapid && restart server');
      }

      console.log('✅ Server startup completed successfully');
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
        }, 30000);
        
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown',
      cwd: process.cwd(),
      dataDir: DATA_DIRECTORY,
      env: process.env.NODE_ENV
    });
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3001', 10);
  startServer(port);
}

export default app;
