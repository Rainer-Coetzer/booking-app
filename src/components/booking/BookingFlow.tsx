'use client';

import { useReducer } from 'react';
import type { PublicConfig } from '@/server/settings';
import { formatDate, formatTime } from '@/lib/format';
import ServiceStep from './ServiceStep';
import DateStep from './DateStep';
import TimeStep from './TimeStep';
import DetailsStep, { type BookingResult } from './DetailsStep';
import DoneStep from './DoneStep';

export type Service = PublicConfig['services'][number];
export interface Slot {
  start: string;
  end: string;
}

type Step = 'service' | 'date' | 'time' | 'details' | 'done';

interface State {
  step: Step;
  service: Service | null;
  date: string | null;
  slot: Slot | null;
  result: BookingResult | null;
}

type Action =
  | { type: 'service'; service: Service }
  | { type: 'date'; date: string }
  | { type: 'slot'; slot: Slot }
  | { type: 'booked'; result: BookingResult }
  | { type: 'goto'; step: Step }
  | { type: 'back' }
  | { type: 'restart' };

const initial: State = { step: 'service', service: null, date: null, slot: null, result: null };

const LABELS: Record<Exclude<Step, 'done'>, string> = {
  service: 'Service',
  date: 'Day',
  time: 'Time',
  details: 'Your details',
};

function stepsFor(service: Service | null): Exclude<Step, 'done'>[] {
  return service?.requiresQuote ? ['service', 'date', 'details'] : ['service', 'date', 'time', 'details'];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'service':
      return { ...initial, service: action.service, step: 'date' };
    case 'date':
      return { ...state, date: action.date, slot: null, step: state.service?.requiresQuote ? 'details' : 'time' };
    case 'slot':
      return { ...state, slot: action.slot, step: 'details' };
    case 'booked':
      return { ...state, result: action.result, step: 'done' };
    case 'goto':
      return { ...state, step: action.step };
    case 'back': {
      const steps: Step[] = stepsFor(state.service);
      const i = steps.indexOf(state.step);
      return i > 0 ? { ...state, step: steps[i - 1] } : state;
    }
    case 'restart':
      return initial;
  }
}

export default function BookingFlow({ config }: { config: PublicConfig }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const steps = stepsFor(state.service);
  const position = steps.indexOf(state.step as Exclude<Step, 'done'>);
  const back = () => dispatch({ type: 'back' });

  if (config.services.length === 0) {
    return (
      <div className="empty">
        <h2>Online booking opens soon</h2>
        <p className="muted">
          {config.business.contactEmail || config.business.contactPhone
            ? `In the meantime, get in touch on ${config.business.contactEmail || config.business.contactPhone}.`
            : 'Please get in touch directly in the meantime.'}
        </p>
      </div>
    );
  }

  // What was picked at each finished step, so the stepper doubles as a summary.
  const chosen: Partial<Record<Exclude<Step, 'done'>, string>> = {
    service: state.service?.name,
    date: state.date ? formatDate(state.date, config.locale, 'short') : undefined,
    time: state.slot ? formatTime(state.slot.start, config.timezone, config.locale) : undefined,
  };

  return (
    <section aria-label="Booking" className="flow">
      {state.step !== 'done' && (
        <ol className="stepper">
          {steps.map((s, i) => {
            const done = i < position;
            return (
              <li key={s} aria-current={i === position ? 'step' : undefined} data-done={done}>
                {done ? (
                  <button type="button" onClick={() => dispatch({ type: 'goto', step: s })} aria-label={`Change ${LABELS[s].toLowerCase()}: ${chosen[s]}`}>
                    <span className="stepper-label">{LABELS[s]}</span>
                    <span className="stepper-value">{chosen[s]}</span>
                  </button>
                ) : (
                  <span className="stepper-label">{LABELS[s]}</span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="step" key={state.step}>
        {state.step === 'service' && (
          <ServiceStep config={config} onSelect={(service) => dispatch({ type: 'service', service })} />
        )}
        {state.step === 'date' && state.service && (
          <DateStep
            config={config}
            service={state.service}
            selected={state.date}
            onSelect={(date) => dispatch({ type: 'date', date })}
            onBack={back}
          />
        )}
        {state.step === 'time' && state.service && state.date && (
          <TimeStep
            config={config}
            service={state.service}
            date={state.date}
            selected={state.slot}
            onSelect={(slot) => dispatch({ type: 'slot', slot })}
            onBack={back}
          />
        )}
        {state.step === 'details' && state.service && state.date && (
          <DetailsStep
            config={config}
            service={state.service}
            date={state.date}
            slot={state.slot}
            onBooked={(result) => dispatch({ type: 'booked', result })}
            onBack={back}
            onSlotTaken={back}
          />
        )}
        {state.step === 'done' && state.service && state.result && (
          <DoneStep config={config} service={state.service} result={state.result} onRestart={() => dispatch({ type: 'restart' })} />
        )}
      </div>
    </section>
  );
}
