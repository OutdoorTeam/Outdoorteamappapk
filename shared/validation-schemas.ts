import { z } from 'zod';

// User registration schema
export const registerSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
  acceptTos: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los términos y condiciones'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// User login schema
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Daily habits update schema
export const dailyHabitsUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  training_completed: z.boolean().optional(),
  nutrition_completed: z.boolean().optional(),
  movement_completed: z.boolean().optional(),
  meditation_completed: z.boolean().optional(),
  steps: z.number().min(0).max(100000).optional()
});

// Daily note schema
export const dailyNoteSchema = z.object({
  content: z.string().max(2000, 'La nota no puede exceder 2000 caracteres'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido').optional()
});

// Meditation session schema
export const meditationSessionSchema = z.object({
  duration_minutes: z.number().min(1).max(120),
  meditation_type: z.enum(['guided', 'free']),
  comment: z.string().max(500).optional(),
  breathing_cycle_json: z.string().optional()
});

// File upload schema
export const fileUploadSchema = z.object({
  user_id: z.number().positive(),
  file_type: z.enum(['training', 'nutrition'])
});

// Content library schema
export const contentLibrarySchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200, 'El título no puede exceder 200 caracteres'),
  description: z.string().max(1000, 'La descripción no puede exceder 1000 caracteres').optional(),
  video_url: z.string().url('URL del video inválida').optional(),
  category: z.enum(['exercise', 'active_breaks', 'meditation'], {
    errorMap: () => ({ message: 'La categoría es requerida' })
  }),
  subcategory: z.string().max(50).optional(),
  is_active: z.boolean().optional()
});

// Broadcast message schema
export const broadcastMessageSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().optional()
});

// Plan assignment schema
export const planAssignmentSchema = z.object({
  planId: z.number().positive()
});

// Toggle user status schema
export const toggleUserStatusSchema = z.object({
  is_active: z.boolean()
});
