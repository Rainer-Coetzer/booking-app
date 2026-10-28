import { TZDate } from '@date-fns/tz';

export interface Rule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface Interval {
  start: number;
  end: number;
}

export interface SlotQuery {
  date: string;
  timezone: string;
  rules: Rule[];
  timeOff: DateRange[];
  busy: Interval[];
  durationMinutes: number;
  intervalMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  now: number;
}

export interface Slot {
  start: string;
  end: string;
}

const MINUTE = 60_000;

export function parseDate(date: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** Weekday of a calendar date, independent of any timezone. */
export function dayOfWeek(date: string): number {
  const p = parseDate(date);
  if (!p) throw new Error(`Invalid date: ${date}`);
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** The UTC instant of a wall-clock time on a calendar date in `timezone`. */
export function zonedInstant(date: string, minutes: number, timezone: string): number {
  const p = parseDate(date);
  if (!p) throw new Error(`Invalid date: ${date}`);
  return new TZDate(p.y, p.m - 1, p.d, Math.floor(minutes / 60), minutes % 60, timezone).getTime();
}

export function localDate(instant: number, timezone: string): string {
  const z = new TZDate(instant, timezone);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
  const p = parseDate(date);
  if (!p) throw new Error(`Invalid date: ${date}`);
  return new Date(Date.UTC(p.y, p.m - 1, p.d + days)).toISOString().slice(0, 10);
}

export function isInTimeOff(date: string, timeOff: DateRange[]): boolean {
  return timeOff.some((r) => date >= r.startDate && date <= r.endDate);
}

/** Whether `date` is inside the bookable window: not before today, not past the advance limit. */
export function isWithinWindow(date: string, timezone: string, maxAdvanceDays: number, now: number): boolean {
  const today = localDate(now, timezone);
  return date >= today && date <= addDays(today, maxAdvanceDays);
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function conflictsWithBusy(candidate: Interval, busy: Interval[], bufferMinutes: number): boolean {
  const padded = { start: candidate.start - bufferMinutes * MINUTE, end: candidate.end + bufferMinutes * MINUTE };
  return busy.some((b) => overlaps(padded, b));
}

/**
 * Every bookable start time on `date`.
 *
 * Slots step through wall-clock time from each rule's start, so a 09:00–17:00
 * rule offers 09:00, 09:30, … on DST change days too. A slot is offered only if
 * the whole service, measured in real elapsed time, fits before the rule ends.
 */
export function getSlots(q: SlotQuery): Slot[] {
  if (!parseDate(q.date)) return [];
  if (!isWithinWindow(q.date, q.timezone, q.maxAdvanceDays, q.now)) return [];
  if (isInTimeOff(q.date, q.timeOff)) return [];

  const weekday = dayOfWeek(q.date);
  const earliest = q.now + q.minNoticeHours * 60 * MINUTE;
  const seen = new Set<number>();
  const slots: Slot[] = [];

  const rules = q.rules.filter((r) => r.dayOfWeek === weekday).sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (const rule of rules) {
    const ruleEnd = zonedInstant(q.date, toMinutes(rule.endTime), q.timezone);
    for (let m = toMinutes(rule.startTime); m < toMinutes(rule.endTime); m += q.intervalMinutes) {
      const start = zonedInstant(q.date, m, q.timezone);
      const end = start + q.durationMinutes * MINUTE;
      if (end > ruleEnd) break;
      if (start < earliest || seen.has(start)) continue;
      if (conflictsWithBusy({ start, end }, q.busy, q.bufferMinutes)) continue;
      seen.add(start);
      slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return slots;
}
