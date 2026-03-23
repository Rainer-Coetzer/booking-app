import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { bookingSchema } from '@/lib/validate';
import {
  getClientIP,
  checkRateLimit,
  checkBookingCooldown,
  isDisposableEmail,
  checkHoneypot,
} from '@/lib/security';
import { BOOKING_STATUSES } from '@/lib/constants';
import { createCalendarEvent } from '@/lib/google-calendar';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);

    // Rate limiting
    if (!checkRateLimit(ip, 10, 60000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // Booking cooldown
    if (!checkBookingCooldown(ip, 60000)) {
      return NextResponse.json({ error: 'Please wait before making another booking.' }, { status: 429 });
    }

    const body = await request.json();

    // Validate input
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Honeypot check
    if (!checkHoneypot(data.honeypot)) {
      return NextResponse.json({ error: 'Request blocked.' }, { status: 400 });
    }

    // Disposable email check
    if (isDisposableEmail(data.email)) {
      return NextResponse.json({ error: 'Please use a valid email address.' }, { status: 400 });
    }

    // Determine status
    const isCustom = data.session_type === 'custom';
    const status = isCustom ? BOOKING_STATUSES.QUOTE_REQUESTED : BOOKING_STATUSES.PENDING;

    // Check for double booking (if not custom)
    if (!isCustom && data.time) {
      const existing = await query(
        `SELECT id FROM bookings WHERE date = $1 AND time = $2 AND status NOT IN ('declined', 'cancelled')`,
        [data.date, data.time]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'This time slot is no longer available.' }, { status: 409 });
      }
    }

    // Insert booking
    const result = await query(
      `INSERT INTO bookings (name, email, phone, session_type, date, time, location, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, status`,
      [data.name, data.email, data.phone, data.session_type, data.date, data.time || null, data.location, data.notes, status]
    );

    const booking = result.rows[0];

    // Sync to Google Calendar (only for non-custom confirmed bookings)
    if (!isCustom && data.time) {
      try {
        const eventId = await createCalendarEvent({
          name: data.name,
          email: data.email,
          session_type: data.session_type,
          date: data.date,
          time: data.time,
        });
        if (eventId) {
          await query('UPDATE bookings SET google_event_id = $1 WHERE id = $2', [eventId, booking.id]);
        }
      } catch (err) {
        console.error('Google Calendar sync failed:', err);
        // Don't fail the booking if calendar sync fails
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        isQuoteRequest: isCustom,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Public: not exposed. Only admin routes return bookings.
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
