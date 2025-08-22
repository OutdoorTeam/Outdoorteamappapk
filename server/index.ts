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

// Load environment variables
dotenv.config();

const app = express();

// Environment variable validation and defaults
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATA_DIRECTORY = process.env.DATA_DIRECTORY || './data';
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables
if (JWT_SECRET === 'your-secret-key-change-in-production' && NODE_ENV === 'production') {
  console.error('❌ CRITICAL: JWT_SECRET must be changed in production!');
  console.error('   Set JWT_SECRET environment variable to a secure random string');
  process.exit(1);
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIRECTORY)) {
  console.log(`📁 Creating data directory: ${DATA_DIRECTORY}`);
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
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

  const isConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_PRIVATE_KEY !== 'YOUR_PRIVATE_KEY_HERE' && VAPID_PRIVATE_KEY.length >= 32);

  if (!isConfigured) {
    console.warn('⚠️  VAPID keys are not configured!');
    console.warn('   Push notifications will not work.');
    console.warn('   To fix this:');
    console.warn('   1. Run: npm run generate-vapid');
    console.warn('   2. Restart the server');
    return false;
  }

  console.log('✅ VAPID keys are configured correctly');
  return true;
};

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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT,
    dataDirectory: DATA_DIRECTORY
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
app.use('/api/', statsRoutes);
app.use('/api/', userStatsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/', nutritionPlanRoutes);
app.use('/api/', trainingPlanRoutes);
app.use('/api/', trainingScheduleRoutes);
app.use('/api/admin', userManagementRoutes);
app.use('/api/admin', userGoalsRoutes);

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
  checkLoginBlock,    // MUST run first - check-only mode, never creates keys
  loginLimit,         // Creates block keys on limit
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

// Password reset endpoint (future implementation)
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

// User Goals Route - Current user can get their own goals
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
      // Create default goals if none exist
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
    await SystemLogger.logCriticalError('User goals fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener metas del usuario');
  }
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
        .set({
          plan_type: plan.name,
          features_json: plan.features_json,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', parseInt(id))
        .returning(['id', 'email', 'full_name', 'role', 'plan_type', 'features_json', 'created_at'])
        .executeTakeFirst();

      if (!updatedUser) {
        sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Usuario no encontrado');
        return;
      }

      console.log('Plan assigned successfully:', plan.name, 'to user:', updatedUser.email);
      await SystemLogger.log('info', 'Plan assigned', {
        userId: updatedUser.id,
        metadata: { plan_name: plan.name, assigned_by: requestingUserId }
      });

      res.json(formatUserResponse(updatedUser));
    } catch (error) {
      console.error('Error assigning plan:', error);
      await SystemLogger.logCriticalError('Plan assignment error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al asignar plan');
    }
  });

// Toggle user status (admin only)
app.put('/api/users/:id/toggle-status',
  authenticateToken,
  requireAdmin,
  validateRequest(toggleUserStatusSchema),
  async (req: any, res: express.Response) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      console.log('Admin toggling user status:', id, 'to:', is_active);

      // Update user status
      const updatedUser = await db
        .updateTable('users')
        .set({
          is_active: is_active ? 1 : 0,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', parseInt(id))
        .returning(['id', 'email', 'full_name', 'is_active'])
        .executeTakeFirst();

      if (!updatedUser) {
        sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Usuario no encontrado');
        return;
      }

      console.log('User status updated successfully:', updatedUser.email, 'Active:', updatedUser.is_active);
      await SystemLogger.log('info', 'User status toggled', {
        userId: req.user.id,
        metadata: { target_user: updatedUser.email, new_status: is_active }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error toggling user status:', error);
      await SystemLogger.logCriticalError('User status toggle error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al cambiar estado del usuario');
    }
  });

// Daily Habits Routes with validation
app.get('/api/daily-habits/today', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    console.log('Fetching daily habits for user:', userId, 'date:', today);

    const todayHabits = await db
      .selectFrom('daily_habits')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', today)
      .executeTakeFirst();

    if (todayHabits) {
      res.json(todayHabits);
    } else {
      // Return default values if no record exists
      res.json({
        training_completed: 0,
        nutrition_completed: 0,
        movement_completed: 0,
        meditation_completed: 0,
        daily_points: 0,
        steps: 0
      });
    }
  } catch (error) {
    console.error('Error fetching daily habits:', error);
    await SystemLogger.logCriticalError('Daily habits fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener hábitos diarios');
  }
});

