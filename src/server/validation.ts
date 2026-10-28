import { z } from 'zod';
import { parseDate } from '@/lib/availability';
import { BOOKING_STATUSES } from './db/schema';

const date = z.string().refine((v) => parseDate(v) !== null, 'Use a real date in YYYY-MM-DD format');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour)');
const isoInstant = z.iso.datetime({ offset: true });
const optionalText = (max: number) => z.string().trim().max(max).default('');
// Trim before validating: z.email() checks the raw input, so a pasted trailing space would fail.
const emailField = (message?: string) => z.string().trim().toLowerCase().max(255).pipe(z.email(message));

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100),
  email: emailField('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s().-]{6,}$/, 'Enter a valid phone number'),
  location: optionalText(255),
  notes: optionalText(2000),
});

export const publicBookingSchema = customerSchema.extend({
  serviceId: z.coerce.number().int().positive(),
  start: isoInstant.optional(),
  preferredDate: date.optional(),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional(),
});

export const adminBookingSchema = customerSchema.extend({
  serviceId: z.coerce.number().int().positive(),
  date,
  time,
});

export const rescheduleSchema = z.object({
  id: z.coerce.number().int().positive(),
  date,
  time,
  durationMinutes: z.coerce.number().int().min(5).max(24 * 60).optional(),
});

export const statusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(BOOKING_STATUSES),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: optionalText(500),
  durationMinutes: z.coerce.number().int().min(5).max(24 * 60),
  price: z
    .string()
    .trim()
    .regex(/^(\d+([.,]\d{1,2})?)?$/, 'Use a plain amount like 650 or 650.00')
    .default(''),
  priceLabel: optionalText(60),
  requiresQuote: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const ruleSchema = z
  .object({ dayOfWeek: z.number().int().min(0).max(6), startTime: time, endTime: time })
  .refine((r) => r.startTime < r.endTime, 'End time must be after start time');

export const timeOffSchema = z
  .object({ startDate: date, endDate: date, reason: optionalText(255) })
  .refine((r) => r.startDate <= r.endDate, 'End date must not be before start date');

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1f4d3a');

export const FONT_CHOICES = ['instrument', 'fraunces', 'bricolage', 'plex'] as const;

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(100),
  tagline: optionalText(200),
  logoUrl: z.union([z.literal(''), z.url().max(500)]).default(''),
  contactEmail: z.union([z.literal(''), z.email()]).default(''),
  contactPhone: optionalText(30),
  notificationEmail: z.union([z.literal(''), z.email()]).default(''),
  timezone: z.string().refine(isValidTimezone, 'Unknown timezone'),
  locale: z.string().trim().min(2).max(20).refine(isValidLocale, 'Unknown locale'),
  currency: z.string().trim().toUpperCase().refine(isValidCurrency, 'Use a 3-letter ISO currency code'),
  colorAccent: hexColor,
  colorBackground: hexColor,
  colorText: hexColor,
  fontFamily: z.enum(FONT_CHOICES),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(240),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  minNoticeHours: z.coerce.number().int().min(0).max(24 * 30),
  maxAdvanceDays: z.coerce.number().int().min(1).max(730),
  requireApproval: z.coerce.boolean(),
  showPoweredBy: z.coerce.boolean(),
  bookingPolicy: optionalText(2000),
});

export const setupSchema = z.object({
  businessName: z.string().trim().min(1).max(100),
  timezone: z.string().refine(isValidTimezone, 'Unknown timezone'),
  currency: z.string().trim().toUpperCase().refine(isValidCurrency, 'Use a 3-letter ISO currency code'),
  name: z.string().trim().max(100).default(''),
  email: emailField(),
  password: z.string().min(12, 'Use at least 12 characters').max(200),
  setupToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailField(),
  password: z.string().min(1).max(200),
});

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function isValidLocale(locale: string): boolean {
  try {
    return Intl.getCanonicalLocales(locale).length > 0;
  } catch {
    return false;
  }
}

function isValidCurrency(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
}

/** First message per field, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    out[key] ??= issue.message;
  }
  return out;
}
