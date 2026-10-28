import type { PublicConfig } from '@/server/settings';
import { formatDuration, formatPrice } from '@/lib/format';
import type { Service } from './BookingFlow';

export default function ServiceStep({ config, onSelect }: { config: PublicConfig; onSelect: (s: Service) => void }) {
  return (
    <>
      <h2>What would you like to book?</h2>
      <ul className="choice-list" style={{ marginTop: '1.5rem' }}>
        {config.services.map((service) => (
          <li key={service.id}>
            <button type="button" className="choice" onClick={() => onSelect(service)}>
              <span className="choice-name">{service.name}</span>
              <span className="choice-price">{formatPrice(service, config.currency, config.locale)}</span>
              <span className="choice-meta">
                {service.requiresQuote ? 'Request a quote' : formatDuration(service.durationMinutes)}
                {service.description && <> · {service.description}</>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
