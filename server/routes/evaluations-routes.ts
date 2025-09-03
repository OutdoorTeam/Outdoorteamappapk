
import express from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateRequest, sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { parqSchema, whoqolSchema, pss10Schema } from '../../shared/validation-schemas.js';
import { SystemLogger } from '../utils/logging.js';
import { randomUUID } from 'crypto';

const router = express.Router();

const checkEvaluationFrequency = async (
  res: express.Response,
  userId: number,
  tableName: 'evaluaciones_parq' | 'evaluaciones_whoqol' | 'evaluaciones_pss10',
  days: number
) => {
  const lastEvaluation = await db
    .selectFrom(tableName)
    .select('created_at')
    .where('user_id', '=', userId)
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (lastEvaluation) {
    const lastDate = new Date(lastEvaluation.created_at);
    const nextAvailableDate = new Date(lastDate.setDate(lastDate.getDate() + days));
    const now = new Date();

    if (now < nextAvailableDate) {
      sendErrorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        `Podrás volver a completar esta evaluación a partir del ${nextAvailableDate.toLocaleDateString()}.`
      );
      return false;
    }
  }
  return true;
};

// POST PAR-Q Evaluation
router.post('/evaluations/parq', authenticateToken, validateRequest(parqSchema), async (req: any, res: express.Response) => {
  const { answers_json, result_flag, notes } = req.body;
  const userId = req.user.id;

  if (!(await checkEvaluationFrequency(res, userId, 'evaluaciones_parq', 90))) {
    return;
  }

  try {
    const newEvaluation = await db
      .insertInto('evaluaciones_parq')
      .values({
        id: randomUUID(),
        user_id: userId,
        answers_json: JSON.stringify(answers_json),
        result_flag: result_flag ? 1 : 0,
        notes,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    res.status(201).json(newEvaluation);
  } catch (error) {
    await SystemLogger.logCriticalError('Error saving PAR-Q', error as Error, { userId });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar la evaluación PAR-Q');
  }
});

// POST WHOQOL-BREF Evaluation
router.post('/evaluations/whoqol', authenticateToken, validateRequest(whoqolSchema), async (req: any, res: express.Response) => {
  const { scores, answers_json, notes } = req.body;
  const userId = req.user.id;

  if (!(await checkEvaluationFrequency(res, userId, 'evaluaciones_whoqol', 90))) {
    return;
  }

  try {
    const newEvaluation = await db
      .insertInto('evaluaciones_whoqol')
      .values({
        id: randomUUID(),
        user_id: userId,
        score_physical: scores.physical,
        score_psychological: scores.psychological,
        score_social: scores.social,
        score_environmental: scores.environmental,
        score_total: scores.total,
        answers_json: JSON.stringify(answers_json),
        notes,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    res.status(201).json(newEvaluation);
  } catch (error) {
    await SystemLogger.logCriticalError('Error saving WHOQOL', error as Error, { userId });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar la evaluación WHOQOL-BREF');
  }
});

// POST PSS-10 Evaluation
router.post('/evaluations/pss10', authenticateToken, validateRequest(pss10Schema), async (req: any, res: express.Response) => {
  const { score_total, category, answers_json, notes } = req.body;
  const userId = req.user.id;

  if (!(await checkEvaluationFrequency(res, userId, 'evaluaciones_pss10', 30))) {
    return;
  }

  try {
    const newEvaluation = await db
      .insertInto('evaluaciones_pss10')
      .values({
        id: randomUUID(),
        user_id: userId,
        score_total,
        category,
        answers_json: JSON.stringify(answers_json),
        notes,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    res.status(201).json(newEvaluation);
  } catch (error) {
    await SystemLogger.logCriticalError('Error saving PSS-10', error as Error, { userId });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar la evaluación PSS-10');
  }
});

// GET User's Evaluations
router.get('/evaluations/:type', authenticateToken, async (req: any, res: express.Response) => {
  const { type } = req.params;
  const userId = req.user.id;
  const tableName = `evaluaciones_${type}` as 'evaluaciones_parq' | 'evaluaciones_whoqol' | 'evaluaciones_pss10';

  if (!['parq', 'whoqol', 'pss10'].includes(type)) {
    sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Tipo de evaluación inválido');
    return;
  }

  try {
    const evaluations = await db
      .selectFrom(tableName)
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();

    res.json(evaluations);
  } catch (error) {
    await SystemLogger.logCriticalError(`Error fetching ${type} evaluations`, error as Error, { userId });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener las evaluaciones');
  }
});

// GET Admin: All evaluations for a user
router.get('/admin/evaluations/:userId/:type', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
    const { type, userId } = req.params;
    const tableName = `evaluaciones_${type}` as 'evaluaciones_parq' | 'evaluaciones_whoqol' | 'evaluaciones_pss10';
  
    if (!['parq', 'whoqol', 'pss10'].includes(type)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Tipo de evaluación inválido');
      return;
    }
  
    try {
      const evaluations = await db
        .selectFrom(tableName)
        .selectAll()
        .where('user_id', '=', parseInt(userId, 10))
        .orderBy('created_at', 'desc')
        .execute();
  
      res.json(evaluations);
    } catch (error) {
      await SystemLogger.logCriticalError(`Admin: Error fetching ${type} evaluations`, error as Error, { userId: req.user.id });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener las evaluaciones');
    }
  });

export default router;
