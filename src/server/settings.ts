import 'server-only';
import { asc, eq, gte, sql } from 'drizzle-orm';
import { getDb } from './db/client';
import { availabilityRules, services, settings, timeOff, type Settings } from './db/schema';
import { localDate } from '@/lib/availability';

export function getSettings(): Settings | null {
  return getDb().select().from(settings).where(eq(settings.id, 1)).get() ?? null;
}

export function requireSettings(): Settings {
  const s = getSettings();
  if (!s) throw new Error('Setup has not been completed');
  return s;
}

export function updateSettings(values: Partial<Omit<Settings, 'id' | 'updatedAt'>>) {
  getDb()
    .update(settings)
    .set({ ...values, updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` })
    .where(eq(settings.id, 1))
    .run();
}

/** Today's date where the business is. */
export function businessToday(): string {
  return localDate(Date.now(), requireSettings().timezone);
}

export function listServices({ includeInactive = false } = {}) {
  const q = getDb().select().from(services);
  return (includeInactive ? q : q.where(eq(services.active, true)))
    .orderBy(asc(services.sortOrder), asc(services.id))
    .all();
}

export function getService(id: number) {
  return getDb().select().from(services).where(eq(services.id, id)).get() ?? null;
}

export function listRules() {
  return getDb()
    .select()
    .from(availabilityRules)
    .orderBy(asc(availabilityRules.dayOfWeek), asc(availabilityRules.startTime))
    .all();
}

export function listTimeOff({ upcomingOnly = false, timezone }: { upcomingOnly?: boolean; timezone?: string } = {}) {
  const q = getDb().select().from(timeOff);
  const filtered = upcomingOnly && timezone ? q.where(gte(timeOff.endDate, localDate(Date.now(), timezone))) : q;
  return filtered.orderBy(asc(timeOff.startDate)).all();
}

/** Everything the public booking page needs, in one round trip. */
export function getPublicConfig() {
  const s = requireSettings();
  return {
    business: {
      name: s.businessName,
      tagline: s.tagline,
      logoUrl: s.logoUrl,
      coverImageUrl: s.coverImageUrl,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      bookingPolicy: s.bookingPolicy,
      showPoweredBy: s.showPoweredBy,
    },
    timezone: s.timezone,
    locale: s.locale,
    currency: s.currency,
    maxAdvanceDays: s.maxAdvanceDays,
    today: localDate(Date.now(), s.timezone),
    services: listServices().map((svc) => ({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      durationMinutes: svc.durationMinutes,
      priceCents: svc.priceCents,
      priceLabel: svc.priceLabel,
      requiresQuote: svc.requiresQuote,
    })),
    openWeekdays: [...new Set(listRules().map((r) => r.dayOfWeek))],
    timeOff: listTimeOff({ upcomingOnly: true, timezone: s.timezone }).map((t) => ({
      startDate: t.startDate,
      endDate: t.endDate,
    })),
  };
}

export type PublicConfig = ReturnType<typeof getPublicConfig>;
