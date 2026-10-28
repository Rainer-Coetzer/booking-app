import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';

export function GET() {
  try {
    getDb().run(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
