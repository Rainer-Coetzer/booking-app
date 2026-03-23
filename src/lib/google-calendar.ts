import { google } from 'googleapis';
import { query } from './db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
  });
}

export async function exchangeCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  await query(
    `INSERT INTO google_tokens (id, access_token, refresh_token, expiry_date, updated_at)
     VALUES (1, $1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET
       access_token = $1,
       refresh_token = COALESCE($2, google_tokens.refresh_token),
       expiry_date = $3,
       updated_at = NOW()`,
    [tokens.access_token, tokens.refresh_token, tokens.expiry_date]
  );

  return tokens;
}

async function getAuthenticatedClient() {
  const result = await query('SELECT * FROM google_tokens WHERE id = 1');
  if (!result.rows[0]) return null;

  const { access_token, refresh_token, expiry_date } = result.rows[0];
  oauth2Client.setCredentials({ access_token, refresh_token, expiry_date: Number(expiry_date) });

  // Refresh if expired
  if (Date.now() >= Number(expiry_date)) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    await query(
      'UPDATE google_tokens SET access_token = $1, expiry_date = $2, updated_at = NOW() WHERE id = 1',
      [credentials.access_token, credentials.expiry_date]
    );
  }

  return oauth2Client;
}

export async function createCalendarEvent(booking: {
  name: string;
  email: string;
  session_type: string;
  date: string;
  time: string;
}) {
  const auth = await getAuthenticatedClient();
  if (!auth) return null;

  const tokenResult = await query('SELECT calendar_id FROM google_tokens WHERE id = 1');
  const calendarId = tokenResult.rows[0]?.calendar_id || 'primary';

  const calendar = google.calendar({ version: 'v3', auth });
  const startDateTime = `${booking.date}T${booking.time}:00`;
  const endHour = parseInt(booking.time.split(':')[0]) + 1;
  const endDateTime = `${booking.date}T${String(endHour).padStart(2, '0')}:${booking.time.split(':')[1]}:00`;

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `📷 ${booking.session_type} — ${booking.name}`,
      description: `Client: ${booking.name}\nEmail: ${booking.email}\nSession: ${booking.session_type}`,
      start: { dateTime: startDateTime, timeZone: 'Africa/Windhoek' },
      end: { dateTime: endDateTime, timeZone: 'Africa/Windhoek' },
    },
  });

  return event.data.id;
}

export async function updateCalendarEvent(
  eventId: string,
  booking: { date: string; time: string; name: string; session_type: string }
) {
  const auth = await getAuthenticatedClient();
  if (!auth) return;

  const tokenResult = await query('SELECT calendar_id FROM google_tokens WHERE id = 1');
  const calendarId = tokenResult.rows[0]?.calendar_id || 'primary';

  const calendar = google.calendar({ version: 'v3', auth });
  const startDateTime = `${booking.date}T${booking.time}:00`;
  const endHour = parseInt(booking.time.split(':')[0]) + 1;
  const endDateTime = `${booking.date}T${String(endHour).padStart(2, '0')}:${booking.time.split(':')[1]}:00`;

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: {
      summary: `📷 ${booking.session_type} — ${booking.name}`,
      start: { dateTime: startDateTime, timeZone: 'Africa/Windhoek' },
      end: { dateTime: endDateTime, timeZone: 'Africa/Windhoek' },
    },
  });
}

export async function deleteCalendarEvent(eventId: string) {
  const auth = await getAuthenticatedClient();
  if (!auth) return;

  const tokenResult = await query('SELECT calendar_id FROM google_tokens WHERE id = 1');
  const calendarId = tokenResult.rows[0]?.calendar_id || 'primary';

  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.delete({ calendarId, eventId });
}

export async function listCalendars() {
  const auth = await getAuthenticatedClient();
  if (!auth) return [];

  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.calendarList.list();
  return res.data.items || [];
}

export async function setCalendarId(calendarId: string) {
  await query('UPDATE google_tokens SET calendar_id = $1, updated_at = NOW() WHERE id = 1', [calendarId]);
}

export async function isGoogleConnected(): Promise<boolean> {
  const result = await query('SELECT access_token FROM google_tokens WHERE id = 1');
  return !!result.rows[0]?.access_token;
}
