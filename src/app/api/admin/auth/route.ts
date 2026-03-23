import { NextResponse } from 'next/server';
import { getAdminByEmail, verifyPassword, signToken } from '@/lib/auth';
import { adminLoginSchema } from '@/lib/validate';
import { getClientIP, checkLoginAttempts, resetLoginAttempts } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);

    // Brute force protection
    const { allowed, remainingAttempts } = checkLoginAttempts(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const admin = await getAdminByEmail(email);

    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      return NextResponse.json(
        { error: `Invalid credentials. ${remainingAttempts} attempts remaining.` },
        { status: 401 }
      );
    }

    // Success — reset attempts and issue token
    resetLoginAttempts(ip);
    const token = signToken({ id: admin.id, email: admin.email, role: admin.role });

    const response = NextResponse.json({ success: true, admin: { email: admin.email, role: admin.role } });
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 24h
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
  return response;
}
