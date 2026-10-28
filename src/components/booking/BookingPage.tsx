import { redirect } from 'next/navigation';
import { getPublicConfig, getSettings } from '@/server/settings';
import BookingFlow from './BookingFlow';
import EmbedResizer from './EmbedResizer';

/** Shared by the full page and the embed: they differ only in the intro column. */
export default function BookingPage({ embed = false }: { embed?: boolean }) {
  if (!getSettings()) redirect('/setup');
  const config = getPublicConfig();
  const { business } = config;

  if (embed) {
    return (
      <main className="embed">
        <EmbedResizer />
        <BookingFlow config={config} />
      </main>
    );
  }

  return (
    <main className="book">
      <header className="book-intro">
        {business.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary owner-supplied URL
          <img className="logo" src={business.logoUrl} alt="" />
        )}
        <h1>{business.name}</h1>
        {business.tagline && <p className="muted">{business.tagline}</p>}
        {(business.contactEmail || business.contactPhone) && (
          <div className="book-contact">
            {business.contactEmail && (
              <div>
                <a href={`mailto:${business.contactEmail}`}>{business.contactEmail}</a>
              </div>
            )}
            {business.contactPhone && <div>{business.contactPhone}</div>}
          </div>
        )}
        {business.showPoweredBy && process.env.POWERED_BY_TEXT && (
          <p className="powered">
            {process.env.POWERED_BY_URL ? <a href={process.env.POWERED_BY_URL}>{process.env.POWERED_BY_TEXT}</a> : process.env.POWERED_BY_TEXT}
          </p>
        )}
      </header>
      <BookingFlow config={config} />
    </main>
  );
}
