import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get all plans (admin only)
router.get('/plans-management', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    console.log('Admin fetching all plans for management');

    const plans = await db
      .selectFrom('plans')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    const formattedPlans = plans.map(plan => ({
      ...plan,
      services_included: plan.services_included ? JSON.parse(plan.services_included) : [],
      features_json: plan.features_json ? JSON.parse(plan.features_json) : {},
      is_active: Boolean(plan.is_active)
    }));

    console.log('Plans fetched for management:', formattedPlans.length);
    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching plans for management:', error);
    await SystemLogger.logCriticalError('Plans management fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener planes');
  }
});

// Update plan (admin only)
router.put('/plans-management/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, services_included, features_json, is_active } = req.body;

    console.log('Admin updating plan:', id, 'with data:', { name, price, is_active });

    // Validate inputs
    if (!name?.trim()) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'El nombre del plan es requerido');
      return;
    }

    if (!description?.trim()) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'La descripción del plan es requerida');
      return;
    }

    if (typeof price !== 'number' || price < 0) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'El precio debe ser un número válido');
      return;
    }

    if (!Array.isArray(services_included)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Los servicios incluidos deben ser un array');
      return;
    }

    const updatedPlan = await db
      .updateTable('plans')
      .set({
        name: name.trim(),
        description: description.trim(),
        price,
        services_included: JSON.stringify(services_included),
        features_json: JSON.stringify(features_json || {}),
        is_active: is_active ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'description', 'price', 'services_included', 'features_json', 'is_active'])
      .executeTakeFirst();

    if (!updatedPlan) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Plan no encontrado');
      return;
    }

    await SystemLogger.log('info', 'Plan updated', {
      userId: req.user.id,
      metadata: { plan_id: parseInt(id), name, price }
    });

    const formattedPlan = {
      ...updatedPlan,
      services_included: updatedPlan.services_included ? JSON.parse(updatedPlan.services_included) : [],
      features_json: updatedPlan.features_json ? JSON.parse(updatedPlan.features_json) : {},
      is_active: Boolean(updatedPlan.is_active)
    };

    console.log('Plan updated successfully:', formattedPlan.id);
    res.json(formattedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    await SystemLogger.logCriticalError('Plan update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar plan');
  }
});

// Create new plan (admin only)
router.post('/plans-management', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { name, description, price, services_included, features_json } = req.body;

    console.log('Admin creating new plan:', { name, price });

    // Validate inputs
    if (!name?.trim()) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'El nombre del plan es requerido');
      return;
    }

    if (!description?.trim()) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'La descripción del plan es requerida');
      return;
    }

    if (typeof price !== 'number' || price < 0) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'El precio debe ser un número válido');
      return;
    }

    if (!Array.isArray(services_included) || services_included.length === 0) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Debe incluir al menos un servicio');
      return;
    }

    const newPlan = await db
      .insertInto('plans')
      .values({
        name: name.trim(),
        description: description.trim(),
        price,
        services_included: JSON.stringify(services_included),
        features_json: JSON.stringify(features_json || {
          habits: true,
          training: true,
          nutrition: false,
          meditation: false,
          active_breaks: true
        }),
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id', 'name', 'description', 'price', 'services_included', 'features_json', 'is_active'])
      .executeTakeFirst();

    if (!newPlan) {
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al crear el plan');
      return;
    }

    await SystemLogger.log('info', 'Plan created', {
      userId: req.user.id,
      metadata: { plan_id: newPlan.id, name, price }
    });

    const formattedPlan = {
      ...newPlan,
      services_included: newPlan.services_included ? JSON.parse(newPlan.services_included) : [],
      features_json: newPlan.features_json ? JSON.parse(newPlan.features_json) : {},
      is_active: Boolean(newPlan.is_active)
    };

    console.log('Plan created successfully:', formattedPlan.id);
    res.status(201).json(formattedPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    await SystemLogger.logCriticalError('Plan creation error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al crear plan');
  }
});

// Delete plan (admin only)
router.delete('/plans-management/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    console.log('Admin deleting plan:', id);

    // Check if plan is in use by checking the 'plan_type' column on the 'users' table
    const usersOnPlan = await db
      .selectFrom('users')
      .select('id')
      .where('plan_type', '=', (
        db.selectFrom('plans').select('name').where('id', '=', parseInt(id))
      ))
      .limit(1)
      .execute();

    if (usersOnPlan.length > 0) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'No se puede eliminar un plan que está siendo usado por usuarios');
      return;
    }

    const deletedPlan = await db
      .deleteFrom('plans')
      .where('id', '=', parseInt(id))
      .returning(['id', 'name'])
      .executeTakeFirst();

    if (!deletedPlan) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Plan no encontrado');
      return;
    }

    await SystemLogger.log('info', 'Plan deleted', {
      userId: req.user.id,
      metadata: { plan_id: deletedPlan.id, name: deletedPlan.name }
    });

    console.log('Plan deleted successfully:', deletedPlan.id);
    res.status(200).json({ message: 'Plan eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    await SystemLogger.logCriticalError('Plan deletion error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al eliminar plan');
  }
});

export default router;
