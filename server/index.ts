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
import AchievementService from './services/achievement-service.js';
import statsRoutes from './routes/stats-routes.js';
import notificationRoutes from './routes/notification-routes.js';
import achievementRoutes from './routes/achievement-routes.js';
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
  planAssignmentSchema
} from '../shared/validation-schemas.js';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATA_DIRECTORY = process.env.DATA_DIRECTORY || './data';

// Enable trust proxy to get real client IPs
app.set('trust proxy', true);

// Initialize schedulers
let resetScheduler: DailyResetScheduler;
let notificationScheduler: NotificationScheduler;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(DATA_DIRECTORY, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'video/mp4', 'text/csv'],
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication middleware
const authenticateToken = async (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Token de acceso requerido');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', decoded.id)
      .executeTakeFirst();

    if (!user) {
      await SystemLogger.logAuthError('User not found for token', undefined, req);
      sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Usuario no encontrado');
      return;
    }

    if (!user.is_active) {
      await SystemLogger.logAuthError('Inactive user attempted access', user.email, req);
      sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Cuenta desactivada');
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    await SystemLogger.logAuthError('Invalid token', undefined, req);
    sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Token inválido');
    return;
  }
};

// Admin middleware
const requireAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
  if (req.user.role !== 'admin') {
    sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado. Se requieren permisos de administrador.');
    return;
  }
  next();
};

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
app.use('/api/', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/achievements', achievementRoutes);

// Auth Routes with Rate Limiting
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

      // Generate JWT
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
        req,
        metadata: { email: newUser.email, role: newUser.role }
      });

      res.status(201).json({ 
        user: formatUserResponse(newUser),
        token 
      });
    } catch (error) {
      console.error('Error registering user:', error);
      await SystemLogger.logCriticalError('Registration error', error as Error, { req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor al registrar usuario');
    }
  });

app.post('/api/auth/login', 
  checkLoginBlock, // Check if IP/email is blocked first
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

      // Check password
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

      // Generate JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login timestamp
      await db
        .updateTable('users')
        .set({ updated_at: new Date().toISOString() })
        .where('id', '=', user.id)
        .execute();

      console.log('Login successful for user:', user.email, 'Role:', user.role, 'Plan:', user.plan_type);
      await SystemLogger.log('info', 'User login successful', {
        userId: user.id,
        req,
        metadata: { email: user.email, role: user.role }
      });

      res.json({ 
        user: formatUserResponse(user), 
        token 
      });
    } catch (error) {
      console.error('Error logging in user:', error);
      await SystemLogger.logCriticalError('Login error', error as Error, { req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor al iniciar sesión');
    }
  });

// Password reset endpoint (future implementation)
app.post('/api/auth/reset-password', 
  passwordResetLimit,
  async (req: express.Request, res: express.Response) => {
    try {
      await SystemLogger.log('info', 'Password reset requested', { req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Funcionalidad de reset de contraseña aún no implementada');
    } catch (error) {
      console.error('Password reset error:', error);
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error en reset de contraseña');
    }
  });

app.get('/api/auth/me', authenticateToken, (req: any, res: express.Response) => {
  res.json(formatUserResponse(req.user));
});

// Plan Selection and Assignment
app.post('/api/users/:id/assign-plan', 
  authenticateToken, 
  validateRequest(planAssignmentSchema),
  async (req: any, res: express.Response) => {
    try {
      const { id } = req.params;
      const { planId } = req.body;
      const requestingUserId = req.user.id;
      const requestingUserRole = req.user.role;

      // Users can only assign plans to themselves unless they're admin
      if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
        sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
        return;
      }

      console.log('Assigning plan', planId, 'to user', id);

      // Get the plan details
      const plan = await db
        .selectFrom('plans')
        .selectAll()
        .where('id', '=', parseInt(planId))
        .where('is_active', '=', 1)
        .executeTakeFirst();

      if (!plan) {
        sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Plan no encontrado');
        return;
      }

      // Update user with new plan and features
      const updatedUser = await db
        .updateTable('users')
        