app.get('/api/daily-habits/weekly-points', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekStartStr = weekStart.toISOString().split('T')[0];

    console.log('Fetching weekly points for user:', userId, 'from:', weekStartStr);

    const weeklyData = await db
      .selectFrom('daily_habits')
      .select((eb) => [eb.fn.sum('daily_points').as('total_points')])
      .where('user_id', '=', userId)
      .where('date', '>=', weekStartStr)
      .executeTakeFirst();

    res.json({ total_points: weeklyData?.total_points || 0 });
  } catch (error) {
    console.error('Error fetching weekly points:', error);
    await SystemLogger.logCriticalError('Weekly points fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener puntos semanales');
  }
});

app.get('/api/daily-habits/calendar', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString().split('T')[0];

    console.log('Fetching calendar data for user:', userId, 'from:', startDate);

    const calendarData = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points'])
      .where('user_id', '=', userId)
      .where('date', '>=', startDate)
      .execute();

    res.json(calendarData);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    await SystemLogger.logCriticalError('Calendar data fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener datos del calendario');
  }
});

app.put('/api/daily-habits/update',
  authenticateToken,
  validateRequest(dailyHabitsUpdateSchema),
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user.id;
      const { date, training_completed, nutrition_completed, movement_completed, meditation_completed, steps } = req.body;

      console.log('Updating daily habits for user:', userId, 'date:', date, 'data:', req.body);

      // Get current record or create default
      let currentRecord = await db
        .selectFrom('daily_habits')
        .selectAll()
        .where('user_id', '=', userId)
        .where('date', '=', date)
        .executeTakeFirst();

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (training_completed !== undefined) {
        updateData.training_completed = training_completed ? 1 : 0;
      }
      if (nutrition_completed !== undefined) {
        updateData.nutrition_completed = nutrition_completed ? 1 : 0;
      }
      if (movement_completed !== undefined) {
        updateData.movement_completed = movement_completed ? 1 : 0;
      }
      if (meditation_completed !== undefined) {
        updateData.meditation_completed = meditation_completed ? 1 : 0;
      }
      if (steps !== undefined) {
        updateData.steps = steps;
      }

      // Merge with current record for point calculation
      const mergedData = {
        training_completed: updateData.training_completed ?? currentRecord?.training_completed ?? 0,
        nutrition_completed: updateData.nutrition_completed ?? currentRecord?.nutrition_completed ?? 0,
        movement_completed: updateData.movement_completed ?? currentRecord?.movement_completed ?? 0,
        meditation_completed: updateData.meditation_completed ?? currentRecord?.meditation_completed ?? 0
      };

      // Calculate daily points
      const dailyPoints = Object.values(mergedData).reduce((sum, completed) => sum + (completed ? 1 : 0), 0);
      updateData.daily_points = dailyPoints;

      let result;
      if (currentRecord) {
        // Update existing record
        result = await db
          .updateTable('daily_habits')
          .set(updateData)
          .where('user_id', '=', userId)
          .where('date', '=', date)
          .returning(['daily_points'])
          .executeTakeFirst();
      } else {
        // Create new record
        result = await db
          .insertInto('daily_habits')
          .values({
            user_id: userId,
            date,
            training_completed: updateData.training_completed ?? 0,
            nutrition_completed: updateData.nutrition_completed ?? 0,
            movement_completed: updateData.movement_completed ?? 0,
            meditation_completed: updateData.meditation_completed ?? 0,
            steps: updateData.steps ?? 0,
            daily_points: dailyPoints,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .returning(['daily_points'])
          .executeTakeFirst();
      }

      console.log('Daily habits updated, points:', dailyPoints);
      res.json({ daily_points: dailyPoints });
    } catch (error) {
      console.error('Error updating daily habits:', error);

      // Check for unique constraint violation
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        sendErrorResponse(res, ERROR_CODES.DUPLICATE_ERROR, 'Ya existe un registro para esta fecha');
        return;
      }

      await SystemLogger.logCriticalError('Daily habits update error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar hábitos diarios');
    }
  });

// Daily Notes Routes with validation and sanitization
app.get('/api/daily-notes/today', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    console.log('Fetching daily note for user:', userId, 'date:', today);

    const note = await db
      .selectFrom('user_notes')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', today)
      .executeTakeFirst();

    if (note) {
      res.json(note);
    } else {
      res.json({ content: '' });
    }
  } catch (error) {
    console.error('Error fetching daily note:', error);
    await SystemLogger.logCriticalError('Daily note fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener nota diaria');
  }
});

