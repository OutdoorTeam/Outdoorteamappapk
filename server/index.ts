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
import stepSyncRoutes from './routes/step-sync-routes.js';
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
app.use('/api/step-sync', stepSyncRoutes);

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
      await SystemLogger.log('info', 'Plan assigned to user', {
        userId: parseInt(id),
        req,
        metadata: { planName: plan.name, planId: plan.id }
      });

      res.json(formatUserResponse(updatedUser));
    } catch (error) {
      console.error('Error assigning plan:', error);
      await SystemLogger.logCriticalError('Plan assignment error', error as Error, { req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al asignar plan');
    }
  });

// Daily Habits Management Routes
app.get('/api/daily-habits/today', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Fetching today habits for user:', userId, 'date:', today);

    const todayHabits = await db
      .selectFrom('daily_habits')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', today)
      .executeTakeFirst();

    if (!todayHabits) {
      // Return default values if no record exists
      res.json({
        date: today,
        training_completed: false,
        nutrition_completed: false,
        movement_completed: false,
        meditation_completed: false,
        daily_points: 0,
        steps: 0
      });
      return;
    }

    // Convert to boolean values for frontend
    const response = {
      date: todayHabits.date,
      training_completed: Boolean(todayHabits.training_completed),
      nutrition_completed: Boolean(todayHabits.nutrition_completed),
      movement_completed: Boolean(todayHabits.movement_completed),
      meditation_completed: Boolean(todayHabits.meditation_completed),
      daily_points: todayHabits.daily_points,
      steps: todayHabits.steps
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching today habits:', error);
    await SystemLogger.logCriticalError('Today habits fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener hábitos del día');
  }
});

// Update daily habits
app.put('/api/daily-habits/update', 
  authenticateToken, 
  validateRequest(dailyHabitsUpdateSchema),
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user.id;
      const { date, training_completed, nutrition_completed, movement_completed, meditation_completed, steps } = req.body;
      
      console.log('Updating habits for user:', userId, 'date:', date, req.body);

      // Get current data to calculate new daily_points
      const currentData = await db
        .selectFrom('daily_habits')
        .selectAll()
        .where('user_id', '=', userId)
        .where('date', '=', date)
        .executeTakeFirst();

      // Build update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Use current values if not provided in request
      const finalData = {
        training_completed: training_completed !== undefined ? training_completed : Boolean(currentData?.training_completed),
        nutrition_completed: nutrition_completed !== undefined ? nutrition_completed : Boolean(currentData?.nutrition_completed),
        movement_completed: movement_completed !== undefined ? movement_completed : Boolean(currentData?.movement_completed),
        meditation_completed: meditation_completed !== undefined ? meditation_completed : Boolean(currentData?.meditation_completed),
        steps: steps !== undefined ? steps : (currentData?.steps || 0)
      };

      // Update only provided fields
      if (training_completed !== undefined) updateData.training_completed = training_completed ? 1 : 0;
      if (nutrition_completed !== undefined) updateData.nutrition_completed = nutrition_completed ? 1 : 0;
      if (movement_completed !== undefined) updateData.movement_completed = movement_completed ? 1 : 0;
      if (meditation_completed !== undefined) updateData.meditation_completed = meditation_completed ? 1 : 0;
      if (steps !== undefined) updateData.steps = steps;

      // Calculate daily points
      const dailyPoints = Object.values(finalData)
        .filter((val, idx) => idx < 4) // Only count the first 4 boolean values
        .reduce((sum: number, completed: any) => sum + (completed ? 1 : 0), 0);
      
      updateData.daily_points = dailyPoints;

      // Upsert the record
      const result = await db
        .insertInto('daily_habits')
        .values({
          user_id: userId,
          date,
          training_completed: finalData.training_completed ? 1 : 0,
          nutrition_completed: finalData.nutrition_completed ? 1 : 0,
          movement_completed: finalData.movement_completed ? 1 : 0,
          meditation_completed: finalData.meditation_completed ? 1 : 0,
          steps: finalData.steps,
          daily_points: dailyPoints,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .onConflict((oc) => oc.columns(['user_id', 'date']).doUpdateSet(updateData))
        .returning(['daily_points', 'steps'])
        .executeTakeFirst();

      // Check and update achievements
      await AchievementService.checkAndUpdateAchievements(userId);

      console.log('Habits updated successfully for user:', userId);
      res.json({ 
        daily_points: result?.daily_points || dailyPoints,
        steps: result?.steps || finalData.steps,
        ...finalData
      });
    } catch (error) {
      console.error('Error updating habits:', error);
      await SystemLogger.logCriticalError('Habits update error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar hábitos');
    }
  });

