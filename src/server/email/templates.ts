import type { Booking, Settings } from '../db/schema';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Message } from './mailer';

export type BookingEvent = 'received' | 'quote_received' | 'confirmed' | 'rescheduled' | 'declined' | 'cancelled';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function when(b: Booking, s: Settings) {
  if (b.startAt) return formatDateTime(b.startAt, s.timezone, s.locale);
  if (b.preferredDate) return `Preferred date: ${formatDate(b.preferredDate, s.locale)}`;
  return '';
}

const COPY: Record<BookingEvent, { subject: (b: Booking) => string; lead: string }> = {
  received: { subject: (b) => `Booking request received: ${b.serviceName}`, lead: "We've got your request and will confirm it shortly." },
  quote_received: { subject: (b) => `Quote request received: ${b.serviceName}`, lead: "Thanks for getting in touch. We'll reply with a quote and available times." },
  confirmed: { subject: (b) => `Confirmed: ${b.serviceName}`, lead: 'Your booking is confirmed. A calendar invite is attached.' },
  rescheduled: { subject: (b) => `New time for your ${b.serviceName}`, lead: 'Your booking has moved to a new time.' },
  declined: { subject: (b) => `About your ${b.serviceName} request`, lead: "Unfortunately we can't take this booking. Feel free to request another time." },
  cancelled: { subject: (b) => `Cancelled: ${b.serviceName}`, lead: 'This booking has been cancelled.' },
};

export function customerMessage(event: BookingEvent, b: Booking, s: Settings, manageUrl: string | null): Message {
  const copy = COPY[event];
  const lines = [
    `Hi ${b.customerName},`,
    '',
    copy.lead,
    '',
    `${b.serviceName}`,
    when(b, s),
    b.location ? `Location: ${b.location}` : null,
    manageUrl && event !== 'cancelled' && event !== 'declined' ? `View or cancel: ${manageUrl}` : null,
    '',
    s.businessName,
    [s.contactEmail, s.contactPhone].filter(Boolean).join(' · ') || null,
  ].filter((l): l is string => l !== null);

  const text = lines.join('\n');
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1c1b19;max-width:520px">${lines
    .map((l) => (l === '' ? '<br>' : `<div>${escapeHtml(l).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</div>`))
    .join('')}</div>`;

  return {
    to: b.customerEmail,
    subject: copy.subject(b),
    text,
    html,
    replyTo: s.contactEmail || undefined,
  };
}

export function ownerMessage(b: Booking, s: Settings, adminUrl: string): Message {
  const kind =
    b.status === 'cancelled'
      ? 'Cancelled by customer'
      : b.status === 'quote_requested'
        ? 'Quote request'
        : b.status === 'pending'
          ? 'Booking awaiting approval'
          : 'New booking';
  const text = [
    `${kind}: ${b.serviceName}`,
    when(b, s),
    '',
    `${b.customerName} <${b.customerEmail}>`,
    b.customerPhone || null,
    b.location ? `Location: ${b.location}` : null,
    b.notes ? `Notes: ${b.notes}` : null,
    '',
    `Manage: ${adminUrl}`,
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
  return {
    to: s.notificationEmail,
    subject: `${kind}: ${b.customerName}, ${b.serviceName}`,
    text,
    html: `<pre style="font-family:system-ui,sans-serif;font-size:15px">${escapeHtml(text)}</pre>`,
    replyTo: b.customerEmail,
  };
}

/** Minimal RFC 5545 event so the customer can add the booking to any calendar. */
export function icsFor(b: Booking, s: Settings, method: 'REQUEST' | 'CANCEL' = 'REQUEST'): string {
  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (v: string) => v.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//booking//EN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:booking-${b.id}@${(process.env.APP_URL ?? 'localhost').replace(/^https?:\/\//, '')}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.startAt!)}`,
    `DTEND:${stamp(b.endAt!)}`,
    `SUMMARY:${esc(`${b.serviceName} with ${s.businessName}`)}`,
    b.location ? `LOCATION:${esc(b.location)}` : '',
    method === 'CANCEL' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}
