import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateAdmin } from '@/lib/auth';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';

export async function GET(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM bookings';
    const params: unknown[] = [];

    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);

    const countSql = status
      ? 'SELECT COUNT(*) FROM bookings WHERE status = $1'
      : 'SELECT COUNT(*) FROM bookings';
    const countResult = await query(countSql, status ? [status] : []);

    return NextResponse.json({
      bookings: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Admin bookings error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status, date, time } = body;

    if (!id) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });

    // Get current booking
    const current = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!current.rows[0]) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const booking = current.rows[0];

    // Reschedule
    if (date || time) {
      const newDate = date || booking.date;
      const newTime = time || booking.time;

      await query(
        'UPDATE bookings SET date = $1, time = $2, status = $3, updated_at = NOW() WHERE id = $4',
        [newDate, newTime, 'confirmed', id]
      );

      // Update Google Calendar
      if (booking.google_event_id) {
        try {
          await updateCalendarEvent(booking.google_event_id, {
            date: newDate,
            time: newTime,
            name: booking.name,
            session_type: booking.session_type,
          });
        } catch (err) {
          console.error('Calendar update failed:', err);
        }
      } else if (newTime) {
        // Create event for custom sessions that now have a time
        try {
          const eventId = await createCalendarEvent({
            name: booking.name,
            email: booking.email,
            session_type: booking.session_type,
            date: newDate,
            time: newTime,
          });
          if (eventId) {
            await query('UPDATE bookings SET google_event_id = $1 WHERE id = $2', [eventId, id]);
          }
        } catch (err) {
          console.error('Calendar create failed:', err);
        }
      }

      return NextResponse.json({ success: true, action: 'rescheduled' });
    }

    // Status update
    if (status) {
      await query('UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

      // If cancelled/declined, remove from calendar
      if ((status === 'cancelled' || status === 'declined') && booking.google_event_id) {
        try {
          await deleteCalendarEvent(booking.google_event_id);
          await query('UPDATE bookings SET google_event_id = NULL WHERE id = $1', [id]);
        } catch (err) {
          console.error('Calendar delete failed:', err);
        }
      }

      // If confirming, create calendar event
      if (status === 'confirmed' && !booking.google_event_id && booking.time) {
        try {
          const eventId = await createCalendarEvent({
            name: booking.name,
            email: booking.email,
            session_type: booking.session_type,
            date: booking.date,
            time: booking.time,
          });
          if (eventId) {
            await query('UPDATE bookings SET google_event_id = $1 WHERE id = $2', [eventId, id]);
          }
        } catch (err) {
          console.error('Calendar create failed:', err);
        }
      }

      return NextResponse.json({ success: true, action: status });
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (error) {
    console.error('Admin booking update error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, email, phone, session_type, date, time, location, notes } = body;

    if (!name || !email || !phone || !session_type || !date) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO bookings (name, email, phone, session_type, date, time, location, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
       RETURNING id`,
      [name, email, phone, session_type, date, time || null, location || '', notes || '']
    );

    // Sync to calendar
    if (time) {
      try {
        const eventId = await createCalendarEvent({ name, email, session_type, date, time });
        if (eventId) {
          await query('UPDATE bookings SET google_event_id = $1 WHERE id = $2', [eventId, result.rows[0].id]);
        }
      } catch (err) {
        console.error('Calendar sync failed:', err);
      }
    }

    return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    console.error('Manual booking error:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });

    // Get booking for calendar cleanup
    const booking = await query('SELECT google_event_id FROM bookings WHERE id = $1', [parseInt(id)]);
    if (booking.rows[0]?.google_event_id) {
      try {
        await deleteCalendarEvent(booking.rows[0].google_event_id);
      } catch (err) {
        console.error('Calendar delete failed:', err);
      }
    }

    await query('DELETE FROM bookings WHERE id = $1', [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete booking error:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
