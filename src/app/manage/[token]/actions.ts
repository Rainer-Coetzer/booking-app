'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { BookingError, cancelByToken } from '@/server/bookings';
import { afterBookingChange } from '@/server/effects';

export async function cancelBooking(token: string) {
  try {
    const { before, after: updated } = cancelByToken(token);
    after(() => afterBookingChange(before, updated, { byCustomer: true }));
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
    redirect(`/manage/${token}?error=${encodeURIComponent(err.message)}`);
  }
  redirect(`/manage/${token}`);
}
