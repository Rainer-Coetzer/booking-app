'use client';

import { useActionState, useRef } from 'react';
import type { Booking } from '@/server/db/schema';
import { localDate } from '@/lib/availability';
import { ACTION_LABELS, TRANSITIONS } from '@/lib/status';
import { restore } from './restore';
import { scheduleBooking, setBookingStatus, type FormState } from '@/app/admin/actions';

function localTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

export default function BookingActions({ booking, timezone }: { booking: Booking; timezone: string }) {
  const [statusState, statusAction, statusPending] = useActionState<FormState, FormData>(setBookingStatus, {});
  const [scheduleState, scheduleAction, schedulePending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await scheduleBooking(prev, form);
    if (result.ok) dialog.current?.close();
    return result;
  }, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const v = restore(scheduleState.values);

  const transitions = TRANSITIONS[booking.status];
  const canSchedule = ['pending', 'confirmed', 'quote_requested'].includes(booking.status);
  const isQuote = booking.status === 'quote_requested';
  // Empty for quote requests, so the server falls back to the service's own length.
  const minutes = booking.startAt && booking.endAt ? (Date.parse(booking.endAt) - Date.parse(booking.startAt)) / 60_000 : '';

  return (
    <div className="actions">
      {transitions.map((status) => (
        <form key={status} action={statusAction}>
          <input type="hidden" name="id" value={booking.id} />
          <input type="hidden" name="status" value={status} />
          <button
            type="submit"
            className={`btn btn-sm ${status === 'confirmed' ? 'btn-primary' : ''} ${status === 'declined' || status === 'cancelled' ? 'btn-danger' : ''}`}
            disabled={statusPending}
            onClick={(e) => {
              if ((status === 'cancelled' || status === 'declined') && !confirm(`${ACTION_LABELS[status]} this booking? The customer will be emailed.`)) {
                e.preventDefault();
              }
            }}
          >
            {ACTION_LABELS[status]}
          </button>
        </form>
      ))}
      {canSchedule && (
        <button type="button" className={`btn btn-sm ${isQuote ? 'btn-primary' : ''}`} onClick={() => dialog.current?.showModal()}>
          {isQuote ? 'Schedule' : 'Move'}
        </button>
      )}
      {statusState.error && <span className="error">{statusState.error}</span>}

      <dialog ref={dialog} aria-labelledby={`schedule-${booking.id}`}>
        <form action={scheduleAction}>
          <h2 id={`schedule-${booking.id}`} style={{ marginBottom: '0.5rem' }}>
            {isQuote ? 'Schedule' : 'Move'} {booking.customerName}
          </h2>
          <p className="muted small" style={{ marginBottom: '1.5rem' }}>
            {booking.serviceName}. Times are in {timezone.replace(/_/g, ' ')}. Opening hours don&apos;t apply here, but other bookings do.
          </p>
          {scheduleState.error && (
            <p className="notice notice-bad" role="alert" style={{ marginBottom: '1rem' }}>
              {scheduleState.error}
            </p>
          )}
          <input type="hidden" name="id" value={booking.id} />
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor={`date-${booking.id}`}>Date</label>
              <input
                id={`date-${booking.id}`}
                className="input"
                type="date"
                name="date"
                required
                defaultValue={v.text('date', booking.startAt ? localDate(Date.parse(booking.startAt), timezone) : (booking.preferredDate ?? ''))}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor={`time-${booking.id}`}>Start</label>
              <input id={`time-${booking.id}`} className="input" type="time" name="time" required defaultValue={v.text('time', booking.startAt ? localTime(booking.startAt, timezone) : '')} />
            </div>
          </div>
          <div className="field" style={{ marginTop: '1.125rem' }}>
            <label className="label" htmlFor={`duration-${booking.id}`}>Length (minutes)</label>
            <input id={`duration-${booking.id}`} className="input" type="number" name="durationMinutes" min={5} step={5} placeholder="Service default" defaultValue={v.text('durationMinutes', minutes)} />
          </div>
          <div className="step-actions">
            <button type="button" className="btn btn-quiet" onClick={() => dialog.current?.close()}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={schedulePending}>
              {schedulePending ? 'Saving…' : 'Save and email customer'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
