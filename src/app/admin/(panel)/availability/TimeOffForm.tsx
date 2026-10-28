'use client';

import { useActionState } from 'react';
import { Field } from '@/components/admin/Field';
import { restore } from '@/components/admin/restore';
import { addTimeOff, type FormState } from '../../actions';

export default function TimeOffForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addTimeOff, {});
  const f = state.fields ?? {};
  const v = restore(state.values);
  return (
    <form action={action} className="row" style={{ alignItems: 'flex-end' }}>
      <Field name="startDate" label="From" type="date" defaultValue={v.text('startDate')} error={f.startDate} required />
      <Field name="endDate" label="Until (optional)" type="date" defaultValue={v.text('endDate')} error={f.endDate ?? f._form} />
      <Field name="reason" label="Note" placeholder="Public holiday" defaultValue={v.text('reason')} error={f.reason} />
      <button type="submit" className="btn" disabled={pending}>
        Add time off
      </button>
      {state.error && !Object.keys(f).length && <span className="error">{state.error}</span>}
    </form>
  );
}
