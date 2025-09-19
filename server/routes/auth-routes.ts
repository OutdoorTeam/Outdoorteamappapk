
import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Change password for authenticated user
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password || password.length < 8) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await db
      .updateTable('users')
      .set({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', userId)
      .execute();

    await SystemLogger.log('info', 'User changed password', { userId });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error changing password:', error);
    await SystemLogger.logCriticalError('Password change error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al cambiar la contraseña');
  }
});

export default router;
