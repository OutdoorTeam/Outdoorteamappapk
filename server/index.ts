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

// Enable trust proxy to get real client IPs
app.set('trust proxy', 1);

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

// Security headers for all routes (RELAXED)
app.use(securityHeaders);

// Body parsing middleware with larger limits for builds
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply CORS to all routes
app.use(corsMiddleware);
app.use(corsErrorHandler);

// CONDITIONAL rate limiting - disabled for build processes
if (process.env.BUILD_MODE !== 'true' && process.env.INSTANCE_APP_BUILD !== 'true') {
  app.use('/api/', globalApiLimit);
  app.use('/api/', burstLimit);
}

// Health check endpoint (exempted from rate limiting and CORS)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    app: 'outdoor-team',
    build_mode: process.env.BUILD_MODE || 'false',
    instance_app_build: process.env.INSTANCE_APP_BUILD || 'false'
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
      environment: process.env.NODE_ENV || 'development'
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

// Mount routes
app.use('/api', statsRoutes);
app.use('/api', userStatsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', nutritionPlanRoutes);
app.use('/api', trainingPlanRoutes);
app.use('/api', trainingScheduleRoutes);
app.use('/api/admin', userManagementRoutes);
app.use('/api/admin', userGoalsRoutes);
app.use('/api', apiRoutes);

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

// Auth Routes with CONDITIONAL Rate Limiting
const authRateLimit = process.env.BUILD_MODE === 'true' ? 
  (req: express.Request, res: express.Response, next: express.NextFunction) => next() : 
  registerLimit;

const loginRateLimit = process.env.BUILD_MODE === 'true' ? 
  (req: express.Request, res: express.Response, next: express.NextFunction) => next() : 
  loginLimit;

const loginBlockCheck = process.env.BUILD_MODE === 'true' ? 
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
    await SystemLogger.logCriticalError('User goals fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener metas del usuario');
  }
});

app.post('/api/users/:id/assign-plan',
  authenticateToken,
  validateRequest(planAssignmentSchema),
  async (req: any, res: express.Response) => {
    try {
      const { id } = req.params;
      const { planId } = req.body;
      const requestingUserId = req.user.id;
      const requestingUserRole = req.user.role;

      if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
        sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
        return;
      }

      console.log('Assigning plan', planId, 'to user', id);

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

app.put('/api/users/:id/toggle-status',
  authenticateToken,
  requireAdmin,
  validateRequest(toggleUserStatusSchema),
  async (req: any, res: express.Response) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      console.log('Admin toggling user status:', id, 'to:', is_active);

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

// Rest of your existing routes...
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
    weekStart.setDate(today.getDate() - today.getDay());
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

      let currentRecord = await db
        .selectFrom('daily_habits')
        .selectAll()
        .where('user_id', '=', userId)
        .where('date', '=', date)
        .executeTakeFirst();

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

      const mergedData = {
        training_completed: updateData.training_completed ?? currentRecord?.training_completed ?? 0,
        nutrition_completed: updateData.nutrition_completed ?? currentRecord?.nutrition_completed ?? 0,
        movement_completed: updateData.movement_completed ?? currentRecord?.movement_completed ?? 0,
        meditation_completed: updateData.meditation_completed ?? currentRecord?.meditation_completed ?? 0
      };

      const dailyPoints = Object.values(mergedData).reduce((sum, completed) => sum + (completed ? 1 : 0), 0);
      updateData.daily_points = dailyPoints;

      let result;
      if (currentRecord) {
        result = await db
          .updateTable('daily_habits')
          .set(updateData)
          .where('user_id', '=', userId)
          .where('date', '=', date)
          .returning(['daily_points'])
          .executeTakeFirst();
      } else {
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

      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        sendErrorResponse(res, ERROR_CODES.DUPLICATE_ERROR, 'Ya existe un registro para esta fecha');
        return;
      }

      await SystemLogger.logCriticalError('Daily habits update error', error as Error, { userId: req.user?.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar hábitos diarios');
    }
  });

// Rest of existing routes with minimal changes...
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

      const sanitizedContent = sanitizeContent(content);

      console.log('Saving note for user:', userId, 'date:', date);

      const existingNote = await db
        .selectFrom('user_notes')
        .select(['id'])
        .where('user_id', '=', userId)
        .where('date', '=', date)
        .executeTakeFirst();

      if (existingNote) {
        const updatedNote = await db
          .updateTable('user_notes')
          .set({ content: sanitizedContent })
          .where('user_id', '=', userId)
          .where('date', '=', date)
          .returning(['id', 'content', 'date'])
          .executeTakeFirst();

        res.json(updatedNote);
      } else {
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

// Continue with all existing routes but skip rate limiting if needed...
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

// Setup static serving for production
if (process.env.NODE_ENV === 'production') {
  setupStaticServing(app);
  console.log('📁 Static file serving configured for production');
}

// More permissive error handling
app.use((req, res, next) => {
  console.warn(`404 - Route not found: ${req.method} ${req.path}`);
  
  if (req.path.startsWith('/api/')) {
    sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'API endpoint not found');
    return;
  }
  
  if (process.env.NODE_ENV === 'production') {
    const indexPath = path.join(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'App not built' });
    }
    return;
  }
  
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error interno del servidor');
});

export const startServer = async (port = 3001) => {
  try {
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
      
      if (process.env.NODE_ENV !== 'production') {
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
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3001', 10);
  startServer(port);
}

export default app;
