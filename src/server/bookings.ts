import 'server-only';
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { getDb } from './db/client';
import { ACTIVE_STATUSES, bookings, type Booking, type BookingStatus } from './db/schema';
import { getSlots, localDate, zonedInstant, toMinutes, conflictsWithBusy, addDays, type Interval } from '@/lib/availability';
import { getService, listRules, listTimeOff, requireSettings } from './settings';
import { decrypt, encrypt, randomToken, sha256 } from './crypto';
import { TRANSITIONS } from '@/lib/status';

export class BookingError extends Error {
  constructor(
    public code: 'not_found' | 'unavailable' | 'invalid' | 'conflict',
    message: string,
  ) {
    super(message);
  }
}

function tokenColumns(token: string) {
  return { manageTokenHash: sha256(token), manageTokenEnc: encrypt(token) };
}

export function manageTokenOf(booking: Booking): string {
  return decrypt(booking.manageTokenEnc);
}

const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/** Active bookings overlapping [from, to), excluding `exceptId`. */
function busyIntervals(from: number, to: number, exceptId?: number): Interval[] {
  const rows = getDb()
    .select({ id: bookings.id, startAt: bookings.startAt, endAt: bookings.endAt })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ACTIVE_STATUSES),
        isNotNull(bookings.startAt),
        lt(bookings.startAt, new Date(to).toISOString()),
        gt(bookings.endAt, new Date(from).toISOString()),
      ),
    )
    .all();
  return rows
    .filter((r) => r.id !== exceptId)
    .map((r) => ({ start: Date.parse(r.startAt!), end: Date.parse(r.endAt!) }));
}

/** Open slots for a service on a business-local date. */
export function slotsFor(serviceId: number, date: string, now = Date.now()) {
  const s = requireSettings();
  const service = getService(serviceId);
  if (!service || !service.active || service.requiresQuote) return [];

  const dayStart = zonedInstant(date, 0, s.timezone);
  const dayEnd = zonedInstant(addDays(date, 1), 0, s.timezone);
  const pad = s.bufferMinutes * 60_000;

  return getSlots({
    date,
    timezone: s.timezone,
    rules: listRules(),
    timeOff: listTimeOff(),
    busy: busyIntervals(dayStart - pad, dayEnd + pad),
    durationMinutes: service.durationMinutes,
    intervalMinutes: s.slotIntervalMinutes,
    bufferMinutes: s.bufferMinutes,
    minNoticeHours: s.minNoticeHours,
    maxAdvanceDays: s.maxAdvanceDays,
    now,
  });
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  location: string;
  notes: string;
}

export interface CreatedBooking {
  booking: Booking;
  manageToken: string;
}

/**
 * Public booking. For timed services the requested start must be one of the
 * slots the engine offers right now, which re-checks hours, notice, time off and
 * existing bookings. The check and insert share an IMMEDIATE transaction, so two
 * requests for the same slot cannot both pass the check.
 */
export function createPublicBooking(
  input: CustomerInput & { serviceId: number; start?: string; preferredDate?: string },
  now = Date.now(),
): CreatedBooking {
  const s = requireSettings();
  const service = getService(input.serviceId);
  if (!service || !service.active) throw new BookingError('not_found', 'That service is not available.');

  const manageToken = randomToken();
  const base = {
    serviceId: service.id,
    serviceName: service.name,
    priceCents: service.priceCents,
    customerName: input.name,
    customerEmail: input.email,
    customerPhone: input.phone,
    location: input.location,
    notes: input.notes,
    ...tokenColumns(manageToken),
  };

  if (service.requiresQuote) {
    if (!input.preferredDate) throw new BookingError('invalid', 'Choose a preferred date.');
    const booking = getDb()
      .insert(bookings)
      .values({ ...base, preferredDate: input.preferredDate, status: 'quote_requested' })
      .returning()
      .get();
    return { booking, manageToken };
  }

  if (!input.start) throw new BookingError('invalid', 'Choose a time.');
  const start = new Date(input.start).toISOString();

  const booking = getDb().transaction(
    (tx) => {
      const offered = slotsFor(service.id, localDate(Date.parse(start), s.timezone), now);
      const slot = offered.find((o) => o.start === start);
      if (!slot) throw new BookingError('unavailable', 'That time has just been taken. Pick another one.');
      return tx
        .insert(bookings)
        .values({
          ...base,
          startAt: slot.start,
          endAt: slot.end,
          status: s.requireApproval ? 'pending' : 'confirmed',
        })
        .returning()
        .get();
    },
    { behavior: 'immediate' },
  );
  return { booking, manageToken };
}

/**
 * Admin-placed time. Admins may book outside opening hours, but never on top of
 * another active booking.
 */
function assertFree(startMs: number, endMs: number, exceptId?: number) {
  const { bufferMinutes } = requireSettings();
  const pad = bufferMinutes * 60_000;
  const busy = busyIntervals(startMs - pad, endMs + pad, exceptId);
  if (conflictsWithBusy({ start: startMs, end: endMs }, busy, bufferMinutes)) {
    throw new BookingError('conflict', 'That time overlaps another booking.');
  }
}

export function createAdminBooking(
  input: CustomerInput & { serviceId: number; date: string; time: string },
): CreatedBooking {
  const s = requireSettings();
  const service = getService(input.serviceId);
  if (!service) throw new BookingError('not_found', 'Service not found.');
  const startMs = zonedInstant(input.date, toMinutes(input.time), s.timezone);
  const endMs = startMs + service.durationMinutes * 60_000;
  const manageToken = randomToken();

  const booking = getDb().transaction(
    (tx) => {
      assertFree(startMs, endMs);
      return tx
        .insert(bookings)
        .values({
          serviceId: service.id,
          serviceName: service.name,
          priceCents: service.priceCents,
          customerName: input.name,
          customerEmail: input.email,
          customerPhone: input.phone,
          location: input.location,
          notes: input.notes,
          startAt: new Date(startMs).toISOString(),
          endAt: new Date(endMs).toISOString(),
          status: 'confirmed',
          ...tokenColumns(manageToken),
        })
        .returning()
        .get();
    },
    { behavior: 'immediate' },
  );
  return { booking, manageToken };
}

