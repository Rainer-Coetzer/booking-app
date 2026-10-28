import { describe, expect, it } from 'vitest';
import { dayOfWeek, getSlots, localDate, parseDate, zonedInstant, type SlotQuery } from '@/lib/availability';

const MIN = 60_000;
const HOUR = 60 * MIN;

// Monday 2 March 2026, 06:00 UTC.
const NOW = Date.UTC(2026, 2, 2, 6, 0);

function query(overrides: Partial<SlotQuery> = {}): SlotQuery {
  return {
    date: '2026-03-04', // Wednesday
    timezone: 'UTC',
    rules: [{ dayOfWeek: 3, startTime: '09:00', endTime: '12:00' }],
    timeOff: [],
    busy: [],
    durationMinutes: 60,
    intervalMinutes: 30,
    bufferMinutes: 0,
    minNoticeHours: 0,
    maxAdvanceDays: 60,
    now: NOW,
    ...overrides,
  };
}

const starts = (q: SlotQuery) => getSlots(q).map((s) => s.start.slice(11, 16));

describe('calendar helpers', () => {
  it('rejects impossible dates', () => {
    expect(parseDate('2026-02-30')).toBeNull();
    expect(parseDate('2026-2-3')).toBeNull();
    expect(parseDate('2026-02-28')).not.toBeNull();
  });

  it('computes weekday without a timezone', () => {
    expect(dayOfWeek('2026-03-04')).toBe(3);
    expect(dayOfWeek('2026-03-01')).toBe(0);
  });

  it('places wall-clock times in the business timezone', () => {
    expect(new Date(zonedInstant('2026-07-01', 9 * 60, 'Africa/Windhoek')).toISOString()).toBe('2026-07-01T07:00:00.000Z');
    expect(new Date(zonedInstant('2026-07-01', 9 * 60, 'America/New_York')).toISOString()).toBe('2026-07-01T13:00:00.000Z');
  });

  it('reads the local date of an instant', () => {
    expect(localDate(Date.UTC(2026, 0, 1, 23, 30), 'Asia/Tokyo')).toBe('2026-01-02');
  });
});

describe('getSlots', () => {
  it('steps by the interval and stops when the service no longer fits', () => {
    expect(starts(query())).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
  });

  it('respects service duration', () => {
    expect(starts(query({ durationMinutes: 120 }))).toEqual(['09:00', '09:30', '10:00']);
  });

  it('supports several ranges in a day', () => {
    const rules = [
      { dayOfWeek: 3, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 3, startTime: '13:00', endTime: '15:00' },
    ];
    expect(starts(query({ rules, intervalMinutes: 60 }))).toEqual(['09:00', '10:00', '13:00', '14:00']);
  });

  it('is empty on closed days and time off', () => {
    expect(getSlots(query({ date: '2026-03-05' }))).toEqual([]);
    expect(getSlots(query({ timeOff: [{ startDate: '2026-03-03', endDate: '2026-03-06' }] }))).toEqual([]);
  });

  it('removes slots that overlap existing bookings', () => {
    const busy = [{ start: Date.UTC(2026, 2, 4, 10, 0), end: Date.UTC(2026, 2, 4, 11, 0) }];
    expect(starts(query({ busy }))).toEqual(['09:00', '11:00']);
  });

  it('keeps the buffer clear on both sides of a booking', () => {
    const busy = [{ start: Date.UTC(2026, 2, 4, 10, 0), end: Date.UTC(2026, 2, 4, 11, 0) }];
    expect(starts(query({ busy, bufferMinutes: 30 }))).toEqual([]);
    expect(starts(query({ busy, bufferMinutes: 30, rules: [{ dayOfWeek: 3, startTime: '08:00', endTime: '13:00' }] }))).toEqual([
      '08:00',
      '08:30', // ends 09:30; with the buffer it reaches exactly 10:00
      '11:30',
      '12:00',
    ]);
  });

  it('applies minimum notice', () => {
    const now = Date.UTC(2026, 2, 4, 8, 15);
    expect(starts(query({ now, minNoticeHours: 2 }))).toEqual(['10:30', '11:00']);
  });

  it('never offers past days or days beyond the window', () => {
    expect(getSlots(query({ now: Date.UTC(2026, 2, 5, 0, 0) }))).toEqual([]);
    expect(getSlots(query({ maxAdvanceDays: 1 }))).toEqual([]);
  });

  it('handles the spring-forward gap in Europe/London', () => {
    // 29 March 2026: clocks jump from 01:00 to 02:00 local time.
    const q = query({
      date: '2026-03-29',
      timezone: 'Europe/London',
      rules: [{ dayOfWeek: 0, startTime: '00:00', endTime: '04:00' }],
      intervalMinutes: 60,
      now: Date.UTC(2026, 2, 20),
    });
    const slots = getSlots(q).map((s) => s.start);
    expect(new Set(slots).size).toBe(slots.length);
    // A 60-minute service measured in real time, never 0 or 120 minutes.
    for (const s of getSlots(q)) expect(Date.parse(s.end) - Date.parse(s.start)).toBe(HOUR);
    expect(slots[0]).toBe('2026-03-29T00:00:00.000Z');
  });

  it('handles the autumn fall-back in Europe/London', () => {
    // 25 October 2026: 01:00 to 02:00 local happens twice.
    const q = query({
      date: '2026-10-25',
      timezone: 'Europe/London',
      rules: [{ dayOfWeek: 0, startTime: '09:00', endTime: '11:00' }],
      intervalMinutes: 60,
      now: Date.UTC(2026, 9, 20),
    });
    expect(getSlots(q).map((s) => s.start)).toEqual(['2026-10-25T09:00:00.000Z', '2026-10-25T10:00:00.000Z']);
  });
});
