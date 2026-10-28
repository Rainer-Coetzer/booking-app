import { after, NextResponse } from 'next/server';
import { createPublicBooking } from '@/server/bookings';
import { afterBookingChange } from '@/server/effects';
import { clientIp, rateLimit } from '@/server/rate-limit';
import { errorResponse, readJson } from '@/server/http';
import { fieldErrors, publicBookingSchema } from '@/server/validation';
import { isDisposableEmail } from '@/server/disposable-email';

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`book:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many booking attempts. Please try again later.' }, { status: 429 });
  }

  const parsed = publicBookingSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) }, { status: 400 });
  }
  const { website, ...input } = parsed.data;
  if (website) return NextResponse.json({ error: 'Request blocked.' }, { status: 400 });
  if (isDisposableEmail(input.email)) {
    return NextResponse.json({ error: 'Use an email address you check regularly.', fields: { email: 'Disposable addresses are not accepted' } }, { status: 400 });
  }
  if (!rateLimit(`book-email:${input.email}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: 'You have several requests open already. We will be in touch.' }, { status: 429 });
  }

  try {
    const { booking, manageToken } = createPublicBooking(input);
    const origin = new URL(request.url).origin;
    after(() => afterBookingChange(null, booking, { origin }));
    return NextResponse.json(
      {
        booking: {
          status: booking.status,
          startAt: booking.startAt,
          endAt: booking.endAt,
          preferredDate: booking.preferredDate,
          manageToken,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
