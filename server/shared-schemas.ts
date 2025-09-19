import { createRequire } from 'module';
import type { z } from 'zod';

const require = createRequire(import.meta.url);

interface SharedSchemas {
  registerSchema: z.ZodTypeAny;
  loginSchema: z.ZodTypeAny;
  dailyHabitsUpdateSchema: z.ZodTypeAny;
  dailyNoteSchema: z.ZodTypeAny;
  meditationSessionSchema: z.ZodTypeAny;
  fileUploadSchema: z.ZodTypeAny;
  contentLibrarySchema: z.ZodTypeAny;
  broadcastMessageSchema: z.ZodTypeAny;
  planAssignmentSchema: z.ZodTypeAny;
  toggleUserStatusSchema: z.ZodTypeAny;
}

const sharedSchemas = require('../shared/validation-schemas.js') as SharedSchemas;

export const {
  registerSchema,
  loginSchema,
  dailyHabitsUpdateSchema,
  dailyNoteSchema,
  meditationSessionSchema,
  fileUploadSchema,
  contentLibrarySchema,
  broadcastMessageSchema,
  planAssignmentSchema,
  toggleUserStatusSchema
} = sharedSchemas;
