import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, setDb, type DB } from '@/server/db/client';
import { availabilityRules, services, settings } from '@/server/db/schema';
import {
  BookingError,
  cancelByToken,
  createAdminBooking,
  createPublicBooking,
  getBookingByToken,
  schedule,
  setStatus,
  slotsFor,
} from '@/server/bookings';

const customer = { name: 'Ada Lovelace', email: 'ada@example.com', phone: '+1 555 0100', location: '', notes: '' };
// Monday 2 March 2026, 06:00 UTC. Bookings below are for Wednesday 4 March.
const NOW = Date.UTC(2026, 2, 2, 6, 0);
let db: DB;
let timed: number;
let quote: number;

beforeEach(() => {
  db = openDatabase(':memory:');
  setDb(db);
  db.insert(settings).values({ id: 1, businessName: 'Test Studio', timezone: 'UTC', currency: 'USD', minNoticeHours: 0, requireApproval: true }).run();
  timed = db.insert(services).values({ name: 'Session', durationMinutes: 60, priceCents: 5000 }).returning().get().id;
  quote = db.insert(services).values({ name: 'Event', durationMinutes: 240, requiresQuote: true }).returning().get().id;
  db.insert(availabilityRules).values({ dayOfWeek: 3, startTime: '09:00', endTime: '12:00' }).run();
});

const at = (hhmm: string) => `2026-03-04T${hhmm}:00.000Z`;

function expectError(fn: () => unknown, code: BookingError['code']) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(BookingError);
    expect((err as BookingError).code).toBe(code);
    return;
  }
  throw new Error(`Expected BookingError(${code})`);
}

describe('public bookings', () => {
  it('books an offered slot as pending when approval is required', () => {
    const { booking, manageToken } = createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW);
    expect(booking.status).toBe('pending');
    expect(booking.endAt).toBe(at('11:00'));
    expect(booking.serviceName).toBe('Session');
    expect(booking.priceCents).toBe(5000);
    expect(getBookingByToken(manageToken)?.id).toBe(booking.id);
  });

  it('confirms instantly when approval is off', () => {
    db.update(settings).set({ requireApproval: false }).run();
    expect(createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW).booking.status).toBe('confirmed');
  });

  it('refuses the same slot twice', () => {
    createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW);
    expectError(() => createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW), 'unavailable');
  });

  it('refuses a slot that overlaps an existing booking', () => {
    createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW);
    expectError(() => createPublicBooking({ ...customer, serviceId: timed, start: at('10:30') }, NOW), 'unavailable');
    expect(slotsFor(timed, '2026-03-04', NOW).map((s) => s.start)).toEqual([at('09:00'), at('11:00')]);
  });

  it('refuses times outside the offered grid', () => {
    expectError(() => createPublicBooking({ ...customer, serviceId: timed, start: at('09:10') }, NOW), 'unavailable');
    expectError(() => createPublicBooking({ ...customer, serviceId: timed, start: at('11:30') }, NOW), 'unavailable');
  });

  it('frees the slot again after a decline', () => {
    const { booking } = createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW);
    setStatus(booking.id, 'declined');
    expect(createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW).booking.status).toBe('pending');
  });

  it('stores a quote request with a preferred date and no time', () => {
    const { booking } = createPublicBooking({ ...customer, serviceId: quote, preferredDate: '2026-03-07' }, NOW);
    expect(booking.status).toBe('quote_requested');
    expect(booking.startAt).toBeNull();
    expect(booking.preferredDate).toBe('2026-03-07');
  });
});

describe('admin changes', () => {
  it('enforces status transitions', () => {
    const { booking } = createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW);
    setStatus(booking.id, 'cancelled');
    expectError(() => setStatus(booking.id, 'confirmed'), 'invalid');
  });

  it('schedules a quote request, confirming it', () => {
    const { booking } = createPublicBooking({ ...customer, serviceId: quote, preferredDate: '2026-03-07' }, NOW);
    const { after } = schedule(booking.id, '2026-03-07', '14:00');
    expect(after.status).toBe('confirmed');
    expect(after.startAt).toBe('2026-03-07T14:00:00.000Z');
    expect(after.endAt).toBe('2026-03-07T18:00:00.000Z');
  });

  it('lets admins book outside opening hours but never over another booking', () => {
    createAdminBooking({ ...customer, serviceId: timed, date: '2026-03-04', time: '18:00' });
    expectError(() => createAdminBooking({ ...customer, serviceId: timed, date: '2026-03-04', time: '18:30' }), 'conflict');
  });

  it('does not count a booking as conflicting with itself when moved', () => {
    const { booking } = createAdminBooking({ ...customer, serviceId: timed, date: '2026-03-04', time: '10:00' });
    expect(schedule(booking.id, '2026-03-04', '10:30').after.startAt).toBe(at('10:30'));
  });
});

describe('customer cancellation', () => {
  it('cancels with the manage token', () => {
    const { manageToken } = createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW);
    expect(cancelByToken(manageToken, NOW).after.status).toBe('cancelled');
  });

  it('refuses once the booking has started', () => {
    const { manageToken } = createPublicBooking({ ...customer, serviceId: timed, start: at('10:00') }, NOW);
    expectError(() => cancelByToken(manageToken, Date.parse(at('10:05'))), 'invalid');
  });

  it('does not find bookings with a wrong token', () => {
    expectError(() => cancelByToken('not-a-token'), 'not_found');
  });
});