app.post('/api/daily-notes',
  authenticateToken,
  validateRequest(dailyNoteSchema),
  async (req: any, res: express.Response) => {
    try {
      const { content, date } = req.body;
      const userId = req.user.id;

      // Sanitize content to prevent XSS
      const sanitizedContent = sanitizeContent(content);

      console.log('Saving note for user:', userId, 'date:', date);

      // Check if note already exists for this date
      const existingNote = await db
        .selectFrom('user_notes')
        .select(['id'])
        .where('user_id', '=', userId)
        .where('date', '=', date)
        .executeTakeFirst();

      if (existingNote) {
        // Update existing note
        const updatedNote = await db
          .updateTable('user_notes')
          .set({ content: sanitizedContent })
          .where('user_id', '=', userId)
          .where('date', '=', date)
          .returning(['id', 'content', 'date'])
          .executeTakeFirst();

        res.json(updatedNote);
      } else {
        // Create new note
        const note = await db
          .insertInto('user_notes')
          .values({
            user_id: userId,
            content: sanitizedContent,
            date: date || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
          })
          .returning(['id', 'content', 'date'])
          .executeTakeFirst();

        res.status(201).json(note);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      await SystemLogger.logCriticalError('Daily note save error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar nota');
    }
  });

// Meditation Sessions Routes with validation
app.get('/api/meditation-sessions', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    console.log('Fetching meditation sessions for user:', userId);

    const sessions = await db
      .selectFrom('meditation_sessions')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('completed_at', 'desc')
      .limit(50)
      .execute();

    console.log('Meditation sessions fetched:', sessions.length);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching meditation sessions:', error);
    await SystemLogger.logCriticalError('Meditation sessions fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener sesiones de meditación');
  }
});

app.post('/api/meditation-sessions',
  authenticateToken,
  validateRequest(meditationSessionSchema),
  async (req: any, res: express.Response) => {
    try {
      const { duration_minutes, meditation_type, comment, breathing_cycle_json } = req.body;
      const userId = req.user.id;

      // Sanitize comment
      const sanitizedComment = comment ? sanitizeContent(comment) : null;

      console.log('Saving meditation session for user:', userId);

      const session = await db
        .insertInto('meditation_sessions')
        .values({
          user_id: userId,
          duration_minutes: duration_minutes || 0,
          meditation_type: meditation_type || 'free',
          comment: sanitizedComment,
          breathing_cycle_json: breathing_cycle_json || null,
          completed_at: new Date().toISOString()
        })
        .returning(['id', 'duration_minutes', 'meditation_type'])
        .executeTakeFirst();

      res.status(201).json(session);
    } catch (error) {
      console.error('Error saving meditation session:', error);
      await SystemLogger.logCriticalError('Meditation session save error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar sesión de meditación');
    }
  });

// Content Library Routes (using existing content_library table)
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

// Admin content management (using existing content_library table)
app.post('/api/content-library',
  authenticateToken,
  requireAdmin,
  validateRequest(contentLibrarySchema),
  async (req: any, res: express.Response) => {
    try {
      const { title, description, video_url, category, subcategory, is_active } = req.body;
      console.log('Admin creating content:', title, 'category:', category);

      const content = await db
        .insertInto('content_library')
        .values({
          title,
          description: description || null,
          video_url: video_url || null,
          category,
          subcategory: subcategory || null,
          is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
          created_at: new Date().toISOString()
        })
        .returning(['id', 'title', 'category'])
        .executeTakeFirst();

      await SystemLogger.log('info', 'Content created', {
        userId: req.user.id,
        metadata: { content_id: content?.id, title, category }
      });

      res.status(201).json(content);
    } catch (error) {
      console.error('Error creating content:', error);
      await SystemLogger.logCriticalError('Content creation error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al crear contenido');
    }
  });

app.put('/api/content-library/:id',
  authenticateToken,
  requireAdmin,
  validateRequest(contentLibrarySchema),
  async (req: any, res: express.Response) => {
    try {
      const { id } = req.params;
      const { title, description, video_url, category, subcategory, is_active } = req.body;
      console.log('Admin updating content:', id);

      const content = await db
        .updateTable('content_library')
        .set({
          title,
          description: description || null,
          video_url: video_url || null,
          category,
          subcategory: subcategory || null,
          is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1
        })
        .where('id', '=', parseInt(id))
        .returning(['id', 'title', 'category'])
        .executeTakeFirst();

      if (!content) {
        sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Contenido no encontrado');
        return;
      }

      await SystemLogger.log('info', 'Content updated', {
        userId: req.user.id,
        metadata: { content_id: content.id, title }
      });

      res.json(content);
    } catch (error) {
      console.error('Error updating content:', error);
      await SystemLogger.logCriticalError('Content update error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar contenido');
    }
  });

