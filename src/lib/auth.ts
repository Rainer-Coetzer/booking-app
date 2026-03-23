import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const TOKEN_EXPIRY = '24h';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Use pgcrypto in the database to verify the password against the stored hash
  const result = await query(
    'SELECT (password_hash = crypt($1, password_hash)) AS is_match FROM admin_users WHERE password_hash = $2',
    [password, hash]
  );
  return result.rows[0]?.is_match === true;
}

export function signToken(payload: { id: number; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { id: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

export async function authenticateAdmin(request: Request): Promise<{ id: number; email: string; role: string } | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/admin_token=([^;]+)/);
  if (!tokenMatch) return null;
  return verifyToken(tokenMatch[1]);
}

export async function getAdminByEmail(email: string) {
  const result = await query('SELECT * FROM admin_users WHERE email = $1', [email]);
  return result.rows[0] || null;
}
