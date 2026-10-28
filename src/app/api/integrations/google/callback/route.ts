import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { currentAdmin } from '@/server/auth';
import { exchangeCode } from '@/server/google-calendar';
import { verifySignedValue } from '@/server/crypto';
import { appUrl } from '@/server/effects';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (result: string) => NextResponse.redirect(new URL(`/admin/integrations?google=${result}`, request.url));

  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const jar = await cookies();
  const nonce = jar.get('google_oauth')?.value;
  jar.delete({ name: 'google_oauth', path: '/api/integrations/google' });

  const state = verifySignedValue(url.searchParams.get('state') ?? '');
  if (!nonce || state !== `${admin.id}:${nonce}`) return back('invalid_state');
  if (url.searchParams.get('error')) return back('denied');

  const code = url.searchParams.get('code');
  if (!code) return back('missing_code');

  try {
    await exchangeCode(code, appUrl(url.origin));
    return back('connected');
  } catch (err) {
    console.error('[google-calendar] code exchange failed', err);
    return back('failed');
  }
}
