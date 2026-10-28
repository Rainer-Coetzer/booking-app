import 'server-only';
import { NextResponse } from 'next/server';
import { BookingError } from './bookings';

const STATUS: Record<BookingError['code'], number> = {
  not_found: 404,
  invalid: 400,
  unavailable: 409,
  conflict: 409,
};

export function errorResponse(err: unknown) {
  if (err instanceof BookingError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: STATUS[err.code] });
  }
  console.error(err);
  return NextResponse.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
