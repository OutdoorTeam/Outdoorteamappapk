import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { setupStaticServing } from './static-serve.js';
import { db } from './database.js';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATA_DIRECTORY = process.env.DATA_DIRECTORY || './data';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(DATA_DIRECTORY, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
const authenticateToken = async (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token de acceso requerido' });
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
      res.status(403).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Cuenta desactivada' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Token inválido' });
    return;
  }
};

// Admin middleware
const requireAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
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

// Auth Routes
app.post('/api/auth/register', async (req: express.Request, res: express.Response) => {
  try {
    const { full_name, email, password } = req.body;
    
    // Validate input
    if (!full_name || !email || !password) {
      res.status(400).json({ error: 'Todos los campos son requeridos' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    console.log('Registration attempt for:', email);

    // Check if user already exists
    const existingUser = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst();

    if (existingUser) {
      console.log('User already exists:', email);
      res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico' });
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
        plan_type: role === 'admin' ? 'Programa Totum' : null, // Admin gets full access, users start with no plan
        is_active: 1,
        features_json: role === 'admin' ? '{"habits": true, "training": true, "nutrition": true, "meditation": true, "active_breaks": true}' : defaultFeatures,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id', 'email', 'full_name', 'role', 'plan_type', 'features_json', 'created_at'])
      .executeTakeFirst();

    if (!newUser) {
      res.status(500).json({ error: 'Error al crear el usuario' });
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
    res.status(201).json({ 
      user: formatUserResponse(newUser),
      token 
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
});

app.post('/api/auth/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son requeridos' });
      return;
    }

    console.log('Login attempt for:', email);

    // Find user
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email.toLowerCase().trim())
      .executeTakeFirst();

    if (!user) {
      console.log('User not found:', email);
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    if (!user.is_active) {
      console.log('User account is inactive:', email);
      res.status(401).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
      return;
    }

    // Check password
    if (!user.password_hash) {
      console.log('User has no password set:', email);
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    console.log('Checking password for user:', email);
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password validation result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      res.status(401).json({ error: 'Credenciales inválidas' });
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
    res.json({ 
      user: formatUserResponse(user), 
      token 
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: any, res: express.Response) => {
  res.json(formatUserResponse(req.user));
});

// Plan Selection and Assignment
app.post('/api/users/:id/assign-plan', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { planId } = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Users can only assign plans to themselves unless they're admin
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      res.status(403).json({ error: 'Acceso denegado' });
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
      res.status(404).json({ error: 'Plan no encontrado' });
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
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    console.log('Plan assigned successfully:', plan.name, 'to user:', updatedUser.email);
    res.json(formatUserResponse(updatedUser));
  } catch (error) {
    console.error('Error assigning plan:', error);
    res.status(500).json({ error: 'Error al asignar plan' });
  }
});

// Daily Habits Routes
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
    res.status(500).json({ error: 'Error al obtener hábitos diarios' });
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
    res.status(500).json({ error: 'Error al obtener puntos semanales' });
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
    res.status(500).json({ error: 'Error al obtener datos del calendario' });
  }
});

app.put('/api/daily-habits/update', authenticateToken, async (req: any, res: express.Response) => {
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
    res.status(500).json({ error: 'Error al actualizar hábitos diarios' });
  }
});

// Daily Notes Routes
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
    res.status(500).json({ error: 'Error al obtener nota diaria' });
  }
});

app.post('/api/daily-notes', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { content, date } = req.body;
    const userId = req.user.id;
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
        .set({ content })
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
          content,
          date: date || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        })
        .returning(['id', 'content', 'date'])
        .executeTakeFirst();
      
      res.status(201).json(note);
    }
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({ error: 'Error al guardar nota' });
  }
});

// Meditation Sessions Routes
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
    res.status(500).json({ error: 'Error al obtener sesiones de meditación' });
  }
});

