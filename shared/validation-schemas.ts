
import { z } from 'zod';

// User registration schema
export const registerSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string().min(1, 'Confirmar contraseña es requerido'),
  acceptTos: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los términos y condiciones'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});
export type RegisterFormData = z.infer<typeof registerSchema>;

// User login schema
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

// Daily habits update schema
export const dailyHabitsUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  training_completed: z.boolean().optional(),
  nutrition_completed: z.boolean().optional(),
  movement_completed: z.boolean().optional(),
  meditation_completed: z.boolean().optional(),
  steps: z.number().int().min(0).optional(),
});

// Daily note schema
export const dailyNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().min(1, 'El contenido no puede estar vacío').max(5000),
});

// Meditation session schema
export const meditationSessionSchema = z.object({
  duration_minutes: z.number().int().min(1),
  meditation_type: z.enum(['guided', 'free']),
  comment: z.string().max(500).optional(),
});

// File upload schema
export const fileUploadSchema = z.object({
  user_id: z.string().regex(/^\d+$/),
  file_type: z.string().min(1),
});

// Content library schema
export const contentLibrarySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  video_url: z.string().url().optional().or(z.literal('')),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Broadcast message schema
export const broadcastMessageSchema = z.object({
  message: z.string().min(1).max(1000),
});

// Plan assignment schema
export const planAssignmentSchema = z.object({
  userId: z.number().int(),
  planId: z.number().int(),
});

// Toggle user status schema
export const toggleUserStatusSchema = z.object({
  userId: z.number().int(),
  isActive: z.boolean(),
});
