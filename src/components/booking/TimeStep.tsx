'use client';

import { useEffect, useState } from 'react';
import type { PublicConfig } from '@/server/settings';
import { formatDate, formatTime } from '@/lib/format';
import type { Service, Slot } from './BookingFlow';

interface Props {
  config: PublicConfig;
  service: Service;
  date: string;
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
  onBack: () => void;
}

type Load = { state: 'loading' } | { state: 'ready'; slots: Slot[] } | { state: 'error' };

export default function TimeStep({ config, service, date, selected, onSelect, onBack }: Props) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const visitorZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : config.timezone;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/slots?service=${service.id}&date=${date}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { slots: Slot[] }) => setLoad({ state: 'ready', slots: data.slots }))
      .catch((err) => {
        if (err?.name !== 'AbortError') setLoad({ state: 'error' });
      });
    return () => controller.abort();
  }, [service.id, date]);

  return (
    <>
      <h2>Choose a time</h2>
      <p className="muted" style={{ marginTop: '0.5rem' }}>
        {formatDate(date, config.locale)}
        {visitorZone !== config.timezone && <> · times are in {config.timezone.replace(/_/g, ' ')}</>}
      </p>

      <div style={{ marginTop: '1.5rem' }} aria-live="polite">
        {load.state === 'loading' && <p className="loading">Checking availability…</p>}
        {load.state === 'error' && <p className="notice notice-bad">We couldn&apos;t load times. Check your connection and try again.</p>}
        {load.state === 'ready' && load.slots.length === 0 && (
          <p className="muted">Nothing left on this day. Try another date.</p>
        )}
        {load.state === 'ready' && load.slots.length > 0 && (
          <div className="slots">
            {load.slots.map((slot) => (
              <button
                key={slot.start}
                type="button"
                className="btn slot"
                aria-pressed={selected?.start === slot.start}
                onClick={() => onSelect(slot)}
              >
                {formatTime(slot.start, config.timezone, config.locale)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          ← Back
        </button>
      </div>
    </>
  );
}
