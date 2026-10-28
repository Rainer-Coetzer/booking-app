'use server';

import { redirect } from 'next/navigation';
import { completeSetup } from '@/server/auth';
import { getDb } from '@/server/db/client';
import { availabilityRules, services } from '@/server/db/schema';
import { fieldErrors, setupSchema } from '@/server/validation';

export interface FormState {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
}

export async function setup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = setupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const values = Object.fromEntries(form) as Record<string, string>;
    delete values.password;
    return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values };
  }

  const result = await completeSetup(parsed.data);
  if (!result.ok) return { error: result.error };

  // A starting point the owner will edit: one service and weekday hours.
  const db = getDb();
  db.insert(services).values({ name: 'Consultation', durationMinutes: 60, description: '' }).run();
  db.insert(availabilityRules)
    .values([1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '17:00' })))
    .run();

  redirect('/admin?welcome=1');
}
