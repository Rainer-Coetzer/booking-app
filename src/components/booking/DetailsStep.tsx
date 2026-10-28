'use client';

import { useState, type FormEvent } from 'react';
import type { PublicConfig } from '@/server/settings';
import { formatDate, formatDateTime, formatPrice } from '@/lib/format';
import type { Service, Slot } from './BookingFlow';

export interface BookingResult {
  status: string;
  startAt: string | null;
  preferredDate: string | null;
  manageToken: string;
}

interface Props {
  config: PublicConfig;
  service: Service;
  date: string;
  slot: Slot | null;
  onBooked: (result: BookingResult) => void;
  onBack: () => void;
  onSlotTaken: () => void;
}

export default function DetailsStep({ config, service, date, slot, onBooked, onBack, onSlotTaken }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [slotTaken, setSlotTaken] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError('');
    setFields({});

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          start: slot?.start,
          preferredDate: service.requiresQuote ? date : undefined,
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          location: form.get('location'),
          notes: form.get('notes'),
          website: form.get('website') || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) return onBooked(data.booking);
      setError(data.error ?? 'Something went wrong. Please try again.');
      setFields(data.fields ?? {});
      setSlotTaken(data.code === 'unavailable');
    } catch {
      setError('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className="input" aria-invalid={Boolean(fields[name])} aria-describedby={fields[name] ? `${name}-error` : undefined} {...props} />
      {fields[name] && (
        <span className="error" id={`${name}-error`}>
          {fields[name]}
        </span>
      )}
    </div>
  );

  return (
    <>
      <h2>Your details</h2>
      <p className="summary-line" style={{ marginTop: '1rem' }}>
        <strong>{service.name}</strong>
        <span>{slot ? formatDateTime(slot.start, config.timezone, config.locale) : `Preferred: ${formatDate(date, config.locale)}`}</span>
        <span>{formatPrice(service, config.currency, config.locale)}</span>
      </p>

      {error && (
        <div className="notice notice-bad" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}{' '}
          {slotTaken && (
            <button type="button" className="btn btn-sm" onClick={onSlotTaken}>
              Pick another time
            </button>
          )}
        </div>
      )}

      <form onSubmit={submit} noValidate={false}>
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">Leave this empty</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {field('name', 'Full name', { autoComplete: 'name', required: true, minLength: 2, maxLength: 100 })}
        <div className="grid-2" style={{ marginTop: '1.125rem' }}>
          {field('email', 'Email', { type: 'email', autoComplete: 'email', required: true, maxLength: 255 })}
          {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel', required: true, maxLength: 30 })}
        </div>
        <div style={{ marginTop: '1.125rem' }}>{field('location', 'Location (optional)', { maxLength: 255 })}</div>
        <div className="field" style={{ marginTop: '1.125rem' }}>
          <label className="label" htmlFor="notes">
            {service.requiresQuote ? 'Tell us about what you need' : 'Anything we should know? (optional)'}
          </label>
          <textarea id="notes" name="notes" className="input" maxLength={2000} required={service.requiresQuote} />
        </div>

        {config.business.bookingPolicy && <p className="hint" style={{ marginTop: '1.25rem' }}>{config.business.bookingPolicy}</p>}

        <div className="step-actions">
          <button type="button" className="btn btn-quiet" onClick={onBack} disabled={submitting}>
            ← Back
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending…' : service.requiresQuote ? 'Request a quote' : 'Book this time'}
          </button>
        </div>
      </form>
    </>
  );
}
