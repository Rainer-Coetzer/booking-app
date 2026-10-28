import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { currentAdmin } from '@/server/auth';
import { authUrl, isConfigured } from '@/server/google-calendar';
import { randomToken, signValue } from '@/server/crypto';
import { appUrl } from '@/server/effects';

export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isConfigured()) {
    return NextResponse.redirect(new URL('/admin/integrations?google=not_configured', request.url));
  }

  // The state is bound to this admin and to a cookie only this browser holds, so a
  // callback URL crafted by someone else cannot attach their Google account.
  const nonce = randomToken(16);
  (await cookies()).set('google_oauth', nonce, { httpOnly: true, sameSite: 'lax', path: '/api/integrations/google', maxAge: 600 });
  const state = signValue(`${admin.id}:${nonce}`, 600);
  return NextResponse.redirect(authUrl(appUrl(new URL(request.url).origin), state));
}
