﻿import express from 'express';
import type { Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateRequest, ERROR_CODES, sendErrorResponse } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';
import { db } from '../database.js';
import {
  contentLibrarySchema,
  broadcastMessageSchema
} from '../shared-schemas.js';

const router = express.Router();

// Content Library Routes
router.get('/content-library', authenticateToken, async (req: Request, res: Response) => {
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
router.post('/content-library', 
  authenticateToken, 
  requireAdmin, 
  validateRequest(contentLibrarySchema),
  async (req: Request, res: Response) => {
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

router.put('/content-library/:id', 
  authenticateToken, 
  requireAdmin, 
  validateRequest(contentLibrarySchema),
  async (req: Request, res: Response) => {
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
          is_active: is_active ? 1 : 0
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
        req,
        metadata: { content_id: content.id, title }
      });
      
      res.json(content);
    } catch (error) {
      console.error('Error updating content:', error);
      await SystemLogger.logCriticalError('Content update error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar contenido');
    }
  });

router.delete('/content-library/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Admin deleting content:', id);
    
    await db
      .deleteFrom('content_library')
      .where('id', '=', parseInt(id))
      .execute();
    
    await SystemLogger.log('info', 'Content deleted', {
      userId: req.user.id,
      req,
      metadata: { content_id: parseInt(id) }
    });
    
    res.json({ message: 'Contenido eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting content:', error);
    await SystemLogger.logCriticalError('Content deletion error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al eliminar contenido');
  }
});

// Workout of Day Routes
router.get('/workout-of-day', authenticateToken, async (req: Request, res: Response) => {
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
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener entrenamiento del dÃ­a');
  }
});

// Broadcast Messages
router.post('/broadcast', 
  authenticateToken, 
  requireAdmin, 
  validateRequest(broadcastMessageSchema),
  async (req: Request, res: Response) => {
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
      
      await SystemLogger.log('info', 'Broadcast message sent', {
        userId: req.user.id,
        req,
        metadata: { message_id: broadcastMessage?.id }
      });
      
      console.log('Broadcast message sent:', broadcastMessage?.id);
      res.status(201).json(broadcastMessage);
    } catch (error) {
      console.error('Error sending broadcast message:', error);
      await SystemLogger.logCriticalError('Broadcast message error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al enviar mensaje masivo');
    }
  });

export default router;