// Weekly points
app.get('/api/daily-habits/weekly-points', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    
    // Get current week's data (Monday to Sunday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? -6 : -(currentDay - 1); // Calculate days back to Monday
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyData = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points', 'steps'])
      .where('user_id', '=', userId)
      .where('date', '>=', startOfWeek.toISOString().split('T')[0])
      .where('date', '<=', endOfWeek.toISOString().split('T')[0])
      .orderBy('date', 'asc')
      .execute();

    const totalPoints = weeklyData.reduce((sum, day) => sum + day.daily_points, 0);
    const totalSteps = weeklyData.reduce((sum, day) => sum + day.steps, 0);

    res.json({
      total_points: totalPoints,
      total_steps: totalSteps,
      daily_data: weeklyData,
      week_start: startOfWeek.toISOString().split('T')[0],
      week_end: endOfWeek.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error fetching weekly points:', error);
    await SystemLogger.logCriticalError('Weekly points fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener puntos semanales');
  }
});

// Calendar data
app.get('/api/daily-habits/calendar', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    
    // Get last 60 days of data for calendar
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 60);

    const calendarData = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points'])
      .where('user_id', '=', userId)
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .where('date', '<=', endDate.toISOString().split('T')[0])
      .orderBy('date', 'asc')
      .execute();

    res.json(calendarData);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    await SystemLogger.logCriticalError('Calendar data fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener datos del calendario');
  }
});

// Daily Notes Routes
app.get('/api/daily-notes/today', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Fetching today note for user:', userId);

    const note = await db
      .selectFrom('user_notes')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', today)
      .executeTakeFirst();

    if (!note) {
      res.json({ content: '', date: today });
      return;
    }

    res.json({ 
      content: note.content, 
      date: note.date 
    });
  } catch (error) {
    console.error('Error fetching today note:', error);
    await SystemLogger.logCriticalError('Today note fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener nota del día');
  }
});

app.post('/api/daily-notes/save', 
  authenticateToken, 
  validateRequest(dailyNoteSchema),
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user.id;
      const { content, date } = req.body;
      
      console.log('Saving note for user:', userId, 'date:', date);

      const sanitizedContent = sanitizeContent(content);

      // Upsert the note
      await db
        .insertInto('user_notes')
        .values({
          user_id: userId,
          content: sanitizedContent,
          date,
          created_at: new Date().toISOString()
        })
        .onConflict((oc) => oc
          .columns(['user_id', 'date'])
          .doUpdateSet({
            content: sanitizedContent,
          })
        )
        .execute();

      console.log('Note saved successfully');
      res.json({ success: true, content: sanitizedContent, date });
    } catch (error) {
      console.error('Error saving note:', error);
      await SystemLogger.logCriticalError('Note save error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar nota');
    }
  });

// Meditation Routes  
app.post('/api/meditation/session', 
  authenticateToken, 
  validateRequest(meditationSessionSchema),
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user.id;
      const { duration_minutes, meditation_type, comment, breathing_cycle_json } = req.body;
      
      console.log('Saving meditation session for user:', userId);

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
        .returning(['id', 'duration_minutes', 'meditation_type'])
        .executeTakeFirst();

      // Check and update achievements
      await AchievementService.checkAndUpdateAchievements(userId);

      console.log('Meditation session saved:', session?.id);
      await SystemLogger.log('info', 'Meditation session completed', {
        userId,
        req,
        metadata: { duration: duration_minutes, type: meditation_type }
      });

      res.json(session);
    } catch (error) {
      console.error('Error saving meditation session:', error);
      await SystemLogger.logCriticalError('Meditation session save error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar sesión de meditación');
    }
  });

// Get Plans
app.get('/api/plans', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Fetching active plans');
    
    const plans = await db
      .selectFrom('plans')
      .selectAll()
      .where('is_active', '=', 1)
      .orderBy('price', 'asc')
      .execute();

    const formattedPlans = plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features_json || '{}'),
      services: JSON.parse(plan.services_included || '[]')
    }));

    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    await SystemLogger.logCriticalError('Plans fetch error', error as Error, { req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener planes');
  }
});

