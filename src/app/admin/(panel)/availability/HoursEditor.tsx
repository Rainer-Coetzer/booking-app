'use client';

import { useActionState, useState } from 'react';
import { saveAvailability, type FormState } from '../../actions';

interface Rule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// Monday first: it is how most businesses think about their week.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function HoursEditor({ initial, locale }: { initial: Rule[]; locale: string }) {
  const [rules, setRules] = useState(initial);
  const [state, action, pending] = useActionState<FormState, FormData>(saveAvailability, {});
  const dayName = (d: number) =>
    new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + d)));

  const update = (index: number, patch: Partial<Rule>) => setRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) => setRules(rules.filter((_, i) => i !== index));
  const add = (day: number) => {
    const last = rules.filter((r) => r.dayOfWeek === day).at(-1);
    const startTime = last ? last.endTime : '09:00';
    setRules([...rules, { dayOfWeek: day, startTime, endTime: startTime < '17:00' ? '17:00' : '23:59' }]);
  };

  return (
    <form action={action}>
      <input type="hidden" name="rules" value={JSON.stringify(rules)} />
      <div className="week">
        {ORDER.map((day) => {
          const ranges = rules.map((r, i) => ({ r, i })).filter(({ r }) => r.dayOfWeek === day);
          return (
            <div key={day} className="week-day">
              <strong>{dayName(day)}</strong>
              <div className="ranges">
                {ranges.length === 0 && <span className="muted">Closed</span>}
                {ranges.map(({ r, i }) => (
                  <div key={i} className="range">
                    <input type="time" className="input" aria-label={`${dayName(day)} opens`} value={r.startTime} onChange={(e) => update(i, { startTime: e.target.value })} required />
                    <span className="muted">to</span>
                    <input type="time" className="input" aria-label={`${dayName(day)} closes`} value={r.endTime} onChange={(e) => update(i, { endTime: e.target.value })} required />
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => remove(i)}>
                      Remove
                    </button>
                  </div>
                ))}
                <div>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => add(day)}>
                    + {ranges.length ? 'Add another range' : 'Open this day'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: '1.5rem' }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save hours'}
        </button>
        {state.error && <span className="error" role="alert">{state.error}</span>}
        {state.message && <span className="muted small" role="status">{state.message}</span>}
      </div>
    </form>
  );
}
