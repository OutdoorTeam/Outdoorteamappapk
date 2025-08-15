import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  full_name: z.string()
    .min(1, 'Nombre completo es requerido')
    .max(100, 'Nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/, 'Nombre solo puede contener letras y espacios'),
  email: z.string()
    .min(1, 'Email es requerido')
    .email('Formato de email inválido')
    .max(255, 'Email no puede exceder 255 caracteres'),
  password: z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(128, 'Contraseña no puede exceder 128 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  confirmPassword: z.string(),
  acceptTos: z.boolean().refine(val => val === true, 'Debes aceptar los términos y condiciones')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email es requerido')
    .email('Formato de email inválido')
    .max(255, 'Email no puede exceder 255 caracteres'),
  password: z.string()
    .min(1, 'Contraseña es requerida')
    .max(128, 'Contraseña no puede exceder 128 caracteres')
});

// Daily Habits Schemas
export const dailyHabitsUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  training_completed: z.boolean().optional(),
  nutrition_completed: z.boolean().optional(),
  movement_completed: z.boolean().optional(),
  meditation_completed: z.boolean().optional(),
  steps: z.number()
    .int('Pasos debe ser un número entero')
    .min(0, 'Pasos no puede ser negativo')
    .max(50000, 'Pasos no puede exceder 50,000')
    .optional()
});

// Daily Notes Schema
export const dailyNoteSchema = z.object({
  content: z.string()
    .max(500, 'Nota no puede exceder 500 caracteres')
    .transform(val => val.trim()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
});

// Meditation Schemas
export const meditationSessionSchema = z.object({
  duration_minutes: z.number()
    .int('Duración debe ser un número entero')
    .min(1, 'Duración mínima es 1 minuto')
    .max(120, 'Duración máxima es 120 minutos'),
  meditation_type: z.enum(['guided', 'free'], {
    message: 'Tipo de meditación debe ser "guided" o "free"'
  }),
  comment: z.string()
    .max(500, 'Comentario no puede exceder 500 caracteres')
    .optional()
    .transform(val => val?.trim()),
  breathing_cycle_json: z.string()
    .optional()
    .refine(val => {
      if (!val) return true;
      try {
        const parsed = JSON.parse(val);
        return typeof parsed === 'object' && parsed !== null;
      } catch {
        return false;
      }
    }, 'Ciclo de respiración debe ser JSON válido')
});

export const breathingCycleSchema = z.object({
  inhale: z.number()
    .int('Tiempo de inhalación debe ser un número entero')
    .min(1, 'Tiempo mínimo de inhalación es 1 segundo')
    .max(30, 'Tiempo máximo de inhalación es 30 segundos'),
  hold: z.number()
    .int('Tiempo de retención debe ser un número entero')
    .min(1, 'Tiempo mínimo de retención es 1 segundo')
    .max(30, 'Tiempo máximo de retención es 30 segundos'),
  exhale: z.number()
    .int('Tiempo de exhalación debe ser un número entero')
    .min(1, 'Tiempo mínimo de exhalación es 1 segundo')
    .max(30, 'Tiempo máximo de exhalación es 30 segundos')
});

// File Upload Schema
export const fileUploadSchema = z.object({
  user_id: z.number()
    .int('ID de usuario debe ser un número entero')
    .positive('ID de usuario debe ser positivo'),
  file_type: z.enum(['training', 'nutrition'], {
    message: 'Tipo de archivo debe ser "training" o "nutrition"'
  }),
  replace_existing: z.string().optional().transform(val => val === 'true')
});

// Plan Assignment Schema
export const planAssignmentSchema = z.object({
  planId: z.number()
    .int('ID de plan debe ser un número entero')
    .positive('ID de plan debe ser positivo')
});

// Content Library Schemas
export const contentLibrarySchema = z.object({
  title: z.string()
    .min(1, 'Título es requerido')
    .max(200, 'Título no puede exceder 200 caracteres')
    .transform(val => val.trim()),
  description: z.string()
    .max(1000, 'Descripción no puede exceder 1000 caracteres')
    .optional()
    .transform(val => val?.trim()),
  video_url: z.string()
    .url('URL debe ser válida')
    .regex(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)/, 'Debe ser una URL de YouTube válida')
    .optional(),
  category: z.enum(['exercise', 'meditation', 'active_breaks', 'nutrition'], {
    message: 'Categoría debe ser válida'
  }),
  subcategory: z.string()
    .max(100, 'Subcategoría no puede exceder 100 caracteres')
    .optional()
    .transform(val => val?.trim()),
  is_active: z.boolean().optional().default(true)
});

// Broadcast Message Schema
export const broadcastMessageSchema = z.object({
  message: z.string()
    .min(1, 'Mensaje es requerido')
    .max(500, 'Mensaje no puede exceder 500 caracteres')
    .transform(val => val.trim())
});

// Profile Update Schema
export const profileUpdateSchema = z.object({
  full_name: z.string()
    .min(1, 'Nombre es requerido')
    .max(50, 'Nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/, 'Nombre solo puede contener letras y espacios')
    .transform(val => val.trim())
});

// User Features Schema
export const userFeaturesSchema = z.object({
  features: z.object({
    habits: z.boolean().optional().default(false),
    training: z.boolean().optional().default(false),
    nutrition: z.boolean().optional().default(false),
    meditation: z.boolean().optional().default(false),
    active_breaks: z.boolean().optional().default(false)
  }),
  plan_type: z.string()
    .max(100, 'Tipo de plan no puede exceder 100 caracteres')
    .optional()
    .transform(val => val?.trim())
});

// System Log Schema
export const systemLogSchema = z.object({
  level: z.enum(['info', 'warn', 'error', 'critical']).default('info'),
  event: z.string()
    .min(1, 'Evento es requerido')
    .max(200, 'Evento no puede exceder 200 caracteres'),
  user_id: z.number().int().positive().optional(),
  route: z.string().max(500).optional(),
  ip_address: z.string().max(45).optional(),
  user_agent: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Password Reset Schema (for future implementation)
export const passwordResetRequestSchema = z.object({
  email: z.string()
    .min(1, 'Email es requerido')
    .email('Formato de email inválido')
    .max(255, 'Email no puede exceder 255 caracteres')
});

export const passwordResetConfirmSchema = z.object({
  token: z.string()
    .min(1, 'Token es requerido')
    .max(255, 'Token inválido'),
  password: z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(128, 'Contraseña no puede exceder 128 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

// Helper types for TypeScript
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type DailyHabitsUpdateData = z.infer<typeof dailyHabitsUpdateSchema>;
export type DailyNoteData = z.infer<typeof dailyNoteSchema>;
export type MeditationSessionData = z.infer<typeof meditationSessionSchema>;
export type BreathingCycleData = z.infer<typeof breathingCycleSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type PlanAssignmentData = z.infer<typeof planAssignmentSchema>;
export type ContentLibraryData = z.infer<typeof contentLibrarySchema>;
export type BroadcastMessageData = z.infer<typeof broadcastMessageSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type UserFeaturesData = z.infer<typeof userFeaturesSchema>;
export type SystemLogData = z.infer<typeof systemLogSchema>;
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmData = z.infer<typeof passwordResetConfirmSchema>;
