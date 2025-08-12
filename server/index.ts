import express from 'express';
import dotenv from 'dotenv';
import { setupStaticServing } from './static-serve.js';
import { db } from './database.js';

dotenv.config();

const app = express();

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/api/users', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Fetching all users...');
    const users = await db.selectFrom('users').selectAll().execute();
    console.log('Users fetched:', users.length);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    console.log('Fetching user by ID:', id);
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', parseInt(id))
      .executeTakeFirst();
    
    if (!user) {
      console.log('User not found:', id);
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    console.log('User found:', user.email);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/register', async (req: express.Request, res: express.Response) => {
  try {
    const { email, full_name, password_hash } = req.body;
    console.log('Registering new user:', email);
    
    const newUser = await db
      .insertInto('users')
      .values({
        email,
        full_name,
        password_hash,
        role: 'user',
        is_active: 1,
        features_json: '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id', 'email', 'full_name', 'role'])
      .executeTakeFirst();
    
    console.log('User registered successfully:', newUser?.email);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/habits', async (req: express.Request, res: express.Response) => {
  try {
    const { user_id, name, date } = req.body;
    console.log('Creating habit for user:', user_id);
    
    const habit = await db
      .insertInto('habits')
      .values({
        user_id,
        name,
        date,
        is_completed: 0,
        created_at: new Date().toISOString()
      })
      .returning(['id', 'name', 'is_completed', 'date'])
      .executeTakeFirst();
    
    console.log('Habit created:', habit?.name);
    res.status(201).json(habit);
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

app.put('/api/habits/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { is_completed } = req.body;
    console.log('Updating habit:', id, 'completed:', is_completed);
    
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
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

app.post('/api/steps', async (req: express.Request, res: express.Response) => {
  try {
    const { user_id, steps, date } = req.body;
    console.log('Recording steps for user:', user_id, 'steps:', steps);
    
    const stepRecord = await db
      .insertInto('step_counts')
      .values({
        user_id,
        steps,
        date,
        created_at: new Date().toISOString()
      })
      .onConflict((oc) => oc.columns(['user_id', 'date']).doUpdateSet({ steps }))
      .returning(['id', 'steps', 'date'])
      .executeTakeFirst();
    
    console.log('Steps recorded:', stepRecord?.steps);
    res.json(stepRecord);
  } catch (error) {
    console.error('Error recording steps:', error);
    res.status(500).json({ error: 'Failed to record steps' });
  }
});

app.post('/api/notes', async (req: express.Request, res: express.Response) => {
  try {
    const { user_id, content, date } = req.body;
    console.log('Creating note for user:', user_id);
    
    const note = await db
      .insertInto('user_notes')
      .values({
        user_id,
        content,
        date,
        created_at: new Date().toISOString()
      })
      .returning(['id', 'content', 'date'])
      .executeTakeFirst();
    
    console.log('Note created for date:', note?.date);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.post('/api/broadcast', async (req: express.Request, res: express.Response) => {
  try {
    const { sender_id, message } = req.body;
    console.log('Broadcasting message from user:', sender_id);
    
    const broadcastMessage = await db
      .insertInto('broadcast_messages')
      .values({
        sender_id,
        message,
        created_at: new Date().toISOString()
      })
      .returning(['id', 'message', 'created_at'])
      .executeTakeFirst();
    
    console.log('Broadcast message sent:', broadcastMessage?.id);
    res.status(201).json(broadcastMessage);
  } catch (error) {
    console.error('Error sending broadcast message:', error);
    res.status(500).json({ error: 'Failed to send broadcast message' });
  }
});

// Export a function to start the server
export async function startServer(port) {
  try {
    if (process.env.NODE_ENV === 'production') {
      setupStaticServing(app);
    }
    app.listen(port, () => {
      console.log(`API Server running on port ${port}`);
      console.log('Database connection established');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting server...');
  startServer(process.env.PORT || 3001);
}
