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

// Initialize daily reset scheduler
let resetScheduler: DailyResetScheduler;

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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiting to all API routes
app.use('/api/', globalApiLimit);
app.use('/api/', burstLimit);

// Health check endpoint (exempted from rate limiting)
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
      await SystemLogger.log('info', 'Plan assigned', {
        userId: updatedUser.id,
        req,
        metadata: { plan_name: plan.name, assigned_by: requestingUserId }
      });

      res.json(formatUserResponse(updatedUser));
    } catch (error) {
      console.error('Error assigning plan:', error);
      await SystemLogger.logCriticalError('Plan assignment error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al asignar plan');
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
    await SystemLogger.logCriticalError('Daily habits fetch error', error as Error, { userId: req.user?.id, req });
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
    await SystemLogger.logCriticalError('Weekly points fetch error', error as Error, { userId: req.user?.id, req });
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
    await SystemLogger.logCriticalError('Calendar data fetch error', error as Error, { userId: req.user?.id, req });
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
      
      await SystemLogger.logCriticalError('Daily habits update error', error as Error, { userId: req.user?.id, req });
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
    await SystemLogger.logCriticalError('Daily note fetch error', error as Error, { userId: req.user?.id, req });
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
      await SystemLogger.logCriticalError('Daily note save error', error as Error, { userId: req.user?.id, req });
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
    await SystemLogger.logCriticalError('Meditation sessions fetch error', error as Error, { userId: req.user?.id, req });
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
      await SystemLogger.logCriticalError('Meditation session save error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar sesión de meditación');
    }
  });

// Content Library Routes
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
    await SystemLogger.logCriticalError('Content library fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener biblioteca de contenido');
  }
});

// Admin content management
app.post('/api/content-library', 
  authenticateToken, 
  requireAdmin, 
  validateRequest(contentLibrarySchema),
  async (req: any, res: express.Response) => {
    try {
      const { title, description, video_url, category, subcategory } = req.body;
      console.log('Admin creating content:', title, 'category:', category);
      
      const content = await db
        .insertInto('content_library')
        .values({
          title,
          description: description || null,
          video_url: video_url || null,
          category,
          subcategory: subcategory || null,
          is_active: 1,
          created_at: new Date().toISOString()
        })
        .returning(['id', 'title', 'category'])
        .executeTakeFirst();
      
      await SystemLogger.log('info', 'Content created', {
        userId: req.user.id,
        req,
        metadata: { content_id: content?.id, title, category }
      });
      
      res.status(201).json(content);
    } catch (error) {
      console.error('Error creating content:', error);
      await SystemLogger.logCriticalError('Content creation error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al crear contenido');
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
    await SystemLogger.logCriticalError('Workout of day fetch error', error as Error, { userId: req.user?.id, req });
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
    await SystemLogger.logCriticalError('User files fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener archivos del usuario');
  }
});

// Plans Routes
app.get('/api/plans', authenticateToken, async (req: any, res: express.Response) => {
  try {
    console.log('Fetching all plans for user:', req.user.email);
    const plans = await db.selectFrom('plans').selectAll().execute();
    console.log('Plans fetched:', plans.length);
    
    const formattedPlans = plans.map(plan => ({
      ...plan,
      services_included: JSON.parse(plan.services_included),
      features: getUserFeatures(plan.features_json)
    }));
    
    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    await SystemLogger.logCriticalError('Plans fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener planes');
  }
});

// Users Routes (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    console.log('Admin fetching all users - requested by:', req.user.email);
    const users = await db
      .selectFrom('users')
      .select(['id', 'email', 'full_name', 'role', 'plan_type', 'is_active', 'features_json', 'created_at'])
      .execute();
    console.log('Users fetched:', users.length);
    
    const formattedUsers = users.map(user => ({
      ...user,
      features: getUserFeatures(user.features_json)
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    await SystemLogger.logCriticalError('Users fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener usuarios');
  }
});

// Test endpoint to verify admin user setup
app.get('/api/test/admin-user', async (req: express.Request, res: express.Response) => {
  try {
    const adminUser = await db
      .selectFrom('users')
      .select(['id', 'email', 'full_name', 'role', 'is_active', 'password_hash', 'plan_type', 'features_json'])
      .where('email', '=', 'franciscodanielechs@gmail.com')
      .executeTakeFirst();
    
    if (adminUser) {
      console.log('Admin user found:', { ...adminUser, password_hash: adminUser.password_hash ? '[HIDDEN]' : 'NULL' });
      res.json({ 
        message: 'Admin user exists',
        user: {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.full_name,
          role: adminUser.role,
          is_active: adminUser.is_active,
          plan_type: adminUser.plan_type,
          features: getUserFeatures(adminUser.features_json)
        },
        password_hash_exists: adminUser.password_hash ? 'Yes' : 'No'
      });
    } else {
      console.log('Admin user not found');
      res.status(404).json({ message: 'Admin user not found' });
    }
  } catch (error) {
    console.error('Error checking admin user:', error);
    await SystemLogger.logCriticalError('Admin user check error', error as Error, { req });
    res.status(500).json({ error: 'Error checking admin user' });
  }
});

// Daily Reset API Routes for Admin
app.get('/api/admin/reset-history', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const history = await resetScheduler.getResetHistory(50);
    res.json(history);
  } catch (error) {
    console.error('Error fetching reset history:', error);
    await SystemLogger.logCriticalError('Reset history fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener historial de reset');
  }
});

app.post('/api/admin/force-reset', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { date } = req.body;
    console.log('Admin forcing reset for date:', date || 'today');
    
    await resetScheduler.forceReset(date);
    res.json({ message: 'Reset ejecutado exitosamente' });
  } catch (error) {
    console.error('Error forcing reset:', error);
    await SystemLogger.logCriticalError('Force reset error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al ejecutar reset forzado');
  }
});

// Export a function to start the server
export async function startServer(port: number) {
  try {
    // Initialize the daily reset scheduler
    resetScheduler = new DailyResetScheduler();
    
    if (process.env.NODE_ENV === 'production') {
      setupStaticServing(app);
    }
    
    app.listen(port, () => {
      console.log(`API Server running on port ${port}`);
      console.log('Database connection established');
      console.log('Authentication system initialized');
      console.log('Rate limiting system enabled');
      console.log('Role-based access control enabled');
      console.log('Enhanced file upload system enabled');
      console.log('User file management system ready');
      console.log('Content library system enabled');
      console.log('Meditation session tracking enabled');
      console.log('Daily habits tracking enabled');
      console.log('Daily reset scheduler initialized (00:05 AM Argentina time)');
      console.log('System logging enabled with 90-day retention');
      console.log('Admin account: franciscodanielechs@gmail.com with password: admin123');
      console.log('Trust proxy enabled for rate limiting');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting server...');
  startServer(parseInt(process.env.PORT || '3001'));
}