// File Upload Route
app.post('/api/files/upload',
  authenticateToken,
  upload.single('file'),
  validateRequest(fileUploadSchema, 'body'),
  async (req: any, res: express.Response) => {
    try {
      const { user_id, file_type, replace_existing } = req.body;
      const uploadedFile = req.file;
      const requestingUserId = req.user.id;
      const requestingUserRole = req.user.role;

      if (!uploadedFile) {
        sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'No se subió ningún archivo');
        return;
      }

      // Users can only upload for themselves unless they're admin
      if (requestingUserRole !== 'admin' && parseInt(user_id) !== requestingUserId) {
        sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
        return;
      }

      console.log('Processing file upload:', uploadedFile.filename, 'for user:', user_id, 'type:', file_type);

      // If replace_existing is true, remove old files of the same type
      if (replace_existing) {
        const oldFiles = await db
          .selectFrom('user_files')
          .select(['id', 'file_path'])
          .where('user_id', '=', parseInt(user_id))
          .where('file_type', '=', file_type)
          .execute();

        // Delete old files from filesystem and database
        for (const oldFile of oldFiles) {
          try {
            const oldFilePath = path.join(DATA_DIRECTORY, oldFile.file_path);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
            await db
              .deleteFrom('user_files')
              .where('id', '=', oldFile.id)
              .execute();
          } catch (fileError) {
            console.warn('Error removing old file:', oldFile.file_path, fileError);
          }
        }
      }

      // Save file record to database
      const relativePath = `uploads/${uploadedFile.filename}`;
      const fileRecord = await db
        .insertInto('user_files')
        .values({
          user_id: parseInt(user_id),
          filename: uploadedFile.originalname,
          file_type,
          file_path: relativePath,
          uploaded_by: requestingUserId,
          created_at: new Date().toISOString()
        })
        .returning(['id', 'filename', 'file_type', 'file_path'])
        .executeTakeFirst();

      console.log('File uploaded successfully:', fileRecord?.filename);
      await SystemLogger.log('info', 'File uploaded', {
        userId: requestingUserId,
        req,
        metadata: { 
          targetUserId: parseInt(user_id),
          filename: uploadedFile.originalname,
          fileType: file_type,
          size: uploadedFile.size
        }
      });

      res.json({
        ...fileRecord,
        url: `/api/files/${fileRecord?.id}`
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }
      }

      await SystemLogger.logCriticalError('File upload error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al subir archivo');
    }
  });

// Serve uploaded files
app.get('/api/files/:id', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    const file = await db
      .selectFrom('user_files')
      .selectAll()
      .where('id', '=', parseInt(id))
      .executeTakeFirst();

    if (!file) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Archivo no encontrado');
      return;
    }

    // Users can only access their own files unless they're admin
    if (requestingUserRole !== 'admin' && file.user_id !== requestingUserId) {
      sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
      return;
    }

    const filePath = path.join(DATA_DIRECTORY, file.file_path);
    
    if (!fs.existsSync(filePath)) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Archivo no encontrado en el sistema');
      return;
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    await SystemLogger.logCriticalError('File serve error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al servir archivo');
  }
});

// Get user files
app.get('/api/users/:id/files', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { file_type } = req.query;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Users can only access their own files unless they're admin
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
      return;
    }

    let query = db
      .selectFrom('user_files')
      .select(['id', 'filename', 'file_type', 'created_at'])
      .where('user_id', '=', parseInt(id));

    if (file_type) {
      query = query.where('file_type', '=', file_type as string);
    }

    const files = await query.execute();
    
    const filesWithUrls = files.map(file => ({
      ...file,
      url: `/api/files/${file.id}`
    }));

    res.json(filesWithUrls);
  } catch (error) {
    console.error('Error fetching user files:', error);
    await SystemLogger.logCriticalError('User files fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener archivos del usuario');
  }
});

// Initialize schedulers
try {
  resetScheduler = new DailyResetScheduler();
  notificationScheduler = new NotificationScheduler();
  
  console.log('Schedulers initialized successfully');
} catch (error) {
  console.error('Failed to initialize schedulers:', error);
}

// Setup static serving for production
setupStaticServing(app);

// Export start function for dev script
export async function startServer(port: number = 3001) {
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Data directory: ${DATA_DIRECTORY}`);
      resolve();
    });

    server.on('error', reject);
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3001');
  startServer(port).catch(console.error);
}
