import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth';
import { exchangeCode } from '@/lib/google-calendar';

export async function GET(request: Request) {
  const admin = await authenticateAdmin(request);
  
  if (!admin) {
    // Note: Google redirects don't usually bring auth cookies cross-site 
    // seamlessly on some browsers depending on SameSite policies.
    // If you see issues here, we might need a different auth mechanism.
    // Assuming SameSite=Lax (the default for Next.js cookies usually) or Strict.
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth Error:', error);
      return NextResponse.redirect(new URL('/admin/dashboard?error=google_auth_failed', request.url));
    }

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Exchange the auth code for access & refresh tokens
    await exchangeCode(code);

    // Redirect the user back to the admin dashboard
    return NextResponse.redirect(new URL('/admin/dashboard?google=success', request.url));
  } catch (error) {
    console.error('Google OAuth Callback error:', error);
    return NextResponse.redirect(new URL('/admin/dashboard?error=google_callback_failed', request.url));
  }
}