app.post('/api/meditation-sessions', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { duration_minutes, meditation_type, comment, breathing_cycle_json } = req.body;
    const userId = req.user.id;
    
    console.log('Saving meditation session for user:', userId);
    
    const session = await db
      .insertInto('meditation_sessions')
      .values({
        user_id: userId,
        duration_minutes: duration_minutes || 0,
        meditation_type: meditation_type || 'free',
        comment: comment || null,
        breathing_cycle_json: breathing_cycle_json || null,
        completed_at: new Date().toISOString()
      })
      .returning(['id', 'duration_minutes', 'meditation_type'])
      .executeTakeFirst();
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error saving meditation session:', error);
    res.status(500).json({ error: 'Error al guardar sesión de meditación' });
  }
});

// Content Library Routes
app.get('/api/content-library', authenticateToken, async (req: any, res: express.Response) => {
  try {
    console.log('Fetching content library for user:', req.user.email);
    const content = await db
      .selectFrom('content_library')
      .selectAll()
      .where('is_active', '=', 1)
      .execute();
    
    console.log('Content library items fetched:', content.length);
    res.json(content);
  } catch (error) {
    console.error('Error fetching content library:', error);
    res.status(500).json({ error: 'Error al obtener biblioteca de contenido' });
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
    res.status(500).json({ error: 'Error al obtener entrenamiento del día' });
  }
});

// User Files Routes
app.get('/api/user-files', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.id;
    console.log('Fetching user files for:', userId);
    
    const files = await db
      .selectFrom('user_files')
      .selectAll()
      .where('user_id', '=', userId)
      .execute();
    
    console.log('User files fetched:', files.length);
    res.json(files);
  } catch (error) {
    console.error('Error fetching user files:', error);
    res.status(500).json({ error: 'Error al obtener archivos del usuario' });
  }
});

// File upload route
app.post('/api/upload-user-file', authenticateToken, requireAdmin, upload.single('file'), async (req: any, res: express.Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No se proporcionó archivo' });
      return;
    }

    const { user_id, file_type } = req.body;
    
    if (!user_id || !file_type) {
      res.status(400).json({ error: 'user_id y file_type son requeridos' });
      return;
    }

    console.log('Uploading file for user:', user_id, 'type:', file_type);

    const userFile = await db
      .insertInto('user_files')
      .values({
        user_id: parseInt(user_id),
        filename: req.file.originalname,
        file_type,
        file_path: req.file.path,
        uploaded_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .returning(['id', 'filename', 'file_type'])
      .executeTakeFirst();

    console.log('File uploaded successfully:', userFile?.filename);
    res.status(201).json(userFile);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error al subir archivo' });
  }
});

