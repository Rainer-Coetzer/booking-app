import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateAdmin } from '@/lib/auth';
import { openingHoursSchema } from '@/lib/validate';

export async function GET(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query('SELECT * FROM opening_hours ORDER BY day_of_week');
    return NextResponse.json({ hours: result.rows });
  } catch (error) {
    console.error('Hours fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch hours' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = openingHoursSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { day_of_week, start_time, end_time, enabled } = parsed.data;

    await query(
      `INSERT INTO opening_hours (day_of_week, start_time, end_time, enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (day_of_week) DO UPDATE SET
         start_time = $2, end_time = $3, enabled = $4`,
      [day_of_week, start_time, end_time, enabled]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hours update error:', error);
    return NextResponse.json({ error: 'Failed to update hours' }, { status: 500 });
  }
}
