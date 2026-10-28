'use client';

import { useActionState } from 'react';
import { Field } from '@/components/admin/Field';
import { restore } from '@/components/admin/restore';
import { createBooking, type FormState } from '../../../actions';

export default function NewBookingForm({ services, timezone }: { services: { id: number; name: string }[]; timezone: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createBooking, {});
  const f = state.fields ?? {};
  const v = restore(state.values);
  return (
    <form action={action} style={{ maxWidth: '36rem' }}>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginBottom: '1.5rem' }}>
          {state.error}
        </p>
      )}
      <div className="field">
        <label className="label" htmlFor="serviceId">Service</label>
        <select id="serviceId" name="serviceId" className="input" required defaultValue={v.text('serviceId')}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid-2" style={{ marginTop: '1.125rem' }}>
        <Field name="date" label="Date" type="date" defaultValue={v.text('date')} error={f.date} required />
        <Field name="time" label="Start" type="time" hint={`In ${timezone.replace(/_/g, ' ')}`} defaultValue={v.text('time')} error={f.time} required />
      </div>
      <div style={{ marginTop: '1.125rem' }}>
        <Field name="name" label="Customer name" defaultValue={v.text('name')} error={f.name} required />
      </div>
      <div className="grid-2" style={{ marginTop: '1.125rem' }}>
        <Field name="email" label="Email" type="email" defaultValue={v.text('email')} error={f.email} required />
        <Field name="phone" label="Phone" type="tel" defaultValue={v.text('phone')} error={f.phone} required />
      </div>
      <div style={{ marginTop: '1.125rem' }}>
        <Field name="location" label="Location" defaultValue={v.text('location')} error={f.location} />
      </div>
      <div className="field" style={{ marginTop: '1.125rem' }}>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" className="input" maxLength={2000} defaultValue={v.text('notes')} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ marginTop: '1.75rem' }}>
        {pending ? 'Saving…' : 'Add booking'}
      </button>
    </form>
  );
}
