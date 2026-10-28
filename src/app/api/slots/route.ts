import { NextResponse } from 'next/server';
import { z } from 'zod';
import { slotsFor } from '@/server/bookings';
import { parseDate } from '@/lib/availability';
import { clientIp, rateLimit } from '@/server/rate-limit';
import { errorResponse } from '@/server/http';

const query = z.object({
  service: z.coerce.number().int().positive(),
  date: z.string().refine((d) => parseDate(d) !== null),
});

export async function GET(request: Request) {
  if (!rateLimit(`slots:${clientIp(request.headers)}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = query.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: 'Pass a service id and a YYYY-MM-DD date.' }, { status: 400 });

  try {
    const slots = slotsFor(parsed.data.service, parsed.data.date);
    return NextResponse.json({ date: parsed.data.date, slots }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return errorResponse(err);
  }
}
