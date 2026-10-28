import {
  Bricolage_Grotesque,
  Commissioner,
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Instrument_Sans,
  Instrument_Serif,
  Public_Sans,
} from 'next/font/google';

// next/font downloads these at build time and serves them from this origin,
// so visitors never make a request to Google and the CSP stays font-src 'self'.
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--f-instrument-serif', display: 'swap' });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--f-instrument-sans', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--f-fraunces', display: 'swap', preload: false });
const commissioner = Commissioner({ subsets: ['latin'], variable: '--f-commissioner', display: 'swap', preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--f-bricolage', display: 'swap', preload: false });
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--f-public-sans', display: 'swap', preload: false });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--f-plex-mono', display: 'swap', preload: false });
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--f-plex-sans', display: 'swap', preload: false });

export const fontVariables = [instrumentSerif, instrumentSans, fraunces, commissioner, bricolage, publicSans, plexMono, plexSans]
  .map((f) => f.variable)
  .join(' ');

/** Display and body pairings a business can choose between in Settings. */
export const FONT_PAIRS = {
  instrument: { label: 'Instrument Serif / Sans', display: 'var(--f-instrument-serif)', body: 'var(--f-instrument-sans)' },
  fraunces: { label: 'Fraunces / Commissioner', display: 'var(--f-fraunces)', body: 'var(--f-commissioner)' },
  bricolage: { label: 'Bricolage Grotesque / Public Sans', display: 'var(--f-bricolage)', body: 'var(--f-public-sans)' },
  plex: { label: 'IBM Plex Mono / Sans', display: 'var(--f-plex-mono)', body: 'var(--f-plex-sans)' },
} as const;

export type FontPair = keyof typeof FONT_PAIRS;
