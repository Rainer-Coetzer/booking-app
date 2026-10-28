import { connectionStatus, isConfigured, listCalendars } from '@/server/google-calendar';
import { getMailer } from '@/server/email/mailer';
import { appUrl } from '@/server/effects';
import { chooseCalendar, disconnectGoogle } from '../../actions';
import TestEmailButton from './TestEmailButton';

export const metadata = { title: 'Email & calendar' };

const GOOGLE_MESSAGES: Record<string, string> = {
  connected: 'Google Calendar connected.',
  denied: 'Google access was not granted.',
  invalid_state: 'That sign-in link expired or came from somewhere else. Try connecting again.',
  not_configured: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server first.',
  failed: 'Google rejected the connection. Check the client ID, secret and redirect URI.',
  missing_code: 'Google did not return an authorisation code.',
};

export default async function IntegrationsPage({ searchParams }: PageProps<'/admin/integrations'>) {
  const { google } = await searchParams;
  const status = connectionStatus();
  const calendars = status.connected ? await listCalendars() : [];
  const mailer = getMailer().name;
  const base = appUrl();

  return (
    <>
      <header className="admin-head">
        <h1>Email &amp; calendar</h1>
        <p>How confirmations reach customers and how bookings reach your calendar.</p>
      </header>

      {typeof google === 'string' && GOOGLE_MESSAGES[google] && (
        <p className={`notice ${google === 'connected' ? '' : 'notice-bad'}`} style={{ marginBottom: '2rem' }}>
          {GOOGLE_MESSAGES[google]}
        </p>
      )}

      <section>
        <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.75rem' }}>Email</h2>
        {mailer === 'console' ? (
          <p className="notice notice-bad">
            No email provider is configured, so messages are only written to the server log. Set <code>EMAIL_PROVIDER</code> to{' '}
            <code>smtp</code> or <code>resend</code>.
          </p>
        ) : (
          <p className="muted">
            Sending with <strong>{mailer}</strong> from <code>{process.env.EMAIL_FROM}</code>.
          </p>
        )}
        <TestEmailButton />
      </section>

      <section className="section">
        <h2>Google Calendar</h2>
        {!isConfigured() ? (
          <p className="muted">
            Not available until <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> are set. See docs/GOOGLE_CALENDAR.md.
          </p>
        ) : status.connected ? (
          <div className="stack">
            <p>
              <span className="status status-confirmed">Connected</span>
              <span className="muted"> · confirmed bookings are added, moved and removed automatically.</span>
            </p>
            {calendars.length > 0 && (
              <form action={chooseCalendar} className="row">
                <label className="label" htmlFor="calendarId">Add events to</label>
                <select id="calendarId" name="calendarId" className="input" style={{ width: 'auto' }} defaultValue={status.calendarId}>
                  {calendars.map((c) => (
                    <option key={c.id} value={c.primary ? 'primary' : c.id}>
                      {c.summary}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-sm">Save</button>
              </form>
            )}
            <form action={disconnectGoogle}>
              <button type="submit" className="btn btn-sm btn-danger">Disconnect</button>
            </form>
          </div>
        ) : (
          <div className="stack">
            {status.error && <p className="notice notice-bad">{status.error}</p>}
            <a className="btn btn-primary" href="/api/integrations/google/connect">
              Connect Google Calendar
            </a>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Put the booking page on your website</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Paste one of these into any site builder that accepts custom HTML. The script version resizes itself to fit.
        </p>
        <pre className="input" style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--step--1)' }}>
          {`<div data-booking-widget data-booking-url="${base}"></div>\n<script src="${base}/embed.js" async></script>`}
        </pre>
        <pre className="input" style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--step--1)', marginTop: '0.75rem' }}>
          {`<iframe src="${base}/embed" title="Book online" style="width:100%;height:760px;border:0"></iframe>`}
        </pre>
        <p className="hint" style={{ marginTop: '0.75rem' }}>
          Limit which sites may embed it with <code>EMBED_ALLOWED_ORIGINS</code>, e.g. <code>https://example.com</code>.
        </p>
      </section>
    </>
  );
}
