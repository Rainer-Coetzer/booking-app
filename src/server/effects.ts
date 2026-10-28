import 'server-only';
import type { Booking } from './db/schema';
import { requireSettings } from './settings';
import { manageTokenOf, setGoogleEventId } from './bookings';
import { deleteEvent, upsertEvent } from './google-calendar';
import { getMailer, type Message } from './email/mailer';
import { customerMessage, icsFor, ownerMessage, type BookingEvent } from './email/templates';

/** Base URL for links in emails. APP_URL wins so links never point at an internal hostname. */
export function appUrl(fallbackOrigin?: string) {
  return (process.env.APP_URL || fallbackOrigin || 'http://localhost:3000').replace(/\/$/, '');
}

async function send(message: Message) {
  if (!message.to) return;
  try {
    await getMailer().send(message);
  } catch (err) {
    // Email failure must never undo a booking that has already been saved.
    console.error('[email] send failed', message.subject, err);
  }
}

async function syncCalendar(booking: Booking) {
  const active = booking.status === 'confirmed' && booking.startAt;
  if (active) {
    const eventId = await upsertEvent(booking);
    if (eventId && eventId !== booking.googleEventId) setGoogleEventId(booking.id, eventId);
  } else if (booking.googleEventId && ['cancelled', 'declined'].includes(booking.status)) {
    await deleteEvent(booking.googleEventId);
    setGoogleEventId(booking.id, null);
  }
}

function eventFor(before: Booking | null, after: Booking): BookingEvent | null {
  if (!before) {
    if (after.status === 'quote_requested') return 'quote_received';
    return after.status === 'confirmed' ? 'confirmed' : 'received';
  }
  if (after.status === 'cancelled' && before.status !== 'cancelled') return 'cancelled';
  if (after.status === 'declined') return 'declined';
  if (after.status === 'confirmed' && before.status !== 'confirmed') return 'confirmed';
  if (after.status === 'confirmed' && before.startAt !== after.startAt) return 'rescheduled';
  return null;
}

/**
 * Runs after a booking change has been committed: emails the customer (and the
 * owner, for new requests) and keeps Google Calendar in step. Each side effect
 * fails on its own without affecting the others.
 */
export async function afterBookingChange(
  before: Booking | null,
  after: Booking,
  opts: { origin?: string; byCustomer?: boolean } = {},
) {
  const s = requireSettings();
  const base = appUrl(opts.origin);
  const event = eventFor(before, after);
  const tasks: Promise<unknown>[] = [syncCalendar(after)];

  if (event) {
    const message = customerMessage(event, after, s, `${base}/manage/${manageTokenOf(after)}`);
    if ((event === 'confirmed' || event === 'rescheduled') && after.startAt) {
      message.attachments = [{ filename: 'booking.ics', content: icsFor(after, s), contentType: 'text/calendar; method=REQUEST' }];
    }
    tasks.push(send(message));
  }
  const customerCancelled = opts.byCustomer && after.status === 'cancelled';
  if ((!before || customerCancelled) && s.notificationEmail) {
    tasks.push(send(ownerMessage(after, s, `${base}/admin/bookings`)));
  }

  await Promise.allSettled(tasks);
}
