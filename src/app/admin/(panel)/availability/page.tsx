import { listRules, listTimeOff, requireSettings } from '@/server/settings';
import { formatDate } from '@/lib/format';
import HoursEditor from './HoursEditor';
import TimeOffForm from './TimeOffForm';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { removeTimeOff } from '../../actions';

export const metadata = { title: 'Hours & time off' };

export default function AvailabilityPage() {
  const s = requireSettings();
  const rules = listRules().map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
  const off = listTimeOff({ upcomingOnly: true, timezone: s.timezone });

  return (
    <>
      <header className="admin-head">
        <h1>Hours &amp; time off</h1>
        <p>
          When customers can book, in {s.timezone.replace(/_/g, ' ')}. Add a second range to a day for a lunch break. Slot length, buffers
          and notice are under Settings.
        </p>
      </header>

      <HoursEditor initial={rules} locale={s.locale} />

      <section className="section">
        <h2>Time off</h2>
        <p className="muted small" style={{ marginBottom: '1.25rem' }}>
          Holidays and days away. Existing bookings on these dates stay in place; move or cancel them yourself.
        </p>
        <TimeOffForm />
        {off.length > 0 && (
          <ul className="card-list" style={{ marginTop: '1.5rem' }}>
            {off.map((t) => (
              <li key={t.id} className="spread">
                <span>
                  {formatDate(t.startDate, s.locale, 'short')}
                  {t.endDate !== t.startDate && <> to {formatDate(t.endDate, s.locale, 'short')}</>}
                  {t.reason && <span className="muted"> · {t.reason}</span>}
                </span>
                <form action={removeTimeOff}>
                  <input type="hidden" name="id" value={t.id} />
                  <ConfirmButton className="btn btn-quiet btn-sm" message="Remove this time off?">
                    Remove
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
