'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { PublicConfig } from '@/server/settings';
import { addDays, dayOfWeek, isInTimeOff } from '@/lib/availability';
import type { Service } from './BookingFlow';
import { ArrowLeft, CaretLeft, CaretRight } from '@phosphor-icons/react';

interface Props {
  config: PublicConfig;
  service: Service;
  selected: string | null;
  onSelect: (date: string) => void;
  onBack: () => void;
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(first: string, delta: number) {
  const [y, m] = first.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

export default function DateStep({ config, service, selected, onSelect, onBack }: Props) {
  const today = config.today;
  const lastDay = addDays(today, config.maxAdvanceDays);
  const [month, setMonth] = useState(monthStart(selected ?? today));
  const [focused, setFocused] = useState(selected ?? today);
  const grid = useRef<HTMLDivElement>(null);

  const isOpen = (date: string) =>
    date >= today &&
    date <= lastDay &&
    !isInTimeOff(date, config.timeOff) &&
    // Quote requests are for a preferred date, so the weekly hours do not apply to them.
    (service.requiresQuote || config.openWeekdays.includes(dayOfWeek(date)));

  const days = useMemo(() => {
    const lead = dayOfWeek(month);
    const start = addDays(month, -lead);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const monthLabel = new Intl.DateTimeFormat(config.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}T00:00:00Z`),
  );
  const weekdayLabels = days.slice(0, 7).map((d) =>
    new Intl.DateTimeFormat(config.locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`)),
  );

  function moveFocus(to: string) {
    if (to < today || to > lastDay) return;
    setFocused(to);
    if (monthStart(to) !== month) setMonth(monthStart(to));
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-date="${to}"]`)?.focus());
  }

  function onKey(e: KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      moveFocus(addDays(focused, step));
    }
  }

  const canGoBack = month > monthStart(today);
  const canGoForward = shiftMonth(month, 1) <= lastDay;

  return (
    <>
      <h2>{service.requiresQuote ? 'Which date suits you?' : 'Pick a day'}</h2>
      {service.requiresQuote && <p className="muted" style={{ marginTop: '0.5rem' }}>We&apos;ll confirm availability with your quote.</p>}

      <div className="calendar" style={{ marginTop: '1.5rem' }}>
        <div className="calendar-nav">
          <button type="button" className="btn btn-quiet" onClick={() => setMonth(shiftMonth(month, -1))} disabled={!canGoBack} aria-label="Previous month">
            <CaretLeft size={18} aria-hidden="true" />
          </button>
          <span aria-live="polite">{monthLabel}</span>
          <button type="button" className="btn btn-quiet" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!canGoForward} aria-label="Next month">
            <CaretRight size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="calendar-grid" ref={grid} onKeyDown={onKey}>
          {weekdayLabels.map((label) => (
            <div key={label} className="calendar-dow" aria-hidden="true">
              {label}
            </div>
          ))}
          {days.map((date) => {
            const outside = date.slice(0, 7) !== month.slice(0, 7);
            const open = !outside && isOpen(date);
            return (
              <button
                key={date}
                type="button"
                className="calendar-day"
                data-date={date}
                data-outside={outside}
                data-today={date === today}
                aria-pressed={date === selected}
                aria-label={new Intl.DateTimeFormat(config.locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))}
                tabIndex={date === focused && !outside ? 0 : -1}
                disabled={!open}
                onFocus={() => setFocused(date)}
                onClick={() => onSelect(date)}
              >
                {Number(date.slice(8))}
              </button>
            );
          })}
        </div>
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
      </div>
    </>
  );
}
