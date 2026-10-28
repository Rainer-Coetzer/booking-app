'use client';

import { useActionState, useState, useSyncExternalStore } from 'react';
import { setup, type FormState } from './actions';
import { Field } from '@/components/admin/Field';
import { restore } from '@/components/admin/restore';

const noop = () => () => {};
const NO_ZONES: string[] = [];
let zoneCache: string[] | undefined;
const allZones = () => (zoneCache ??= Intl.supportedValuesOf('timeZone'));

export default function SetupForm({ needsToken }: { needsToken: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setup, {});
  // Browser-only values: the server renders the fallback, the client swaps in its own after hydration.
  const browserZone = useSyncExternalStore(noop, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => 'UTC');
  const zones = useSyncExternalStore(noop, allZones, () => NO_ZONES);
  const [edited, setEdited] = useState<string | null>(null);
  const timezone = edited ?? browserZone;
  const f = state.fields ?? {};
  const v = restore(state.values);

  return (
    <form action={action} style={{ marginTop: '2rem' }}>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginBottom: '1.5rem' }}>
          {state.error}
        </p>
      )}

      <fieldset className="fieldset">
        <legend>Business</legend>
        <Field name="businessName" label="Business name" defaultValue={v.text('businessName')} error={f.businessName} required />
        <div className="grid-2" style={{ marginTop: '1.125rem' }}>
          <Field
            name="timezone"
            label="Timezone"
            hint="Opening hours and slots use this zone."
            error={f.timezone}
            value={timezone}
            onChange={(e) => setEdited(e.target.value)}
            required
            list="timezones"
          />
          <Field name="currency" label="Currency" hint="ISO code, e.g. USD, EUR, NAD" error={f.currency} defaultValue={v.text('currency', 'USD')} maxLength={3} required />
        </div>
        <datalist id="timezones">
          {zones.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Owner account</legend>
        <Field name="name" label="Your name" defaultValue={v.text('name')} error={f.name} autoComplete="name" />
        <Field name="email" label="Email" type="email" defaultValue={v.text('email')} error={f.email} autoComplete="email" required />
        <Field name="password" label="Password" type="password" hint="At least 12 characters." error={f.password} autoComplete="new-password" minLength={12} required />
        {needsToken && <Field name="setupToken" label="Setup token" hint="The SETUP_TOKEN value from the server environment." error={f.setupToken} required />}
      </fieldset>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ marginTop: '2rem' }}>
        {pending ? 'Setting up…' : 'Create account'}
      </button>
    </form>
  );
}
