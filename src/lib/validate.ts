import { z } from 'zod';

export const bookingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Please enter a valid email address').max(255).trim().toLowerCase(),
  phone: z.string().min(7, 'Please enter a valid phone number').max(20).trim(),
  session_type: z.enum(['couple', 'portrait', 'matric', 'custom'], {
    message: 'Please select a valid session type',
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().optional().nullable(),
  location: z.string().max(255).optional().default(''),
  notes: z.string().max(1000).optional().default(''),
  honeypot: z.string().max(0, 'Bot detected').optional().default(''),
});

export const adminLoginSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(6).max(128),
});

export const openingHoursSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
  enabled: z.boolean(),
});

export const blockedDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  reason: z.string().max(255).optional().default(''),
});

export const rescheduleSchema = z.object({
  id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().optional().nullable(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
