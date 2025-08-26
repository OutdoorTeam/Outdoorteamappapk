import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get today's note for the authenticated user
router.get('/daily-notes/today', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Fetching today note for user:', userId, 'date:', today);

    const todayNote = await db
      .selectFrom('user_notes')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', today)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    console.log('Today note fetched:', todayNote ? 'found' : 'none');
    res.json(todayNote || { content: '', date: today });
  } catch (error) {
    console.error('Error fetching today note:', error);
    await SystemLogger.logCriticalError('Today note fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener nota de hoy');
  }
});

// Get note by date for the authenticated user
router.get('/daily-notes/:date', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params;
    
    console.log('Fetching note for user:', userId, 'date:', date);

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Formato de fecha inválido');
      return;
    }

    const note = await db
      .selectFrom('user_notes')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', date)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    console.log('Note fetched for date:', date, note ? 'found' : 'none');
    res.json(note || { content: '', date });
  } catch (error) {
    console.error('Error fetching note by date:', error);
    await SystemLogger.logCriticalError('Note by date fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener nota');
  }
});

// Save/update note
router.post('/daily-notes', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { content, date } = req.body;
    const noteDate = date || new Date().toISOString().split('T')[0];
    
    console.log('Saving note for user:', userId, 'date:', noteDate, 'content length:', content?.length || 0);

    // Validate inputs
    if (!content || content.trim().length === 0) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Contenido de la nota requerido');
      return;
    }

    if (content.length > 2000) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'La nota no puede exceder 2000 caracteres');
      return;
    }

    // Validate date format
    if (!noteDate || !/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Formato de fecha inválido');
      return;
    }

    // Check if note exists for this date
    const existingNote = await db
      .selectFrom('user_notes')
      .select(['id'])
      .where('user_id', '=', userId)
      .where('date', '=', noteDate)
      .executeTakeFirst();

    let result;
    if (existingNote) {
      // Update existing note
      result = await db
        .updateTable('user_notes')
        .set({
          content: content.trim(),
        })
        .where('user_id', '=', userId)
        .where('date', '=', noteDate)
        .returning(['id', 'user_id', 'content', 'date', 'created_at'])
        .executeTakeFirst();
    } else {
      // Create new note
      result = await db
        .insertInto('user_notes')
        .values({
          user_id: userId,
          content: content.trim(),
          date: noteDate,
          created_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'content', 'date', 'created_at'])
        .executeTakeFirst();
    }

    console.log('Note saved successfully:', result?.id);
    res.json(result);
  } catch (error) {
    console.error('Error saving note:', error);
    await SystemLogger.logCriticalError('Note save error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar nota');
  }
});

export default router;
