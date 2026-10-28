'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { changePassword as changeAdminPassword, login, logout, requireAdmin } from '@/server/auth';
import {
  anonymise,
  BookingError,
  createAdminBooking,
  getBooking,
  schedule,
  setStatus,
} from '@/server/bookings';
import { afterBookingChange } from '@/server/effects';
import { getDb } from '@/server/db/client';
import { availabilityRules, services, timeOff } from '@/server/db/schema';
import { requireSettings, updateSettings } from '@/server/settings';
import { disconnect, setCalendarId } from '@/server/google-calendar';
import { getMailer } from '@/server/email/mailer';
import {
  adminBookingSchema,
  fieldErrors,
  loginSchema,
  rescheduleSchema,
  ruleSchema,
  serviceSchema,
  settingsSchema,
  statusSchema,
  timeOffSchema,
} from '@/server/validation';
import { contrast } from '@/lib/color';
import { parsePriceToCents } from '@/lib/format';

export interface FormState {
  ok?: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
  /** Echoed back on failure so the form can restore what was typed. */
  values?: Record<string, string>;
}

const formObject = (form: FormData) => Object.fromEntries([...form.keys()].map((k) => [k, form.get(k)]));
const formValues = (form: FormData) =>
  Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>;
const refresh = () => revalidatePath('/admin', 'layout');

function failure(err: unknown, form?: FormData): FormState {
  if (err instanceof BookingError) return { error: err.message, values: form ? formValues(form) : undefined };
  throw err;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: 'Enter your email and password.' };
  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: result.error };
  redirect('/admin');
}

export async function signOut() {
  await logout();
  redirect('/admin/login');
}

export async function setBookingStatus(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: 'Unknown action.' };
  try {
    const { before, after: updated } = setStatus(parsed.data.id, parsed.data.status);
    after(() => afterBookingChange(before, updated));
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true };
}

export async function scheduleBooking(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = formObject(form);
  const parsed = rescheduleSchema.safeParse({ ...raw, durationMinutes: raw.durationMinutes || undefined });
  if (!parsed.success) return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values: formValues(form) };
  try {
    const { before, after: updated } = schedule(parsed.data.id, parsed.data.date, parsed.data.time, parsed.data.durationMinutes);
    after(() => afterBookingChange(before, updated));
  } catch (err) {
    return failure(err, form);
  }
  refresh();
  return { ok: true, message: 'Booking scheduled. The customer has been emailed.' };
}

export async function createBooking(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = adminBookingSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values: formValues(form) };
  try {
    const { booking } = createAdminBooking(parsed.data);
    after(() => afterBookingChange(null, booking));
  } catch (err) {
    return failure(err, form);
  }
  refresh();
  redirect('/admin/bookings');
}

export async function eraseBooking(form: FormData) {
  await requireAdmin();
  const id = Number(form.get('id'));
  const booking = getBooking(id);
  if (!booking) return;
  if (booking.status === 'confirmed' || booking.status === 'pending') {
    const { before, after: updated } = setStatus(id, 'cancelled');
    await afterBookingChange(before, updated);
  }
  anonymise(id);
  refresh();
}

export async function saveService(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = formObject(form);
  const parsed = serviceSchema.safeParse({
    ...raw,
    requiresQuote: raw.requiresQuote === 'on',
    active: raw.active === 'on',
  });
  if (!parsed.success) return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values: formValues(form) };
  const { price, ...rest } = parsed.data;
  const values = { ...rest, priceCents: parsePriceToCents(price) };
  const id = Number(raw.id) || null;
  const db = getDb();
  if (id) db.update(services).set(values).where(eq(services.id, id)).run();
  else db.insert(services).values(values).run();
  refresh();
  return { ok: true, message: id ? 'Service updated.' : 'Service added.' };
}

export async function deleteService(form: FormData) {
  await requireAdmin();
  // Past bookings keep their own copy of the service name and price, so deleting is safe.
  getDb().delete(services).where(eq(services.id, Number(form.get('id')))).run();
  refresh();
}

export async function saveAvailability(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const rules = z.array(ruleSchema).safeParse(JSON.parse(String(form.get('rules') ?? '[]')));
  if (!rules.success) return { error: rules.error.issues[0]?.message ?? 'Check the times.' };

  for (let day = 0; day < 7; day++) {
    const ranges = rules.data.filter((r) => r.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].startTime < ranges[i - 1].endTime) return { error: 'Two time ranges on the same day overlap.' };
    }
  }

  getDb().transaction((tx) => {
    tx.delete(availabilityRules).run();
    if (rules.data.length) tx.insert(availabilityRules).values(rules.data).run();
  });
  refresh();
  return { ok: true, message: 'Hours saved.' };
}

export async function addTimeOff(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = formObject(form);
  const parsed = timeOffSchema.safeParse({ ...raw, endDate: raw.endDate || raw.startDate });
  if (!parsed.success) return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values: formValues(form) };
  getDb().insert(timeOff).values(parsed.data).run();
  refresh();
  return { ok: true };
}

export async function removeTimeOff(form: FormData) {
  await requireAdmin();
  getDb().delete(timeOff).where(eq(timeOff.id, Number(form.get('id')))).run();
  refresh();
}

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = formObject(form);
  const parsed = settingsSchema.safeParse({
    ...raw,
    requireApproval: raw.requireApproval === 'on',
    showPoweredBy: raw.showPoweredBy === 'on',
  });
  if (!parsed.success) return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values: formValues(form) };

  // Brand colours are the owner's call, but unreadable text is not.
  const ratio = contrast(parsed.data.colorText, parsed.data.colorBackground);
  if (ratio < 4.5) {
    return {
      error: `Text on background has a contrast of ${ratio.toFixed(1)}:1. It needs at least 4.5:1 to be readable.`,
      fields: { colorText: 'Too close to the background colour' },
      values: formValues(form),
    };
  }
  updateSettings(parsed.data);
  refresh();
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Settings saved.' };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const next = String(form.get('next') ?? '');
  if (next.length < 12) return { fields: { next: 'Use at least 12 characters' } };
  const ok = await changeAdminPassword(admin.id, String(form.get('current') ?? ''), next);
  return ok ? { ok: true, message: 'Password changed. Other devices have been signed out.' } : { fields: { current: 'Incorrect password' } };
}

export async function chooseCalendar(form: FormData) {
  await requireAdmin();
  setCalendarId(String(form.get('calendarId') ?? 'primary'));
  refresh();
}

export async function disconnectGoogle() {
  await requireAdmin();
  disconnect();
  refresh();
}

export async function sendTestEmail(): Promise<FormState> {
  const admin = await requireAdmin();
  const s = requireSettings();
  const to = s.notificationEmail || admin.email;
  try {
    await getMailer().send({
      to,
      subject: `Test email from ${s.businessName}`,
      text: 'If you can read this, booking emails will reach your customers.',
      html: '<p>If you can read this, booking emails will reach your customers.</p>',
    });
    return { ok: true, message: `Sent to ${to} using the ${getMailer().name} provider.` };
  } catch (err) {
    return { error: `Sending failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
