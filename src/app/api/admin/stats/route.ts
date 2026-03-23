import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Today's bookings
    const todayResult = await query(
      `SELECT COUNT(*) FROM bookings WHERE date = CURRENT_DATE AND status NOT IN ('declined', 'cancelled')`
    );

    // Pending bookings
    const pendingResult = await query(
      `SELECT COUNT(*) FROM bookings WHERE status = 'pending'`
    );

    // Quote requests
    const quotesResult = await query(
      `SELECT COUNT(*) FROM bookings WHERE status = 'quote_requested'`
    );

    // Total bookings this month
    const monthResult = await query(
      `SELECT COUNT(*) FROM bookings WHERE date >= date_trunc('month', CURRENT_DATE) AND status NOT IN ('declined', 'cancelled')`
    );

    // Upcoming bookings (next 7 days)
    const upcomingResult = await query(
      `SELECT * FROM bookings WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '7 days' AND status NOT IN ('declined', 'cancelled') ORDER BY date, time LIMIT 10`
    );

    return NextResponse.json({
      stats: {
        today: parseInt(todayResult.rows[0].count),
        pending: parseInt(pendingResult.rows[0].count),
        quotes: parseInt(quotesResult.rows[0].count),
        thisMonth: parseInt(monthResult.rows[0].count),
      },
      upcoming: upcomingResult.rows,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
