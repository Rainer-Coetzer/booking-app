// In-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const bookingCooldownMap = new Map<string, number>();
const loginAttemptMap = new Map<string, { count: number; lockUntil: number }>();

// Disposable email domains (partial list)
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'trashmail.com', 'yopmail.com', '10minutemail.com', 'tempail.com',
  'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'maildrop.cc', 'temp-mail.org', 'getnada.com',
]);

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}

export function checkRateLimit(ip: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export function checkBookingCooldown(ip: string, cooldownMs = 60000): boolean {
  const now = Date.now();
  const lastBooking = bookingCooldownMap.get(ip);

  if (lastBooking && now - lastBooking < cooldownMs) return false;
  bookingCooldownMap.set(ip, now);
  return true;
}

export function checkLoginAttempts(ip: string, maxAttempts = 5, lockDurationMs = 900000): {
  allowed: boolean;
  remainingAttempts: number;
} {
  const now = Date.now();
  const entry = loginAttemptMap.get(ip);

  if (!entry) {
    loginAttemptMap.set(ip, { count: 1, lockUntil: 0 });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  if (entry.lockUntil > now) {
    return { allowed: false, remainingAttempts: 0 };
  }

  if (entry.count >= maxAttempts) {
    entry.lockUntil = now + lockDurationMs;
    entry.count = 0;
    return { allowed: false, remainingAttempts: 0 };
  }

  entry.count++;
  return { allowed: true, remainingAttempts: maxAttempts - entry.count };
}

export function resetLoginAttempts(ip: string): void {
  loginAttemptMap.delete(ip);
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

export function checkHoneypot(value?: string): boolean {
  return !value || value.length === 0;
}

export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Cleanup stale entries periodically (every 10 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetTime) rateLimitMap.delete(key);
    }
    for (const [key, val] of bookingCooldownMap) {
      if (now - val > 300000) bookingCooldownMap.delete(key);
    }
    for (const [key, val] of loginAttemptMap) {
      if (val.lockUntil > 0 && now > val.lockUntil) loginAttemptMap.delete(key);
    }
  }, 600000);
}
