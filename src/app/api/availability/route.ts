import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: 'Valid date required' }, { status: 400 });
    }

    // Check blocked dates
    const blocked = await query('SELECT id FROM blocked_dates WHERE date = $1', [dateStr]);

    // Get day of week
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();

    // Get opening hours
    const hours = await query(
      'SELECT enabled FROM opening_hours WHERE day_of_week = $1',
      [dayOfWeek]
    );

    const isBlocked = blocked.rows.length > 0;
    const isClosed = !hours.rows[0]?.enabled;

    return NextResponse.json({
      date: dateStr,
      available: !isBlocked && !isClosed,
      blocked: isBlocked,
      closed: isClosed,
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
