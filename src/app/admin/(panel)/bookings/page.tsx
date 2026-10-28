import Link from 'next/link';
import { listBookings } from '@/server/bookings';
import { requireSettings } from '@/server/settings';
import { BOOKING_STATUSES, type BookingStatus } from '@/server/db/schema';
import { formatDate, formatDateTime, STATUS_LABELS } from '@/lib/format';
import BookingActions from '@/components/admin/BookingActions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { eraseBooking } from '../../actions';

export const metadata = { title: 'Bookings' };

const PAGE_SIZE = 50;

export default async function BookingsPage({ searchParams }: PageProps<'/admin/bookings'>) {
  const params = await searchParams;
  const status = BOOKING_STATUSES.includes(params.status as BookingStatus) ? (params.status as BookingStatus) : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const s = requireSettings();
  const { rows, total } = listBookings({ status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (next: { status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (next.status) q.set('status', next.status);
    if (next.page && next.page > 1) q.set('page', String(next.page));
    return `/admin/bookings${q.size ? `?${q}` : ''}`;
  };

  return (
    <>
      <header className="admin-head spread">
        <div>
          <h1>Bookings</h1>
          <p>{total} {status ? STATUS_LABELS[status].toLowerCase() : 'in total'}</p>
        </div>
        <Link className="btn btn-primary" href="/admin/bookings/new">
          Add a booking
        </Link>
      </header>

      <nav className="filters" aria-label="Filter by status">
        <Link href={href({})} aria-current={!status ? 'page' : undefined}>
          All
        </Link>
        {BOOKING_STATUSES.map((st) => (
          <Link key={st} href={href({ status: st })} aria-current={status === st ? 'page' : undefined}>
            {STATUS_LABELS[st]}
          </Link>
        ))}
      </nav>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Customer</th>
              <th scope="col">Service</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td className="num">
                  {b.startAt ? formatDateTime(b.startAt, s.timezone, s.locale) : <span className="muted">Prefers {b.preferredDate && formatDate(b.preferredDate, s.locale, 'short')}</span>}
                </td>
                <td>
                  {b.customerName}
                  <div className="muted small">
                    <a href={`mailto:${b.customerEmail}`}>{b.customerEmail}</a>
                    {b.customerPhone && <> · {b.customerPhone}</>}
                  </div>
                  {b.notes && <div className="small" style={{ marginTop: '0.25rem', maxWidth: '36ch' }}>{b.notes}</div>}
                </td>
                <td>
                  {b.serviceName}
                  {b.location && <div className="muted small">{b.location}</div>}
                </td>
                <td>
                  <span className={`status status-${b.status}`}>{STATUS_LABELS[b.status]}</span>
                </td>
                <td>
                  <BookingActions booking={b} timezone={s.timezone} />
                  {b.customerEmail !== 'erased@invalid' && (
                    <form action={eraseBooking} className="actions" style={{ marginTop: '0.375rem' }}>
                      <input type="hidden" name="id" value={b.id} />
                      <ConfirmButton
                        className="btn btn-quiet btn-sm"
                        message={`Erase ${b.customerName}'s name, email, phone and notes from this booking? This cannot be undone.`}
                      >
                        Erase personal data
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No bookings here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="row" style={{ marginTop: '1.5rem' }}>
          {page > 1 && <Link className="btn btn-sm" href={href({ status, page: page - 1 })}>← Newer</Link>}
          <span className="muted small">
            Page {page} of {pages}
          </span>
          {page < pages && <Link className="btn btn-sm" href={href({ status, page: page + 1 })}>Older →</Link>}
        </div>
      )}
    </>
  );
}
