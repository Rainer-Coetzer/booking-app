import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateAdmin } from '@/lib/auth';
import { blockedDateSchema } from '@/lib/validate';

export async function GET(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query('SELECT * FROM blocked_dates ORDER BY date');
    return NextResponse.json({ dates: result.rows });
  } catch (error) {
    console.error('Blocked dates fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch blocked dates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = blockedDateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const { date, reason } = parsed.data;

    await query(
      'INSERT INTO blocked_dates (date, reason) VALUES ($1, $2) ON CONFLICT (date) DO NOTHING',
      [date, reason]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Block date error:', error);
    return NextResponse.json({ error: 'Failed to block date' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await query('DELETE FROM blocked_dates WHERE id = $1', [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unblock date error:', error);
    return NextResponse.json({ error: 'Failed to unblock date' }, { status: 500 });
  }
}
