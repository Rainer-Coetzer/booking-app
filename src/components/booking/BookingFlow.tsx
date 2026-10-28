'use client';

import { useReducer } from 'react';
import type { PublicConfig } from '@/server/settings';
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
  | { type: 'back' }
  | { type: 'restart' };

const initial: State = { step: 'service', service: null, date: null, slot: null, result: null };

function stepsFor(service: Service | null): Step[] {
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
    case 'back': {
      const steps = stepsFor(state.service);
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
  const position = steps.indexOf(state.step);
  const back = () => dispatch({ type: 'back' });

  if (config.services.length === 0) {
    return <p className="muted">Online booking isn&apos;t open yet. Please get in touch directly.</p>;
  }

  return (
    <section aria-label="Booking">
      {state.step !== 'done' && (
        <div className="flow-head">
          <span className="eyebrow">
            Step {position + 1} of {steps.length}
          </span>
          <ol className="progress" aria-hidden="true">
            {steps.map((s, i) => (
              <li key={s} data-done={i <= position} />
            ))}
          </ol>
        </div>
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
