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
import { authenticateToken, requireAdmin, validateJWTConfig } from './middleware/auth.js';
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
  createCorsMiddleware,
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

// Load environment variables first
dotenv.config();

console.log('🚀 Starting Outdoor Team server...');
console.log('Environment variables loaded:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- DATA_DIRECTORY:', process.env.DATA_DIRECTORY);
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? `Set (${process.env.JWT_SECRET.length} chars)` : 'Not set');
console.log('- VAPID_PUBLIC_KEY:', process.env.VAPID_PUBLIC_KEY ? 'Set' : 'Not set');
console.log('- VAPID_PRIVATE_KEY:', process.env.VAPID_PRIVATE_KEY ? `Set (${process.env.VAPID_PRIVATE_KEY.length} chars)` : 'Not set');

const app = express();

// Environment variable validation and defaults
const JWT_SECRET = process.env.JWT_SECRET || 'production-fallback-jwt-secret-8f7a6e5d4c3b2a1098765432109876543210fedcba0987654321abcdef123456';
const DATA_DIRECTORY = path.resolve(process.env.DATA_DIRECTORY || '/app/data');
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'production';

// Critical validation - prevent startup if JWT_SECRET is not secure in production
if (NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('❌ CRITICAL ERROR: JWT_SECRET must be set and secure (32+ chars) in production!');
  console.error('Current JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
  process.exit(1);
}

console.log('Resolved configuration:');
console.log('- JWT_SECRET length:', JWT_SECRET.length);
console.log('- DATA_DIRECTORY:', DATA_DIRECTORY);
console.log('- PORT:', PORT);
console.log('- NODE_ENV:', NODE_ENV);

// Validate JWT configuration early
try {
  validateJWTConfig();
  console.log('✅ JWT configuration validated');
} catch (error) {
  console.error('❌ JWT configuration error:', error);
  process.exit(1);
}

// Ensure data directory exists with proper error handling
console.log('📁 Setting up data directory...');
try {
  console.log('Creating data directory if it doesn\'t exist:', DATA_DIRECTORY);
  
  if (!fs.existsSync(DATA_DIRECTORY)) {
    console.log(`Creating data directory: ${DATA_DIRECTORY}`);
    fs.mkdirSync(DATA_DIRECTORY, { recursive: true, mode: 0o755 });
    console.log('✅ Data directory created');
  } else {
    console.log('✅ Data directory already exists');
  }
  
  // Test write permissions
  const testFile = path.join(DATA_DIRECTORY, '.write-test');
  try {
    fs.writeFileSync(testFile, 'test', { mode: 0o644 });
    fs.unlinkSync(testFile);
    console.log('✅ Data directory is writable');
  } catch (writeError) {
    console.error('❌ Data directory is not writable:', writeError);
    // Try to fix permissions
    try {
      fs.chmodSync(DATA_DIRECTORY, 0o755);
      console.log('📝 Fixed data directory permissions');
    } catch (chmodError) {
      console.error('❌ Could not fix data directory permissions:', chmodError);
      process.exit(1);
    }
  }
  
} catch (error) {
  console.error('❌ Error setting up data directory:', error);
  console.error('This is usually a permissions issue or invalid path');
  
  // In production, try alternative data directory
  if (NODE_ENV === 'production') {
    console.log('🔄 Trying alternative data directory: ./data');
    try {
      const altDataDir = path.resolve('./data');
      if (!fs.existsSync(altDataDir)) {
        fs.mkdirSync(altDataDir, { recursive: true, mode: 0o755 });
      }
      console.log('✅ Alternative data directory created:', altDataDir);
      // Update DATA_DIRECTORY for the rest of the application
      process.env.DATA_DIRECTORY = altDataDir;
    } catch (altError) {
      console.error('❌ Could not create alternative data directory:', altError);
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
}

// Enable trust proxy to get real client IPs (REQUIRED for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Initialize schedulers
let resetScheduler: DailyResetScheduler;
let notificationScheduler: NotificationScheduler;

// Check and log VAPID configuration
const checkVapidConfiguration = () => {
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

  console.log('🔔 Checking VAPID configuration...');
  
  const isConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_PRIVATE_KEY !== 'YOUR_PRIVATE_KEY_HERE' && VAPID_PRIVATE_KEY.length >= 32);

  if (!isConfigured) {
    console.warn('⚠️  VAPID keys are not properly configured!');
    console.warn('   Push notifications will not work.');
    console.warn('   Public key:', VAPID_PUBLIC_KEY ? `Set (${VAPID_PUBLIC_KEY.length} chars)` : 'Not set');
    console.warn('   Private key:', VAPID_PRIVATE_KEY ? `Set (${VAPID_PRIVATE_KEY.length} chars)` : 'Not set');
    return false;
  }

  console.log('✅ VAPID keys are configured correctly');
  return true;
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(DATA_DIRECTORY, 'uploads');
console.log('📁 Setting up uploads directory:', uploadsDir);
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
    console.log('✅ Uploads directory created');
  } else {
    console.log('✅ Uploads directory already exists');
  }
} catch (error) {
  console.error('❌ Error creating uploads directory:', error);
  // Don't exit - this is not critical for startup
}

// Configure multer for file uploads with validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate filename with user_id and category for better organization
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
      maxSizeBytes: 10 * 1024 * 1024 // 10MB limit for PDFs
    });

    if (validation.isValid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Security headers for all routes
app.use(securityHeaders);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply CORS only to API routes
app.use('/api/', createCorsMiddleware('/api'));

// CORS error handler (must be after CORS middleware)
app.use(corsErrorHandler);

// Apply global rate limiting to all API routes
app.use('/api/', globalApiLimit);
app.use('/api/', burstLimit);

// Health check endpoint (exempted from rate limiting and CORS)
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT,
    dataDirectory: DATA_DIRECTORY,
    vapidConfigured: checkVapidConfiguration(),
    version: '1.0.0'
  });
});