export function getBooking(id: number): Booking | null {
  return getDb().select().from(bookings).where(eq(bookings.id, id)).get() ?? null;
}

export function getBookingByToken(token: string): Booking | null {
  return getDb().select().from(bookings).where(eq(bookings.manageTokenHash, sha256(token))).get() ?? null;
}

export function setStatus(id: number, status: BookingStatus): { before: Booking; after: Booking } {
  const before = getBooking(id);
  if (!before) throw new BookingError('not_found', 'Booking not found.');
  if (!TRANSITIONS[before.status].includes(status)) {
    throw new BookingError('invalid', `A ${before.status.replace('_', ' ')} booking cannot become ${status}.`);
  }
  const after = getDb()
    .update(bookings)
    .set({ status, updatedAt: nowSql })
    .where(eq(bookings.id, id))
    .returning()
    .get();
  return { before, after };
}

/** Moves a booking, or gives a quote request its first time. Either way it ends up confirmed. */
export function schedule(
  id: number,
  date: string,
  time: string,
  durationMinutes?: number,
): { before: Booking; after: Booking } {
  const s = requireSettings();
  return getDb().transaction(
    (tx) => {
      const before = getBooking(id);
      if (!before) throw new BookingError('not_found', 'Booking not found.');
      if (!['pending', 'confirmed', 'quote_requested'].includes(before.status)) {
        throw new BookingError('invalid', 'Only open bookings can be rescheduled.');
      }
      const previousLength =
        before.startAt && before.endAt ? (Date.parse(before.endAt) - Date.parse(before.startAt)) / 60_000 : undefined;
      const minutes = durationMinutes ?? previousLength ?? getService(before.serviceId ?? 0)?.durationMinutes ?? 60;

      const startMs = zonedInstant(date, toMinutes(time), s.timezone);
      const endMs = startMs + minutes * 60_000;
      assertFree(startMs, endMs, id);

      const after = tx
        .update(bookings)
        .set({
          startAt: new Date(startMs).toISOString(),
          endAt: new Date(endMs).toISOString(),
          status: 'confirmed',
          updatedAt: nowSql,
        })
        .where(eq(bookings.id, id))
        .returning()
        .get();
      return { before, after };
    },
    { behavior: 'immediate' },
  );
}

export function isCustomerCancellable(booking: Booking, now = Date.now()): boolean {
  return (
    ['pending', 'confirmed', 'quote_requested'].includes(booking.status) &&
    (!booking.startAt || Date.parse(booking.startAt) > now)
  );
}

export function cancelByToken(token: string, now = Date.now()): { before: Booking; after: Booking } {
  const booking = getBookingByToken(token);
  if (!booking) throw new BookingError('not_found', 'Booking not found.');
  if (booking.startAt && Date.parse(booking.startAt) <= now) {
    throw new BookingError('invalid', 'This booking has already started.');
  }
  return setStatus(booking.id, 'cancelled');
}

export function setGoogleEventId(id: number, eventId: string | null) {
  getDb().update(bookings).set({ googleEventId: eventId }).where(eq(bookings.id, id)).run();
}

/**
 * Right-to-erasure: strip personal data but keep the row, so reporting and
 * slot history stay intact.
 */
export function anonymise(id: number) {
  getDb()
    .update(bookings)
    .set({
      customerName: 'Erased',
      customerEmail: 'erased@invalid',
      customerPhone: '',
      location: '',
      notes: '',
      updatedAt: nowSql,
    })
    .where(eq(bookings.id, id))
    .run();
}

export function listBookings({ status, limit = 100, offset = 0 }: { status?: BookingStatus; limit?: number; offset?: number }) {
  const db = getDb();
  const where = status ? eq(bookings.status, status) : undefined;
  const rows = db
    .select()
    .from(bookings)
    .where(where)
    .orderBy(desc(sql`coalesce(${bookings.startAt}, ${bookings.preferredDate})`), desc(bookings.id))
    .limit(limit)
    .offset(offset)
    .all();
  const total = db.select({ n: sql<number>`count(*)` }).from(bookings).where(where).get()?.n ?? 0;
  return { rows, total };
}

export function upcoming(days: number, now = Date.now()) {
  return getDb()
    .select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ACTIVE_STATUSES),
        gt(bookings.endAt, new Date(now).toISOString()),
        lt(bookings.startAt, new Date(now + days * 86_400_000).toISOString()),
      ),
    )
    .orderBy(asc(bookings.startAt))
    .all();
}

export function stats(now = Date.now()) {
  const s = requireSettings();
  const db = getDb();
  const count = (status: BookingStatus) =>
    db.select({ n: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, status)).get()?.n ?? 0;
  const today = localDate(now, s.timezone);
  const todayStart = new Date(zonedInstant(today, 0, s.timezone)).toISOString();
  const todayEnd = new Date(zonedInstant(addDays(today, 1), 0, s.timezone)).toISOString();
  const todayCount =
    db
      .select({ n: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(inArray(bookings.status, ACTIVE_STATUSES), gte(bookings.startAt, todayStart), lt(bookings.startAt, todayEnd)),
      )
      .get()?.n ?? 0;
  return {
    today: todayCount,
    pending: count('pending'),
    quotes: count('quote_requested'),
    confirmed: count('confirmed'),
  };
}
