import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, parseISO, getDay } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: 'Valid date parameter required (YYYY-MM-DD)' }, { status: 400 });
    }

    const date = parseISO(dateStr);
    const dayOfWeek = getDay(date); // 0=Sunday

    // Check if date is blocked
    const blocked = await query('SELECT id FROM blocked_dates WHERE date = $1', [dateStr]);
    if (blocked.rows.length > 0) {
      return NextResponse.json({ slots: [], blocked: true });
    }

    // Get opening hours for this day
    const hours = await query(
      'SELECT start_time, end_time, enabled FROM opening_hours WHERE day_of_week = $1',
      [dayOfWeek]
    );

    if (!hours.rows[0] || !hours.rows[0].enabled) {
      return NextResponse.json({ slots: [], closed: true });
    }

    const { start_time, end_time } = hours.rows[0];
    const startHour = parseInt(start_time.split(':')[0]);
    const endHour = parseInt(end_time.split(':')[0]);

    // Generate 1-hour slots
    const allSlots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      allSlots.push(`${String(h).padStart(2, '0')}:00`);
    }

    // Get existing bookings for this date
    const existingBookings = await query(
      `SELECT time FROM bookings WHERE date = $1 AND status NOT IN ('declined', 'cancelled') AND time IS NOT NULL`,
      [dateStr]
    );
    const bookedTimes = new Set(existingBookings.rows.map((r: { time: string }) => r.time));

    // Filter out booked slots
    const availableSlots = allSlots.map((time) => ({
      time,
      available: !bookedTimes.has(time),
      display: format(parseISO(`2000-01-01T${time}:00`), 'h:mm a'),
    }));

    return NextResponse.json({ slots: availableSlots, date: dateStr });
  } catch (error) {
    console.error('Slots error:', error);
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
  }
}
