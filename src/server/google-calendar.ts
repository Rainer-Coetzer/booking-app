import 'server-only';
import { auth, calendar as calendarApi } from '@googleapis/calendar';
import { eq, sql } from 'drizzle-orm';
import { getDb } from './db/client';
import { integrations, type Booking } from './db/schema';
import { decrypt, encrypt } from './crypto';
import { requireSettings } from './settings';

const PROVIDER = 'google';
const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'];

interface StoredTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

export function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(origin: string) {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/integrations/google/callback`;
}

// A fresh client per call: the old shared client let one request's credentials leak into another's.
function oauthClient(origin = process.env.APP_URL ?? '') {
  return new auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri(origin));
}

export function authUrl(origin: string, state: string) {
  return oauthClient(origin).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

function getRow() {
  return getDb().select().from(integrations).where(eq(integrations.provider, PROVIDER)).get() ?? null;
}

export function connectionStatus() {
  const row = getRow();
  if (!row) return { connected: false as const };
  return {
    connected: row.status === 'connected',
    calendarId: row.config.calendarId ?? 'primary',
    error: row.lastError,
  };
}

export async function exchangeCode(code: string, origin: string) {
  const { tokens } = await oauthClient(origin).getToken(code);
  const previous = getRow();
  // Google only returns a refresh token on first consent; keep the old one if it is missing.
  const merged: StoredTokens = {
    ...tokens,
    refresh_token: tokens.refresh_token ?? (previous ? (JSON.parse(decrypt(previous.credentials)) as StoredTokens).refresh_token : null),
  };
  const credentials = encrypt(JSON.stringify(merged));
  getDb()
    .insert(integrations)
    .values({ provider: PROVIDER, credentials, config: previous?.config ?? {}, status: 'connected' })
    .onConflictDoUpdate({
      target: integrations.provider,
      set: { credentials, status: 'connected', lastError: null, updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` },
    })
    .run();
}

export function disconnect() {
  getDb().delete(integrations).where(eq(integrations.provider, PROVIDER)).run();
}

export function setCalendarId(calendarId: string) {
  const row = getRow();
  if (!row) return;
  getDb()
    .update(integrations)
    .set({ config: { ...row.config, calendarId } })
    .where(eq(integrations.provider, PROVIDER))
    .run();
}

function markError(message: string) {
  getDb()
    .update(integrations)
    .set({ status: 'error', lastError: message })
    .where(eq(integrations.provider, PROVIDER))
    .run();
}

function client() {
  const row = getRow();
  if (!row || row.status !== 'connected' || !isConfigured()) return null;
  const oauth = oauthClient();
  oauth.setCredentials(JSON.parse(decrypt(row.credentials)) as StoredTokens);
  oauth.on('tokens', (fresh) => {
    const current = JSON.parse(decrypt(row.credentials)) as StoredTokens;
    getDb()
      .update(integrations)
      .set({ credentials: encrypt(JSON.stringify({ ...current, ...fresh })) })
      .where(eq(integrations.provider, PROVIDER))
      .run();
  });
  return { api: calendarApi({ version: 'v3', auth: oauth }), calendarId: row.config.calendarId ?? 'primary' };
}

async function guarded<T>(fn: (c: NonNullable<ReturnType<typeof client>>) => Promise<T>): Promise<T | null> {
  const c = client();
  if (!c) return null;
  try {
    return await fn(c);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // A revoked or expired grant fails every call from now on; stop trying until the owner reconnects.
    if (/invalid_grant|unauthorized_client|invalid_client/i.test(message)) markError('Google access was revoked. Reconnect to resume syncing.');
    console.error('[google-calendar]', message);
    return null;
  }
}

export async function listCalendars() {
  return (
    (await guarded(async ({ api }) => {
      const res = await api.calendarList.list({ minAccessRole: 'writer' });
      return (res.data.items ?? []).map((c) => ({ id: c.id!, summary: c.summary ?? c.id!, primary: Boolean(c.primary) }));
    })) ?? []
  );
}

function eventBody(booking: Booking) {
  const { timezone, businessName } = requireSettings();
  return {
    summary: `${booking.serviceName}: ${booking.customerName}`,
    description: [
      `Customer: ${booking.customerName}`,
      `Email: ${booking.customerEmail}`,
      booking.customerPhone && `Phone: ${booking.customerPhone}`,
      booking.notes && `Notes: ${booking.notes}`,
      `Booked through ${businessName}`,
    ]
      .filter(Boolean)
      .join('\n'),
    location: booking.location || undefined,
    start: { dateTime: booking.startAt!, timeZone: timezone },
    end: { dateTime: booking.endAt!, timeZone: timezone },
  };
}

export async function upsertEvent(booking: Booking): Promise<string | null> {
  if (!booking.startAt || !booking.endAt) return null;
  return guarded(async ({ api, calendarId }) => {
    if (booking.googleEventId) {
      const res = await api.events.update({ calendarId, eventId: booking.googleEventId, requestBody: eventBody(booking) });
      return res.data.id ?? booking.googleEventId;
    }
    const res = await api.events.insert({ calendarId, requestBody: eventBody(booking) });
    return res.data.id ?? null;
  });
}

export async function deleteEvent(eventId: string) {
  await guarded(async ({ api, calendarId }) => {
    await api.events.delete({ calendarId, eventId });
  });
}
