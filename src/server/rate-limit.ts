import 'server-only';

// In-process counters are enough here: SQLite already pins the app to one
// process. Moving to several instances means moving this into shared storage.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) sweep(now, windowMs);
  return true;
}

function sweep(now: number, windowMs: number) {
  for (const [key, hits] of buckets) {
    if (hits.every((t) => now - t >= windowMs)) buckets.delete(key);
  }
}

/**
 * Client IP as seen by the closest trusted proxy. Proxies append to
 * X-Forwarded-For, so entries on the left are whatever the client sent and
 * cannot be trusted. TRUST_PROXY_HOPS says how many proxies sit in front.
 */
export function clientIp(headers: Headers): string {
  const hops = Math.max(1, Number(process.env.TRUST_PROXY_HOPS ?? 1));
  const chain = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[chain.length - hops] ?? chain[0] ?? 'unknown';
}