app.delete('/api/content-library/:id', 
  authenticateToken, 
  requireAdmin, 
  async (req: any, res: express.Response) => {
    try {
      const { id } = req.params;
      console.log('Admin deleting content:', id);

      await db
        .deleteFrom('content_library')
        .where('id', '=', parseInt(id))
        .execute();

      await SystemLogger.log('info', 'Content deleted', {
        userId: req.user.id,
        metadata: { content_id: parseInt(id) }
      });

      res.json({ message: 'Contenido eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting content:', error);
      await SystemLogger.logCriticalError('Content deletion error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al eliminar contenido');
    }
  });

// Workout of Day Routes
app.get('/api/workout-of-day', authenticateToken, async (req: any, res: express.Response) => {
  try {
    console.log('Fetching workout of day for user:', req.user.email);
    const workout = await db
      .selectFrom('workout_of_day')
      .selectAll()
      .where('is_active', '=', 1)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    console.log('Workout of day fetched:', workout?.title || 'None');
    res.json(workout);
  } catch (error) {
    console.error('Error fetching workout of day:', error);
    await SystemLogger.logCriticalError('Workout of day fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener entrenamiento del día');
  }
});

// User Files Routes
app.get('/api/user-files', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    const { file_type } = req.query;

    console.log('Fetching user files for:', userId, 'type:', file_type || 'all');

    let query = db
      .selectFrom('user_files')
      .selectAll()
      .where('user_id', '=', userId);

    if (file_type) {
      query = query.where('file_type', '=', file_type as string);
    }

    const files = await query
      .orderBy('created_at', 'desc')
      .execute();

    console.log('User files fetched:', files.length);
    res.json(files);
  } catch (error) {
    console.error('Error fetching user files:', error);
    await SystemLogger.logCriticalError('User files fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener archivos del usuario');
  }
});

// Admin user files route
app.get('/api/admin/user-files', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    console.log('Admin fetching all user files');
    
    const files = await db
      .selectFrom('user_files')
      .innerJoin('users', 'user_files.user_id', 'users.id')
      .select([
        'user_files.id',
        'user_files.user_id',
        'user_files.filename',
        'user_files.file_type',
        'user_files.file_path',
        'user_files.created_at',
        'users.email as user_email',
        'users.full_name as user_name'
      ])
      .orderBy('user_files.created_at', 'desc')
      .execute();

    console.log('Admin user files fetched:', files.length);
    res.json(files);
  } catch (error) {
    console.error('Error fetching admin user files:', error);
    await SystemLogger.logCriticalError('Admin user files fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener archivos de usuarios');
  }
});

// File upload route
app.post('/api/upload-user-file',
  authenticateToken,
  requireAdmin,
  upload.single('file'),
  async (req: any, res: express.Response) => {
    try {
      const { user_id, file_type } = req.body;
      const file = req.file;

      console.log('Uploading file for user:', user_id, 'type:', file_type);

      if (!file) {
        sendErrorResponse(res, ERROR_CODES.FILE_UPLOAD_ERROR, 'No se proporcionó archivo');
        return;
      }

      if (!user_id || !file_type) {
        sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'user_id y file_type son requeridos');
        return;
      }

      // Validate file type
      if (!['training', 'nutrition'].includes(file_type)) {
        sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'file_type debe ser training o nutrition');
        return;
      }

      // Check if user exists
      const user = await db
        .selectFrom('users')
        .select(['id', 'email'])
        .where('id', '=', parseInt(user_id))
        .executeTakeFirst();

      if (!user) {
        // Delete uploaded file if user doesn't exist
        fs.unlinkSync(file.path);
        sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Usuario no encontrado');
        return;
      }

      // Save file info to database
      const savedFile = await db
        .insertInto('user_files')
        .values({
          user_id: parseInt(user_id),
          filename: file.filename,
          file_type: file_type,
          file_path: file.path,
          uploaded_by: req.user.id,
          created_at: new Date().toISOString()
        })
        .returning(['id', 'filename', 'file_type'])
        .executeTakeFirst();

      console.log('File uploaded successfully:', savedFile?.filename);
      await SystemLogger.log('info', 'File uploaded', {
        userId: req.user.id,
        metadata: { 
          file_id: savedFile?.id, 
          target_user_id: parseInt(user_id),
          file_type: file_type,
          filename: file.filename 
        }
      });

      res.status(201).json(savedFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      await SystemLogger.logCriticalError('File upload error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al subir archivo');
    }
  });

