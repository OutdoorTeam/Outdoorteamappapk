import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';
import { getVapidConfig, isVapidConfigured } from '../config/security.js';

const router = Router();

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req: any, res) => {
  try {
    // Return disabled preferences when VAPID is not configured
    const defaultPreferences = {
      enabled: false,
      habits: [],
      times: {},
      push_token: null,
      push_endpoint: null,
      vapid_configured: isVapidConfigured()
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
    if (!isVapidConfigured()) {
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones no están disponibles. VAPID no configurado.');
      return;
    }
    
    // Always return disabled when VAPID is not configured
    const response = {
      enabled: false,
      habits: [],
      times: {},
      vapid_configured: isVapidConfigured()
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar preferencias de notificaciones');
  }
});

// Subscribe to push notifications (disabled when VAPID not configured)
router.post('/subscribe', authenticateToken, async (req: any, res) => {
  try {
    if (!isVapidConfigured()) {
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones push están desactivadas. VAPID no configurado.');
      return;
    }
    
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
    res.json({ success: true, vapid_configured: isVapidConfigured() });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al cancelar suscripción push');
  }
});

// Send test notification (disabled when VAPID not configured)
router.post('/test', authenticateToken, async (req: any, res) => {
  try {
    if (!isVapidConfigured()) {
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones de prueba están desactivadas. VAPID no configurado.');
      return;
    }
    
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones de prueba están desactivadas');
    return;
  } catch (error) {
    console.error('Error sending test notification:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Las notificaciones de prueba están desactivadas');
  }
});

// Send broadcast notification (disabled when VAPID not configured)
router.post('/broadcast', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const vapidConfigured = isVapidConfigured();
    const message = vapidConfigured ?
      'Las notificaciones están desactivadas temporalmente' :
      'VAPID no configurado. Ejecuta: npm run generate-vapid';
    
    res.json({ 
      success: true, 
      sent: 0, 
      failed: 0, 
      message,
      vapid_configured: vapidConfigured
    });
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

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  const vapid = getVapidConfig();

  if (vapid) {
    res.json({
      publicKey: vapid.publicKey,
      configured: true
    });
  } else {
    res.json({ 
      publicKey: 'disabled',
      configured: false,
      message: 'VAPID keys not configured. Run: npm run generate-vapid'
    });
  }
});

export default router;
