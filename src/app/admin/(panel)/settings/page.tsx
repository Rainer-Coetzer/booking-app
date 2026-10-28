import { requireSettings } from '@/server/settings';
import { FONT_PAIRS } from '@/app/fonts';
import SettingsForm from './SettingsForm';
import PasswordForm from './PasswordForm';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  const s = requireSettings();
  const fonts = Object.entries(FONT_PAIRS).map(([value, f]) => ({ value, label: f.label }));
  return (
    <>
      <header className="admin-head">
        <h1>Settings</h1>
        <p>Everything customers see on the booking page and in emails comes from here.</p>
      </header>
      <SettingsForm settings={s} fonts={fonts} />
      <section className="section">
        <h2>Your password</h2>
        <PasswordForm />
      </section>
    </>
  );
}