// Helper function to parse user features
const getUserFeatures = (featuresJson: string) => {
  try {
    return JSON.parse(featuresJson || '{}');
  } catch (error) {
    console.error('Error parsing features JSON:', error);
    return {};
  }
};

// Helper function to format user response with features
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
console.log('🛣️  Setting up routes...');
app.use('/api/', statsRoutes);
app.use('/api/', userStatsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/', nutritionPlanRoutes);
app.use('/api/', trainingPlanRoutes);
app.use('/api/', trainingScheduleRoutes);
app.use('/api/admin', userManagementRoutes);
app.use('/api/admin', userGoalsRoutes);
console.log('✅ Routes mounted');

// Auth Routes with Rate Limiting (CORRECT ORDER)
app.post('/api/auth/register',
  registerLimit,
  validateRequest(registerSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const { full_name, email, password } = req.body;

      console.log('Registration attempt for:', email);

      // Check if user already exists
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

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Determine role - make franciscodanielechs@gmail.com admin
      const role = email.toLowerCase() === 'franciscodanielechs@gmail.com' ? 'admin' : 'user';

      // Set default features for new users (empty - they need to select a plan)
      const defaultFeatures = '{}';

      // Create user
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

      // Create default permissions for new user
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

      // Create default goals for new user
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

      // Generate JWT with consistent secret
      const token = jwt.sign(
        {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          iat: Math.floor(Date.now() / 1000)
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

// LOGIN ROUTE WITH CORRECT MIDDLEWARE ORDER
app.post('/api/auth/login',
  checkLoginBlock,    
  loginLimit,
  validateRequest(loginSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const { email, password } = req.body;

      console.log('Login attempt for:', email);

      // Find user
      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email.toLowerCase())
        .executeTakeFirst();

      if (!user || !user.password_hash) {
        console.log('User not found or no password:', email);
        await SystemLogger.logAuthError('Login attempt with invalid email', email, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Credenciales inválidas');
        return;
      }

      if (!user.is_active) {
        console.log('Inactive user login attempt:', email);
        await SystemLogger.logAuthError('Login attempt by inactive user', email, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Cuenta desactivada');
        return;
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);

      if (!passwordValid) {
        console.log('Invalid password for user:', email);
        await SystemLogger.logAuthError('Login attempt with invalid password', email, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Credenciales inválidas');
        return;
      }

      // Generate JWT with consistent secret
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('User logged in successfully:', user.email, 'Role:', user.role);
      await SystemLogger.log('info', 'User logged in', {
        userId: user.id,
        metadata: { email: user.email, role: user.role }
      });

      res.json({
        user: formatUserResponse(user),
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      await SystemLogger.logCriticalError('Login error', error as Error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor');
    }
  });

// Verify token endpoint (both /api/auth/verify and /api/auth/me for compatibility)
app.get('/api/auth/verify', authenticateToken, async (req: express.Request, res: express.Response) => {
  res.json({
    user: formatUserResponse(req.user)
  });
});

app.get('/api/auth/me', authenticateToken, async (req: express.Request, res: express.Response) => {
  console.log('Token verification requested for user:', req.user?.id);
  res.json(formatUserResponse(req.user));
});

// PROTECTED ROUTES (require authentication)

// Daily habits endpoints
app.get('/api/daily-habits', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { date } = req.query;
    const userId = req.user.id;
    const targetDate = date as string || new Date().toISOString().split('T')[0];

    console.log(`Fetching daily habits for user ${userId}, date: ${targetDate}`);

    const habits = await db
      .selectFrom('daily_habits')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', targetDate)
      .executeTakeFirst();

    if (!habits) {
      // Create default habits record if none exists
      const defaultHabits = await db
        .insertInto('daily_habits')
        .values({
          user_id: userId,
          date: targetDate,
          training_completed: 0,
          nutrition_completed: 0,
          movement_completed: 0,
          meditation_completed: 0,
          daily_points: 0,
          steps: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'date', 'training_completed', 'nutrition_completed', 'movement_completed', 'meditation_completed', 'daily_points', 'steps', 'created_at', 'updated_at'])
        .executeTakeFirst();

      res.json(defaultHabits);
      return;
    }

    res.json(habits);
  } catch (error) {
    console.error('Error fetching daily habits:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener los hábitos diarios');
  }
});

app.put('/api/daily-habits', 
  authenticateToken,
  validateRequest(dailyHabitsUpdateSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user.id;
      const { date, training_completed, nutrition_completed, movement_completed, meditation_completed, steps } = req.body;
      
      console.log(`Updating daily habits for user ${userId}, date: ${date}`);

      // Calculate points based on completed habits
      let points = 0;
      if (training_completed) points += 4;
      if (nutrition_completed) points += 4;
      if (movement_completed) points += 2;
      if (meditation_completed) points += 2;

      const updatedHabits = await db
        .insertInto('daily_habits')
        .values({
          user_id: userId,
          date,
          training_completed: training_completed ? 1 : 0,
          nutrition_completed: nutrition_completed ? 1 : 0,
          movement_completed: movement_completed ? 1 : 0,
          meditation_completed: meditation_completed ? 1 : 0,
          daily_points: points,
          steps: steps || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .onConflict((oc) => oc.columns(['user_id', 'date']).doUpdateSet({
          training_completed: training_completed ? 1 : 0,
          nutrition_completed: nutrition_completed ? 1 : 0,
          movement_completed: movement_completed ? 1 : 0,
          meditation_completed: meditation_completed ? 1 : 0,
          daily_points: points,
          steps: steps !== undefined ? steps : 0,
          updated_at: new Date().toISOString()
        }))
        .returning(['id', 'user_id', 'date', 'training_completed', 'nutrition_completed', 'movement_completed', 'meditation_completed', 'daily_points', 'steps', 'created_at', 'updated_at'])
        .executeTakeFirst();

      res.json(updatedHabits);
    } catch (error) {
      console.error('Error updating daily habits:', error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar los hábitos diarios');
    }
  });

// Daily notes endpoints
app.get('/api/daily-notes', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { date } = req.query;
    const userId = req.user.id;
    const targetDate = date as string || new Date().toISOString().split('T')[0];

    const note = await db
      .selectFrom('user_notes')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', targetDate)
      .executeTakeFirst();

    res.json(note || null);
  } catch (error) {
    console.error('Error fetching daily note:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener la nota diaria');
  }
});

app.post('/api/daily-notes', 
  authenticateToken,
  validateRequest(dailyNoteSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user.id;
      const { content, date } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const sanitizedContent = sanitizeContent(content);

      const note = await db
        .insertInto('user_notes')
        .values({
          user_id: userId,
          content: sanitizedContent,
          date: targetDate,
          created_at: new Date().toISOString()
        })
        .onConflict((oc) => oc.columns(['user_id', 'date']).doUpdateSet({
          content: sanitizedContent
        }))
        .returning(['id', 'user_id', 'content', 'date', 'created_at'])
        .executeTakeFirst();

      res.json(note);
    } catch (error) {
      console.error('Error saving daily note:', error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar la nota diaria');
    }
  });

// Meditation session endpoint
app.post('/api/meditation-sessions',
  authenticateToken,
  validateRequest(meditationSessionSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user.id;
      const { duration_minutes, meditation_type, comment, breathing_cycle_json } = req.body;

      const session = await db
        .insertInto('meditation_sessions')
        .values({
          user_id: userId,
          duration_minutes,
          meditation_type,
          breathing_cycle_json: breathing_cycle_json || null,
          comment: comment ? sanitizeContent(comment) : null,
          completed_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'duration_minutes', 'meditation_type', 'breathing_cycle_json', 'comment', 'completed_at'])
        .executeTakeFirst();

      res.status(201).json(session);
    } catch (error) {
      console.error('Error saving meditation session:', error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar la sesión de meditación');
    }
  });

// Setup static file serving and remaining routes
console.log('🌐 Setting up static file serving...');
setupStaticServing(app, DATA_DIRECTORY);

// Start server and initialize background services
const startServer = async () => {
  try {
    console.log('🔧 Initializing server components...');

    // Check VAPID configuration
    const vapidConfigured = checkVapidConfiguration();

    // Log CORS configuration
    logCorsConfig();

    // Initialize schedulers with error handling
    console.log('⏰ Initializing schedulers...');
    try {
      resetScheduler = new DailyResetScheduler(db);
      await resetScheduler.initialize();
      console.log('✅ Daily reset scheduler initialized');
    } catch (error) {
      console.error('⚠️  Failed to initialize daily reset scheduler (non-fatal):', error);
    }

    try {
      notificationScheduler = new NotificationScheduler(db);
      await notificationScheduler.initialize();
      console.log('✅ Notification scheduler initialized');
    } catch (error) {
      console.error('⚠️  Failed to initialize notification scheduler (non-fatal):', error);
    }

    console.log(`🎧 Starting server on port ${PORT}...`);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🎉 ===============================================');
      console.log('🚀 Outdoor Team server started successfully!');
      console.log('===============================================');
      console.log(`📍 Server running on port: ${PORT}`);
      console.log(`📁 Data directory: ${DATA_DIRECTORY}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔔 VAPID configured: ${vapidConfigured ? 'Yes' : 'No'}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      
      if (NODE_ENV === 'production') {
        console.log(`🌐 Production server ready`);
      } else {
        console.log(`🌐 Frontend: http://localhost:3000`);
        console.log(`🔧 API: http://localhost:${PORT}`);
      }
      console.log('===============================================');
      console.log('✅ Server is ready to accept connections');
      console.log('');
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        console.log('🔌 HTTP server closed');
        
        // Stop schedulers
        try {
          if (resetScheduler) {
            resetScheduler.stop();
            console.log('⏹️  Daily reset scheduler stopped');
          }
        } catch (error) {
          console.error('Error stopping reset scheduler:', error);
        }
        
        try {
          if (notificationScheduler) {
            notificationScheduler.stop();
            console.log('⏹️  Notification scheduler stopped');
          }
        } catch (error) {
          console.error('Error stopping notification scheduler:', error);
        }
        
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', (error as Error).stack);
    
    if (SystemLogger) {
      await SystemLogger.logCriticalError('Server startup failed', error as Error);
    }
    
    console.error('Exiting with code 1...');
    process.exit(1);
  }
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
console.log('🏁 Initiating server startup...');
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
