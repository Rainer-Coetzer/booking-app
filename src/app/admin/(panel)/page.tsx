import Link from 'next/link';
import { listBookings, stats, upcoming } from '@/server/bookings';
import { businessToday, requireSettings } from '@/server/settings';
import { localDate } from '@/lib/availability';
import { formatDate, formatTime } from '@/lib/format';
import BookingActions from '@/components/admin/BookingActions';

export const metadata = { title: 'Today' };

export default async function Overview({ searchParams }: PageProps<'/admin'>) {
  const { welcome } = await searchParams;
  const s = requireSettings();
  const counts = stats();
  const waiting = [...listBookings({ status: 'pending', limit: 20 }).rows, ...listBookings({ status: 'quote_requested', limit: 20 }).rows];
  const agenda = upcoming(14);

  const byDay = new Map<string, typeof agenda>();
  for (const b of agenda) {
    const day = localDate(Date.parse(b.startAt!), s.timezone);
    byDay.set(day, [...(byDay.get(day) ?? []), b]);
  }

  return (
    <>
      <header className="admin-head">
        <h1>Today</h1>
        <p>{formatDate(businessToday(), s.locale)}</p>
      </header>

      {welcome && (
        <div className="notice" style={{ marginBottom: '2rem' }}>
          You&apos;re set up. Next: <Link href="/admin/services">add your services</Link>, <Link href="/admin/availability">set your hours</Link> and{' '}
          <Link href="/admin/settings">apply your branding</Link>.
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{counts.pending + counts.quotes}</div>
          <div className="stat-label">Waiting for you</div>
        </div>
        <div className="stat">
          <div className="stat-value">{counts.today}</div>
          <div className="stat-label">Booked today</div>
        </div>
        <div className="stat">
          <div className="stat-value">{counts.confirmed}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat">
          <div className="stat-value">{counts.quotes}</div>
          <div className="stat-label">Quote requests</div>
        </div>
      </div>

      {waiting.length > 0 && (
        <section className="section">
          <h2>Needs a decision</h2>
          <ul className="card-list">
            {waiting.map((b) => (
              <li key={b.id} className="spread">
                <div>
                  <strong>{b.customerName}</strong> · {b.serviceName}
                  <div className="muted small">
                    {b.startAt
                      ? `${formatDate(localDate(Date.parse(b.startAt), s.timezone), s.locale, 'short')}, ${formatTime(b.startAt, s.timezone, s.locale)}`
                      : `Quote, prefers ${b.preferredDate && formatDate(b.preferredDate, s.locale, 'short')}`}
                    {b.notes && <> · “{b.notes.slice(0, 80)}”</>}
                  </div>
                </div>
                <BookingActions booking={b} timezone={s.timezone} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <h2>Next two weeks</h2>
        {agenda.length === 0 ? (
          <p className="muted">Nothing booked yet.</p>
        ) : (
          <ul className="agenda">
            {[...byDay].map(([day, items]) => (
              <li key={day} className="agenda-day">
                <h3>{formatDate(day, s.locale)}</h3>
                {items.map((b) => (
                  <div key={b.id} className="agenda-item">
                    <time dateTime={b.startAt!}>
                      {formatTime(b.startAt!, s.timezone, s.locale)}–{formatTime(b.endAt!, s.timezone, s.locale)}
                    </time>
                    <span>
                      {b.customerName} · <span className="muted">{b.serviceName}</span>
                    </span>
                    <span className={`status status-${b.status}`}>{b.status === 'pending' ? 'Unconfirmed' : 'Confirmed'}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
