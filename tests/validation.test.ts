import { describe, expect, it } from 'vitest';
import { publicBookingSchema, settingsSchema } from '@/server/validation';
import { contrast } from '@/lib/color';

const booking = { serviceId: 1, name: 'Ada', email: ' ADA@Example.com ', phone: '+264 81 123 4567', start: '2026-03-04T10:00:00.000Z' };

describe('validation', () => {
  it('normalises email and accepts international phone formats', () => {
    const parsed = publicBookingSchema.parse(booking);
    expect(parsed.email).toBe('ada@example.com');
  });

  it('rejects junk phone numbers and filled honeypots', () => {
    expect(publicBookingSchema.safeParse({ ...booking, phone: 'call me' }).success).toBe(false);
    expect(publicBookingSchema.safeParse({ ...booking, website: 'spam.example' }).success).toBe(false);
  });

  it('rejects unknown timezones and currencies', () => {
    const base = {
      businessName: 'X',
      timezone: 'Mars/Olympus',
      locale: 'en',
      currency: 'usd',
      colorAccent: '#000000',
      colorBackground: '#ffffff',
      colorText: '#000000',
      fontFamily: 'instrument',
      slotIntervalMinutes: 30,
      bufferMinutes: 0,
      minNoticeHours: 0,
      maxAdvanceDays: 30,
      requireApproval: true,
      showPoweredBy: false,
    };
    const result = settingsSchema.safeParse(base);
    expect(result.success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, timezone: 'Africa/Windhoek' }).data?.currency).toBe('USD');
  });

  it('measures contrast like WCAG', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#ffffff')).toBeLessThan(4.5);
  });
});