// File serving route
app.get('/api/files/:id', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('Serving file:', id, 'to user:', userId);

    let query = db
      .selectFrom('user_files')
      .selectAll()
      .where('id', '=', parseInt(id));

    // Non-admin users can only access their own files
    if (userRole !== 'admin') {
      query = query.where('user_id', '=', userId);
    }

    const file = await query.executeTakeFirst();

    if (!file) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Archivo no encontrado');
      return;
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      console.error('File not found on disk:', file.file_path);
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Archivo no encontrado en el sistema');
      return;
    }

    // Set appropriate headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(file.file_path);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al cargar archivo');
      }
    });
  } catch (error) {
    console.error('Error serving file:', error);
    await SystemLogger.logCriticalError('File serving error', error as Error, { userId: req.user?.id });
    if (!res.headersSent) {
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al cargar archivo');
    }
  }
});

// Delete file route
app.delete('/api/user-files/:id', 
  authenticateToken, 
  requireAdmin, 
  async (req: any, res: express.Response) => {
    try {
      const { id } = req.params;
      console.log('Admin deleting user file:', id);

      // Get file info first
      const file = await db
        .selectFrom('user_files')
        .selectAll()
        .where('id', '=', parseInt(id))
        .executeTakeFirst();

      if (!file) {
        sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Archivo no encontrado');
        return;
      }

      // Delete from database
      await db
        .deleteFrom('user_files')
        .where('id', '=', parseInt(id))
        .execute();

      // Delete from filesystem
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }

      await SystemLogger.log('info', 'File deleted', {
        userId: req.user.id,
        metadata: { file_id: parseInt(id), filename: file.filename }
      });

      res.json({ message: 'Archivo eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting file:', error);
      await SystemLogger.logCriticalError('File deletion error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al eliminar archivo');
    }
  });

// Plans Routes
app.get('/api/plans', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Fetching all plans');
    const plans = await db.selectFrom('plans').selectAll().execute();
    console.log('Plans fetched:', plans.length);
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    await SystemLogger.logCriticalError('Plans fetch error', error as Error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener planes');
  }
});

// Admin Users Route
app.get('/api/users', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    console.log('Admin fetching all users');
    
    const users = await db
      .selectFrom('users')
      .select([
        'id', 'email', 'full_name', 'role', 'plan_type', 
        'is_active', 'features_json', 'created_at'
      ])
      .orderBy('created_at', 'desc')
      .execute();

    // Format users with parsed features
    const formattedUsers = users.map(formatUserResponse);
    
    console.log('Users fetched by admin:', formattedUsers.length);
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    await SystemLogger.logCriticalError('Admin users fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener usuarios');
  }
});

// Server initialization and static serving
export const startServer = async (port = PORT) => {
  try {
    // Check database connection
    await db.selectFrom('users').select('id').limit(1).execute();
    console.log('✅ Database connection established');

    // Check VAPID configuration
    const vapidConfigured = checkVapidConfiguration();

    // Initialize schedulers AFTER database is ready
    console.log('🔄 Initializing daily reset scheduler...');
    resetScheduler = new DailyResetScheduler(db);
    await resetScheduler.initialize();

    console.log('🔔 Initializing notification scheduler...');
    notificationScheduler = new NotificationScheduler();

    // Setup static serving for production
    if (NODE_ENV === 'production') {
      setupStaticServing(app);
      console.log('📁 Static file serving configured for production');
    }

    // Start server
    const server = app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📊 Environment: ${NODE_ENV}`);
      console.log(`📂 Data directory: ${DATA_DIRECTORY}`);
      
      if (NODE_ENV !== 'production') {
        console.log(`🌐 Frontend dev server: http://localhost:3000`);
        console.log(`🔌 API server: http://localhost:${port}`);
      }
      
      // Log CORS configuration
      logCorsConfig();
      
      // Show VAPID status
      if (vapidConfigured) {
        console.log('📱 Push notifications: Ready');
      } else {
        console.log('📱 Push notifications: Disabled (run: npm run generate-vapid)');
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        server.close(async () => {
          console.log('🔌 HTTP server closed');
          
          // Stop schedulers
          if (resetScheduler) {
            resetScheduler.stop();
            console.log('⏹️  Daily reset scheduler stopped');
          }
          
          // Close database connection
          try {
            await db.destroy();
            console.log('🗄️  Database connection closed');
          } catch (dbError) {
            console.error('Error closing database:', dbError);
          }
          
          console.log('✅ Graceful shutdown complete');
          process.exit(0);
        });
        
        // Force close after 30 seconds
        setTimeout(() => {
          console.error('❌ Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 30000);
        
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await SystemLogger.logCriticalError('Server startup failed', error as Error);
    process.exit(1);
  }
};

// Start server if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
