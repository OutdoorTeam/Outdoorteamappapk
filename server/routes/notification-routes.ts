import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req: any, res) => {
  try {
    // Return disabled preferences
    const defaultPreferences = {
      enabled: false,
      habits: [],
      times: {},
      push_token: null,
      push_endpoint: null
    };
    
    res.json(defaultPreferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener preferencias de notificaciones');
  }
});

// Update user notification preferences
router.put('/preferences', authenticateToken, async (req: any, res) => {
  try {
    // Always return disabled
    const response = {
      enabled: false,
      habits: [],
      times: {}
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar preferencias de notificaciones');
  }
});

// Subscribe to push notifications (disabled)
router.post('/subscribe', authenticateToken, async (req: any, res) => {
  try {
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones push están desactivadas');
    return;
  } catch (error) {
    console.error('Error in subscribe endpoint:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones push están desactivadas');
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req: any, res) => {
  try {
    res.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al cancelar suscripción push');
  }
});

// Send test notification (disabled)
router.post('/test', authenticateToken, async (req: any, res) => {
  try {
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones de prueba están desactivadas');
    return;
  } catch (error) {
    console.error('Error sending test notification:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones de prueba están desactivadas');
  }
});

// Send broadcast notification (disabled)
router.post('/broadcast', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    res.json({ success: true, sent: 0, failed: 0, message: 'Las notificaciones están desactivadas' });
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al enviar notificación masiva');
  }
});

// Mark habit as complete from notification (disabled)
router.post('/mark-complete', async (req, res) => {
  try {
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Funcionalidad desactivada');
    return;
  } catch (error) {
    console.error('Error marking habit complete:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Funcionalidad desactivada');
  }
});

// Get VAPID public key (disabled)
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: 'disabled' });
});

export default router;
