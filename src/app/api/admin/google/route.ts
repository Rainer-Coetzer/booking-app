import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth';
import { getAuthUrl, exchangeCode, listCalendars, setCalendarId, isGoogleConnected } from '@/lib/google-calendar';

export async function GET(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'auth-url') {
      return NextResponse.json({ url: getAuthUrl() });
    }

    if (action === 'calendars') {
      const calendars = await listCalendars();
      return NextResponse.json({ calendars });
    }

    if (action === 'status') {
      const connected = await isGoogleConnected();
      return NextResponse.json({ connected });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Google API error:', error);
    return NextResponse.json({ error: 'Google API request failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await authenticateAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (body.code) {
      await exchangeCode(body.code);
      return NextResponse.json({ success: true });
    }

    if (body.calendarId) {
      await setCalendarId(body.calendarId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.json({ error: 'Google OAuth failed' }, { status: 500 });
  }
}
