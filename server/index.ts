import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setupStaticServing } from './static-serve.js';
import { db } from './database.js';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

    // Create user
    const newUser = await db
      .insertInto('users')
      .values({
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        role,
        is_active: 1,
        features_json: '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id', 'email', 'full_name', 'role', 'plan_type'])
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
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        plan_type: newUser.plan_type
      }, 
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
    console.log('Password hash in database:', user.password_hash ? 'exists' : 'missing');
    
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

    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      plan_type: user.plan_type
    };

    console.log('Login successful for user:', user.email, 'Role:', user.role);
    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: any, res: express.Response) => {
  const userResponse = {
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.full_name,
    role: req.user.role,
    plan_type: req.user.plan_type
  };
  res.json(userResponse);
});

// Test endpoint to verify admin user setup
app.get('/api/test/admin-user', async (req: express.Request, res: express.Response) => {
  try {
    const adminUser = await db
      .selectFrom('users')
      .select(['id', 'email', 'full_name', 'role', 'is_active'])
      .where('email', '=', 'franciscodanielechs@gmail.com')
      .executeTakeFirst();
    
    if (adminUser) {
      console.log('Admin user found:', adminUser);
      res.json({ 
        message: 'Admin user exists',
        user: adminUser,
        password_hash_exists: adminUser ? 'Yes' : 'No'
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
    res.json(plans);
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
    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Error al obtener plan' });
  }
});

app.put('/api/plans/:id', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, services_included, is_active } = req.body;
    console.log('Admin updating plan:', id, 'by user:', req.user.email);
    
    const plan = await db
      .updateTable('plans')
      .set({ 
        name,
        description,
        price: parseFloat(price) || 0,
        services_included: JSON.stringify(services_included),
        is_active: is_active ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'description', 'price', 'services_included', 'is_active'])
      .executeTakeFirst();
    
    if (!plan) {
      res.status(404).json({ error: 'Plan no encontrado' });
      return;
    }
    
    console.log('Plan updated successfully:', plan.name);
    res.json(plan);
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
      .select(['id', 'email', 'full_name', 'role', 'plan_type', 'is_active', 'created_at'])
      .execute();
    console.log('Users fetched:', users.length);
    res.json(users);
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
      .select(['id', 'email', 'full_name', 'role', 'plan_type', 'is_active', 'created_at'])
      .where('id', '=', parseInt(id))
      .executeTakeFirst();
    
    if (!user) {
      console.log('User not found:', id);
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    
    console.log('User found:', user.email);
    res.json(user);
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
    
    // Prevent admin from deactivating themselves
    if (parseInt(id) === req.user.id) {
      res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
      return;
    }
    
    const user = await db
      .updateTable('users')
      .set({ 
        is_active: is_active ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'email', 'is_active'])
      .executeTakeFirst();
    
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    
    console.log('User status updated:', user.email, 'Active:', user.is_active);
    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Error al actualizar estado del usuario' });
  }
});

app.post('/api/habits', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { name, date } = req.body;
    const userId = req.user.id;
    console.log('Creating habit for user:', userId);
    
    const habit = await db
      .insertInto('habits')
      .values({
        user_id: userId,
        name,
        date: date || new Date().toISOString().split('T')[0],
        is_completed: 0,
        created_at: new Date().toISOString()
      })
      .returning(['id', 'name', 'is_completed', 'date'])
      .executeTakeFirst();
    
    console.log('Habit created:', habit?.name);
    res.status(201).json(habit);
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: 'Error al crear hábito' });
  }
});

app.put('/api/habits/:id', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { is_completed } = req.body;
    const userId = req.user.id;
    console.log('Updating habit:', id, 'completed:', is_completed);
    
    // Verify the habit belongs to the requesting user
    const existingHabit = await db
      .selectFrom('habits')
      .select(['user_id'])
      .where('id', '=', parseInt(id))
      .executeTakeFirst();

    if (!existingHabit || existingHabit.user_id !== userId) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    
    const habit = await db
      .updateTable('habits')
      .set({ is_completed: is_completed ? 1 : 0 })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'is_completed'])
      .executeTakeFirst();
    
    console.log('Habit updated:', habit?.name);
    res.json(habit);
  } catch (error) {
    console.error('Error updating habit:', error);
    res.status(500).json({ error: 'Error al actualizar hábito' });
  }
});

app.post('/api/steps', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { steps, date } = req.body;
    const userId = req.user.id;
    console.log('Recording steps for user:', userId, 'steps:', steps);
    
    const stepRecord = await db
      .insertInto('step_counts')
      .values({
        user_id: userId,
        steps: parseInt(steps) || 0,
        date: date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })
      .onConflict((oc) => oc.columns(['user_id', 'date']).doUpdateSet({ 
        steps: parseInt(steps) || 0 
      }))
      .returning(['id', 'steps', 'date'])
      .executeTakeFirst();
    
    console.log('Steps recorded:', stepRecord?.steps);
    res.json(stepRecord);
  } catch (error) {
    console.error('Error recording steps:', error);
    res.status(500).json({ error: 'Error al registrar pasos' });
  }
});

app.post('/api/notes', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const { content, date } = req.body;
    const userId = req.user.id;
    console.log('Creating note for user:', userId);
    
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
    
    console.log('Note created for date:', note?.date);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Error al crear nota' });
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
      console.log('Admin account: franciscodanielechs@gmail.com with password: admin123');
      console.log('Test admin endpoint: GET /api/test/admin-user');
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
