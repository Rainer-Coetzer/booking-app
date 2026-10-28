import 'server-only';
import bcrypt from 'bcryptjs';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from './db/client';
import { adminSessions, adminUsers, settings, type AdminUser } from './db/schema';
import { randomToken, sha256 } from './crypto';
import { clientIp, rateLimit } from './rate-limit';

const COOKIE = 'session';
const SESSION_DAYS = 14;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

// Compared against when the email is unknown, so response time does not reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export type Admin = Pick<AdminUser, 'id' | 'email' | 'name'>;

export function hasAdmin(): boolean {
  return (getDb().select({ n: sql<number>`count(*)` }).from(adminUsers).get()?.n ?? 0) > 0;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export type LoginResult = { ok: true; admin: Admin } | { ok: false; error: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 20, 15 * 60_000)) {
    return { ok: false, error: 'Too many sign-in attempts. Try again in a few minutes.' };
  }

  const db = getDb();
  const user = db.select().from(adminUsers).where(eq(adminUsers.email, email)).get();
  if (user?.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) {
    return { ok: false, error: 'This account is temporarily locked after repeated failed sign-ins.' };
  }

  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    if (user) {
      const failed = user.failedLogins + 1;
      db.update(adminUsers)
        .set({
          failedLogins: failed >= MAX_FAILED_LOGINS ? 0 : failed,
          lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
        })
        .where(eq(adminUsers.id, user.id))
        .run();
    }
    return { ok: false, error: 'Email or password is incorrect.' };
  }

  db.update(adminUsers)
    .set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date().toISOString() })
    .where(eq(adminUsers.id, user.id))
    .run();
  await startSession(user.id);
  return { ok: true, admin: { id: user.id, email: user.email, name: user.name } };
}

export async function startSession(userId: number) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = getDb();
  db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date().toISOString())).run();
  db.insert(adminSessions).values({ tokenHash: sha256(token), userId, expiresAt: expires.toISOString() }).run();

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax, not Strict: Google's OAuth redirect back to us is a cross-site
    // navigation, and a Strict cookie would be dropped on it.
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().delete(adminSessions).where(eq(adminSessions.tokenHash, sha256(token))).run();
  jar.delete(COOKIE);
}

export async function currentAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(and(eq(adminSessions.tokenHash, sha256(token)), gt(adminSessions.expiresAt, new Date().toISOString())))
    .get();
  return row ?? null;
}

/** For admin pages and server actions. Redirects to the sign-in page when signed out. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}

/**
 * First-run setup: creates the settings row and the first admin in a single
 * transaction, and refuses once any admin exists. SETUP_TOKEN, when set, stops a
 * stranger from claiming a freshly deployed instance before its owner does.
 */
export async function completeSetup(input: {
  businessName: string;
  timezone: string;
  currency: string;
  name: string;
  email: string;
  password: string;
  setupToken?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const expected = process.env.SETUP_TOKEN;
  if (expected && input.setupToken !== expected) return { ok: false, error: 'Setup token is incorrect.' };

  const passwordHash = await hashPassword(input.password);
  const db = getDb();
  const userId = db.transaction(
    (tx) => {
      if (hasAdmin()) return null;
      tx.insert(settings)
        .values({ id: 1, businessName: input.businessName, timezone: input.timezone, currency: input.currency })
        .onConflictDoNothing()
        .run();
      return tx
        .insert(adminUsers)
        .values({ email: input.email, name: input.name, passwordHash })
        .returning({ id: adminUsers.id })
        .get().id;
    },
    { behavior: 'immediate' },
  );
  if (userId === null) return { ok: false, error: 'Setup has already been completed.' };
  await startSession(userId);
  return { ok: true };
}

export async function changePassword(adminId: number, current: string, next: string) {
  const user = getDb().select().from(adminUsers).where(eq(adminUsers.id, adminId)).get();
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return false;
  const db = getDb();
  db.update(adminUsers).set({ passwordHash: await hashPassword(next) }).where(eq(adminUsers.id, adminId)).run();
  db.delete(adminSessions).where(eq(adminSessions.userId, adminId)).run();
  await startSession(adminId);
  return true;
}