// File download route
app.get('/api/files/:id', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const file = await db
      .selectFrom('user_files')
      .selectAll()
      .where('id', '=', parseInt(id))
      .executeTakeFirst();

    if (!file) {
      res.status(404).json({ error: 'Archivo no encontrado' });
      return;
    }

    // Check if user can access this file
    if (userRole !== 'admin' && file.user_id !== userId) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }

    if (!fs.existsSync(file.file_path)) {
      res.status(404).json({ error: 'Archivo físico no encontrado' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    res.sendFile(path.resolve(file.file_path));
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Error al descargar archivo' });
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
    res.status(500).json({ error: 'Error checking admin user' });
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
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

app.get('/api/plans/:id', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    console.log('Fetching plan by ID:', id);
    const plan = await db
      .selectFrom('plans')
      .selectAll()
      .where('id', '=', parseInt(id))
      .executeTakeFirst();
    
    if (!plan) {
      console.log('Plan not found:', id);
      res.status(404).json({ error: 'Plan no encontrado' });
      return;
    }
    
    console.log('Plan found:', plan.name);
    res.json({
      ...plan,
      services_included: JSON.parse(plan.services_included),
      features: getUserFeatures(plan.features_json)
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Error al obtener plan' });
  }
});

app.put('/api/plans/:id', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, services_included, features, is_active } = req.body;
    console.log('Admin updating plan:', id, 'by user:', req.user.email);
    
    const plan = await db
      .updateTable('plans')
      .set({ 
        name,
        description,
        price: parseFloat(price) || 0,
        services_included: JSON.stringify(services_included),
        features_json: JSON.stringify(features || {}),
        is_active: is_active ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'description', 'price', 'services_included', 'features_json', 'is_active'])
      .executeTakeFirst();
    
    if (!plan) {
      res.status(404).json({ error: 'Plan no encontrado' });
      return;
    }
    
    console.log('Plan updated successfully:', plan.name);
    res.json({
      ...plan,
      services_included: JSON.parse(plan.services_included),
      features: getUserFeatures(plan.features_json)
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
});

// Protected API Routes
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
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.get('/api/users/:id', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Users can only access their own data unless they're admin
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }

    console.log('Fetching user by ID:', id);
    const user = await db
      .selectFrom('users')
      .select(['id', 'email', 'full_name', 'role', 'plan_type', 'is_active', 'features_json', 'created_at'])
      .where('id', '=', parseInt(id))
      .executeTakeFirst();
    
    if (!user) {
      console.log('User not found:', id);
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    
    console.log('User found:', user.email);
    res.json({
      ...user,
      features: getUserFeatures(user.features_json)
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

app.put('/api/users/:id/toggle-status', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    console.log('Admin toggling user status:', id, 'to:', is_active, 'by:', req.user.email);
    
    // Validate the user ID
    const userId = parseInt(id);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }
    
    // Prevent admin from deactivating themselves
    if (userId === req.user.id) {
      res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
      return;
    }
    
    // Check if user exists first
    const existingUser = await db
      .selectFrom('users')
      .select(['id', 'email'])
      .where('id', '=', userId)
      .executeTakeFirst();
    
    if (!existingUser) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    
    // Update user status
    const user = await db
      .updateTable('users')
      .set({ 
        is_active: is_active ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .returning(['id', 'email', 'is_active'])
      .executeTakeFirst();
    
    if (!user) {
      res.status(500).json({ error: 'Error al actualizar estado del usuario' });
      return;
    }
    
    console.log('User status updated successfully:', user.email, 'Active:', user.is_active);
    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Error al actualizar estado del usuario' });
  }
});

app.put('/api/users/:id/features', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { features, plan_type } = req.body;
    console.log('Admin updating user features:', id, 'by:', req.user.email, 'features:', features);
    
    const userId = parseInt(id);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }
    
    const updateData: any = {
      features_json: JSON.stringify(features || {}),
      updated_at: new Date().toISOString()
    };
    
    if (plan_type !== undefined) {
      updateData.plan_type = plan_type;
    }
    
    const updatedUser = await db
      .updateTable('users')
      .set(updateData)
      .where('id', '=', userId)
      .returning(['id', 'email', 'full_name', 'role', 'plan_type', 'features_json', 'created_at'])
      .executeTakeFirst();
    
    if (!updatedUser) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    
    console.log('User features updated successfully:', updatedUser.email);
    res.json(formatUserResponse(updatedUser));
  } catch (error) {
    console.error('Error updating user features:', error);
    res.status(500).json({ error: 'Error al actualizar características del usuario' });
  }
});

app.post('/api/broadcast', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { message } = req.body;
    const senderId = req.user.id;
    console.log('Broadcasting message from admin:', req.user.email);
    
    const broadcastMessage = await db
      .insertInto('broadcast_messages')
      .values({
        sender_id: senderId,
        message,
        created_at: new Date().toISOString()
      })
      .returning(['id', 'message', 'created_at'])
      .executeTakeFirst();
    
    console.log('Broadcast message sent:', broadcastMessage?.id);
    res.status(201).json(broadcastMessage);
  } catch (error) {
    console.error('Error sending broadcast message:', error);
    res.status(500).json({ error: 'Error al enviar mensaje masivo' });
  }
});

// Export a function to start the server
export async function startServer(port: number) {
  try {
    if (process.env.NODE_ENV === 'production') {
      setupStaticServing(app);
    }
    app.listen(port, () => {
      console.log(`API Server running on port ${port}`);
      console.log('Database connection established');
      console.log('Authentication system initialized');
      console.log('Role-based access control enabled');
      console.log('File upload system enabled');
      console.log('Admin account: franciscodanielechs@gmail.com with password: admin123');
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