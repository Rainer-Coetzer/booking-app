import { notFound } from 'next/navigation';
import { getBookingByToken, isCustomerCancellable } from '@/server/bookings';
import { requireSettings } from '@/server/settings';
import { formatDate, formatDateTime, STATUS_LABELS } from '@/lib/format';
import { cancelBooking } from './actions';

export const metadata = { title: 'Your booking', robots: { index: false } };

export default async function ManagePage({ params, searchParams }: PageProps<'/manage/[token]'>) {
  const { token } = await params;
  const { error } = await searchParams;
  const booking = getBookingByToken(token);
  if (!booking) notFound();
  const s = requireSettings();
  const cancellable = isCustomerCancellable(booking);

  return (
    <main className="auth">
      <div className="auth-panel">
        <p className="eyebrow">{s.businessName}</p>
        <h1 style={{ marginTop: '0.5rem' }}>{booking.serviceName}</h1>

        <dl className="facts">
          <dt>Status</dt>
          <dd>
            <span className={`status status-${booking.status}`}>{STATUS_LABELS[booking.status]}</span>
          </dd>
          <dt>{booking.startAt ? 'When' : 'Preferred date'}</dt>
          <dd>
            {booking.startAt
              ? formatDateTime(booking.startAt, s.timezone, s.locale)
              : booking.preferredDate && formatDate(booking.preferredDate, s.locale)}
          </dd>
          <dt>Name</dt>
          <dd>{booking.customerName}</dd>
          {booking.location && (
            <>
              <dt>Location</dt>
              <dd>{booking.location}</dd>
            </>
          )}
        </dl>

        {error && <p className="notice notice-bad">{String(error)}</p>}

        {cancellable ? (
          <form action={cancelBooking.bind(null, token)}>
            <button type="submit" className="btn btn-danger">
              Cancel this booking
            </button>
          </form>
        ) : (
          <p className="muted small">This booking can no longer be changed online.</p>
        )}

        {(s.contactEmail || s.contactPhone) && (
          <p className="muted small" style={{ marginTop: '2rem' }}>
            Need to change something? Contact {s.businessName}
            {s.contactEmail && (
              <>
                {' '}
                at <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
              </>
            )}
            {s.contactPhone && <> or {s.contactPhone}</>}.
          </p>
        )}
      </div>
    </main>
  );
}
