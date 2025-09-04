
      <![CDATA[
import { Router } from 'express';
import { db }from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

router.get('/report', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    console.log('Admin report generation requested by:', req.user.email);
    await SystemLogger.log('info', 'REPORT_GENERATION_STARTED', { userId: req.user.id });

    // 1. Users
    const users = await db.selectFrom('users').selectAll().execute();
    const formattedUsers = users.map(u => ({
      nombre_completo: u.full_name,
      email: u.email,
      rol: u.role,
      plan_actual: u.plan_type,
      servicios_activos: JSON.parse(u.features_json || '{}'),
      fecha_alta: u.created_at,
      estado_suscripcion: u.is_active ? 'activa' : 'inactiva',
    }));

    // 2. Daily Habit Logs (from daily_history)
    const habitLogs = await db
      .selectFrom('daily_history')
      .innerJoin('users', 'users.id', 'daily_history.user_id')
      .select([
        'users.full_name as usuario',
        'daily_history.date',
        'daily_history.steps as pasos_registrados',
        'daily_history.training_completed',
        'daily_history.nutrition_completed',
        'daily_history.movement_completed',
        'daily_history.meditation_completed',
        'daily_history.notes_content as nota_del_dia',
        'daily_history.daily_points as puntos_acumulados',
      ])
      .orderBy('daily_history.date', 'desc')
      .execute();
      
    const formattedHabitLogs = habitLogs.map(log => ({
        ...log,
        habitos_cumplidos: {
            alimentacion: Boolean(log.nutrition_completed),
            ejercicio: Boolean(log.training_completed),
            meditacion: Boolean(log.meditation_completed),
            pausas: Boolean(log.movement_completed) // Assuming movement is pausas activas
        }
    }));


    // 3. Training Plans
    const trainingPlans = await db
      .selectFrom('training_plans')
      .innerJoin('users', 'users.id', 'training_plans.user_id')
      .leftJoin('training_plan_days', 'training_plan_days.plan_id', 'training_plans.id')
      .select([
        'users.full_name as usuario_asignado',
        'training_plans.title as nombre_del_plan',
        'training_plans.status as estado',
        'training_plan_days.notes as notas_asociadas',
      ])
      .groupBy('training_plans.id')
      .execute();

    // 4. Nutrition Plans
    const nutritionPlans = await db
      .selectFrom('nutrition_plans')
      .innerJoin('users', 'users.id', 'nutrition_plans.user_id')
      .select([
        'users.full_name as usuario_asignado',
        'nutrition_plans.content_md as contenido_del_plan',
        'nutrition_plans.status as estado',
        'nutrition_plans.version',
      ])
      .execute();

    // 5. Public Libraries
    const contentLibrary = await db.selectFrom('content_library').selectAll().where('is_active', '=', 1).execute();
    const ejercicios = contentLibrary.filter(c => c.category === 'exercise').map(c => ({ nombre: c.title, descripcion: c.description, enlace: c.video_url }));
    const pausasActivas = contentLibrary.filter(c => c.category === 'active_breaks').map(c => ({ nombre: c.title, descripcion: c.description, enlace: c.video_url }));
    const meditaciones = contentLibrary.filter(c => c.category === 'meditation').map(c => ({ nombre: c.title, descripcion: c.description, enlace: c.video_url }));

    // 6. Progress Metrics Data
    // This provides the raw data for metrics. The user can then build charts.
    const progressMetricsData = {
      habitos_por_usuario: formattedHabitLogs, // Reusing habit logs
      pasos_diarios: formattedHabitLogs.map(log => ({ usuario: log.usuario, fecha: log.date, pasos: log.pasos_registrados })),
    };

    const report = {
      usuarios: formattedUsers,
      logs_diarios_habitos: formattedHabitLogs,
      planes_entrenamiento: trainingPlans,
      planes_nutricion: nutritionPlans,
      bibliotecas_publicas: {
        ejercicios,
        pausas_activas: pausasActivas,
        meditaciones,
      },
      datos_metricas_progreso: progressMetricsData,
    };

    res.setHeader('Content-Disposition', `attachment; filename="reporte-completo-${new Date().toISOString().split('T')[0]}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(report);
    return;

  } catch (error) {
    console.error('Error generating report:', error);
    await SystemLogger.logCriticalError('REPORT_GENERATION_FAILED', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al generar el reporte');
    return;
  }
});

export default router;
]]>
    