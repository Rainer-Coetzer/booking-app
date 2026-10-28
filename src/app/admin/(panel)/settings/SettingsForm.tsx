'use client';

import { useActionState, useState } from 'react';
import type { Settings } from '@/server/db/schema';
import { Field } from '@/components/admin/Field';
import { contrast } from '@/lib/color';
import { restore } from '@/components/admin/restore';
import { saveSettings, type FormState } from '../../actions';

function Colour({ name, label, value, onChange, error }: { name: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <div className="row" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
        <input type="color" className="swatch" aria-label={`${label} picker`} value={value} onChange={(e) => onChange(e.target.value)} />
        <input id={name} name={name} className="input" value={value} onChange={(e) => onChange(e.target.value)} pattern="#[0-9a-fA-F]{6}" aria-invalid={Boolean(error)} required />
      </div>
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export default function SettingsForm({ settings: s, fonts }: { settings: Settings; fonts: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const [colors, setColors] = useState({ accent: s.colorAccent, background: s.colorBackground, text: s.colorText });
  const f = state.fields ?? {};
  const v = restore(state.values);
  const ratio = /^#[0-9a-f]{6}$/i.test(colors.text) && /^#[0-9a-f]{6}$/i.test(colors.background) ? contrast(colors.text, colors.background) : 0;

  return (
    <form action={action} style={{ maxWidth: '44rem' }}>
      {state.error && <p className="notice notice-bad" role="alert" style={{ marginBottom: '1.5rem' }}>{state.error}</p>}
      {state.message && <p className="notice" role="status" style={{ marginBottom: '1.5rem' }}>{state.message}</p>}

      <fieldset className="fieldset">
        <legend>Business</legend>
        <Field name="businessName" label="Name" defaultValue={v.text('businessName', s.businessName)} error={f.businessName} required />
        <Field name="tagline" label="Tagline" hint="A line under your name on the booking page." defaultValue={v.text('tagline', s.tagline)} error={f.tagline} />
        <Field name="logoUrl" label="Logo URL" type="url" placeholder="https://" defaultValue={v.text('logoUrl', s.logoUrl)} error={f.logoUrl} />
        <div className="grid-2" style={{ marginTop: '1.125rem' }}>
          <Field name="contactEmail" label="Public email" type="email" hint="Customers reply to this." defaultValue={v.text('contactEmail', s.contactEmail)} error={f.contactEmail} />
          <Field name="contactPhone" label="Public phone" defaultValue={v.text('contactPhone', s.contactPhone)} error={f.contactPhone} />
        </div>
        <div style={{ marginTop: '1.125rem' }}>
          <Field name="notificationEmail" label="Send new booking alerts to" type="email" defaultValue={v.text('notificationEmail', s.notificationEmail)} error={f.notificationEmail} />
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Region</legend>
        <div className="grid-2">
          <Field name="timezone" label="Timezone" defaultValue={v.text('timezone', s.timezone)} hint="IANA name, e.g. Europe/London" error={f.timezone} required />
          <Field name="locale" label="Language and region" defaultValue={v.text('locale', s.locale)} hint="e.g. en-GB, af-ZA, de-DE" error={f.locale} required />
          <Field name="currency" label="Currency" defaultValue={v.text('currency', s.currency)} maxLength={3} hint="ISO code" error={f.currency} required />
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Look</legend>
        <div className="grid-2">
          <Colour name="colorAccent" label="Accent" value={colors.accent} onChange={(accent) => setColors({ ...colors, accent })} error={f.colorAccent} />
          <Colour name="colorBackground" label="Background" value={colors.background} onChange={(background) => setColors({ ...colors, background })} error={f.colorBackground} />
          <Colour name="colorText" label="Text" value={colors.text} onChange={(text) => setColors({ ...colors, text })} error={f.colorText} />
          <div className="field">
            <label className="label" htmlFor="fontFamily">Typefaces</label>
            <select id="fontFamily" name="fontFamily" className="input" defaultValue={v.text('fontFamily', s.fontFamily)}>
              {fonts.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className={ratio >= 4.5 ? 'hint' : 'error'} style={{ marginTop: '0.75rem' }}>
          Text contrast {ratio.toFixed(1)}:1 {ratio >= 4.5 ? '(readable)' : '(needs at least 4.5:1)'}
        </p>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Booking rules</legend>
        <div className="grid-2">
          <Field name="slotIntervalMinutes" label="Offer a start time every (minutes)" type="number" min={5} max={240} defaultValue={v.text('slotIntervalMinutes', s.slotIntervalMinutes)} error={f.slotIntervalMinutes} required />
          <Field name="bufferMinutes" label="Gap between bookings (minutes)" type="number" min={0} max={240} defaultValue={v.text('bufferMinutes', s.bufferMinutes)} error={f.bufferMinutes} required />
          <Field name="minNoticeHours" label="Minimum notice (hours)" type="number" min={0} defaultValue={v.text('minNoticeHours', s.minNoticeHours)} error={f.minNoticeHours} required />
          <Field name="maxAdvanceDays" label="Book up to (days ahead)" type="number" min={1} max={730} defaultValue={v.text('maxAdvanceDays', s.maxAdvanceDays)} error={f.maxAdvanceDays} required />
        </div>
        <label className="check" style={{ marginTop: '1.25rem' }}>
          <input type="checkbox" name="requireApproval" defaultChecked={v.checked('requireApproval', s.requireApproval)} />
          <span>
            Approve each booking myself
            <span className="hint" style={{ display: 'block' }}>Off: bookings are confirmed instantly. The slot is held either way.</span>
          </span>
        </label>
        <div className="field" style={{ marginTop: '1.25rem' }}>
          <label className="label" htmlFor="bookingPolicy">Booking policy</label>
          <textarea id="bookingPolicy" name="bookingPolicy" className="input" defaultValue={v.text('bookingPolicy', s.bookingPolicy)} maxLength={2000} placeholder="Cancellation terms, deposits, what to bring." />
          <span className="hint">Shown above the booking button.</span>
        </div>
        <label className="check" style={{ marginTop: '1.25rem' }}>
          <input type="checkbox" name="showPoweredBy" defaultChecked={v.checked('showPoweredBy', s.showPoweredBy)} />
          <span>Show the platform credit on the booking page</span>
        </label>
      </fieldset>

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ marginTop: '2rem' }}>
        {pending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
