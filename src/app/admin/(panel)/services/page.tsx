import { listServices, requireSettings } from '@/server/settings';
import { formatDuration, formatPrice } from '@/lib/format';
import ServiceForm from './ServiceForm';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { deleteService } from '../../actions';

export const metadata = { title: 'Services' };

export default function ServicesPage() {
  const s = requireSettings();
  const services = listServices({ includeInactive: true });

  return (
    <>
      <header className="admin-head">
        <h1>Services</h1>
        <p>What customers can book. Quote-only services collect a preferred date instead of a fixed time.</p>
      </header>

      <ul className="card-list">
        {services.map((svc) => (
          <li key={svc.id}>
            <details>
              <summary className="spread" style={{ cursor: 'pointer' }}>
                <span>
                  <strong>{svc.name}</strong>
                  {!svc.active && <span className="muted"> · hidden</span>}
                </span>
                <span className="muted small">
                  {svc.requiresQuote ? 'Quote only' : formatDuration(svc.durationMinutes)} · {formatPrice(svc, s.currency, s.locale) || 'No price shown'}
                </span>
              </summary>
              <div style={{ marginTop: '1.25rem' }}>
                <ServiceForm service={svc} currency={s.currency} />
                <form action={deleteService} style={{ marginTop: '0.75rem' }}>
                  <input type="hidden" name="id" value={svc.id} />
                  <ConfirmButton className="btn btn-quiet btn-sm btn-danger" message={`Delete ${svc.name}? Existing bookings keep their details.`}>
                    Delete service
                  </ConfirmButton>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>

      <section className="section">
        <h2>Add a service</h2>
        <ServiceForm currency={s.currency} />
      </section>
    </>
  );
}
