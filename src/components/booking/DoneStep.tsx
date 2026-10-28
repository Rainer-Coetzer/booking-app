import type { PublicConfig } from '@/server/settings';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Service } from './BookingFlow';
import type { BookingResult } from './DetailsStep';

interface Props {
  config: PublicConfig;
  service: Service;
  result: BookingResult;
  onRestart: () => void;
}

export default function DoneStep({ config, service, result, onRestart }: Props) {
  const heading =
    result.status === 'confirmed' ? "You're booked in." : result.status === 'quote_requested' ? 'Request sent.' : 'Request received.';
  const lead =
    result.status === 'confirmed'
      ? 'A confirmation with a calendar invite is on its way to your inbox.'
      : result.status === 'quote_requested'
        ? `${config.business.name} will reply with a quote and confirm a date.`
        : `${config.business.name} will confirm shortly. You'll get an email either way.`;

  return (
    <div className="done">
      <h2>{heading}</h2>
      <p className="muted" style={{ marginTop: '0.75rem' }}>{lead}</p>

      <dl className="facts">
        <dt>Service</dt>
        <dd>{service.name}</dd>
        <dt>{result.startAt ? 'When' : 'Preferred date'}</dt>
        <dd>
          {result.startAt
            ? formatDateTime(result.startAt, config.timezone, config.locale)
            : result.preferredDate && formatDate(result.preferredDate, config.locale)}
        </dd>
      </dl>

      <div className="row">
        <a className="btn" href={`/manage/${result.manageToken}`} target="_top">
          View or cancel
        </a>
        <button type="button" className="btn btn-quiet" onClick={onRestart}>
          Make another booking
        </button>
      </div>
    </div>
  );
}
