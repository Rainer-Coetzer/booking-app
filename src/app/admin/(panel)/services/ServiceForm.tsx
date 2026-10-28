'use client';

import { useActionState } from 'react';
import type { Service } from '@/server/db/schema';
import { Field } from '@/components/admin/Field';
import { restore } from '@/components/admin/restore';
import { saveService, type FormState } from '../../actions';

export default function ServiceForm({ service, currency }: { service?: Service; currency: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveService, {});
  const f = state.fields ?? {};
  const v = restore(state.values);
  const id = service ? `svc-${service.id}` : 'svc-new';

  return (
    <form action={action} style={{ maxWidth: '40rem' }}>
      {service && <input type="hidden" name="id" value={service.id} />}
      {state.error && <p className="notice notice-bad" role="alert" style={{ marginBottom: '1rem' }}>{state.error}</p>}
      {state.message && <p className="notice" role="status" style={{ marginBottom: '1rem' }}>{state.message}</p>}

      <Field id={`${id}-name`} name="name" label="Name" defaultValue={v.text('name', service?.name)} error={f.name} required />
      <div className="field">
        <label className="label" htmlFor={`${id}-description`}>Description</label>
        <textarea id={`${id}-description`} name="description" className="input" defaultValue={v.text('description', service?.description)} maxLength={500} style={{ minHeight: '4.5rem' }} />
      </div>
      <div className="grid-2" style={{ marginTop: '1.125rem' }}>
        <Field id={`${id}-duration`} name="durationMinutes" label="Length (minutes)" type="number" min={5} step={5} defaultValue={v.text('durationMinutes', service?.durationMinutes ?? 60)} error={f.durationMinutes} required />
        <Field
          id={`${id}-price`}
          name="price"
          label={`Price (${currency})`}
          inputMode="decimal"
          defaultValue={v.text('price', service?.priceCents != null ? (service.priceCents / 100).toFixed(service.priceCents % 100 ? 2 : 0) : '')}
          hint="Leave empty to show no price."
          error={f.price}
        />
        <Field id={`${id}-label`} name="priceLabel" label="Price text" hint="Overrides the price, e.g. “From 400” or “Free”." defaultValue={v.text('priceLabel', service?.priceLabel)} error={f.priceLabel} />
        <Field id={`${id}-order`} name="sortOrder" label="Order" type="number" min={0} max={999} hint="Lower numbers are listed first." defaultValue={v.text('sortOrder', service?.sortOrder ?? 0)} />
      </div>
      <div className="row" style={{ marginTop: '1.125rem', gap: '1.5rem' }}>
        <label className="check">
          <input type="checkbox" name="requiresQuote" defaultChecked={v.checked('requiresQuote', service?.requiresQuote)} />
          <span>Quote only, no fixed time</span>
        </label>
        <label className="check">
          <input type="checkbox" name="active" defaultChecked={v.checked('active', service?.active ?? true)} />
          <span>Shown on booking page</span>
        </label>
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ marginTop: '1.5rem' }}>
        {pending ? 'Saving…' : service ? 'Save changes' : 'Add service'}
      </button>
    </form>
  );
}
