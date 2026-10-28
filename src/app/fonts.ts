import { Bricolage_Grotesque, EB_Garamond, Geist, IBM_Plex_Mono, IBM_Plex_Sans, Public_Sans } from 'next/font/google';

// next/font downloads these at build time and serves them from this origin,
// so visitors never make a request to Google and the CSP stays font-src 'self'.
const geist = Geist({ subsets: ['latin'], variable: '--f-geist', display: 'swap' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--f-bricolage', display: 'swap', preload: false });
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--f-public-sans', display: 'swap', preload: false });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--f-plex-mono', display: 'swap', preload: false });
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--f-plex-sans', display: 'swap', preload: false });
const garamond = EB_Garamond({ subsets: ['latin'], variable: '--f-garamond', display: 'swap', preload: false });

export const fontVariables = [geist, bricolage, publicSans, plexMono, plexSans, garamond].map((f) => f.variable).join(' ');

/**
 * Display and body pairings a business can choose between in Settings.
 * Sans by default; the one serif is there for businesses that want an
 * editorial voice on purpose, not as the house style.
 */
export const FONT_PAIRS = {
  geist: { label: 'Geist', display: 'var(--f-geist)', body: 'var(--f-geist)', weight: 600 },
  bricolage: { label: 'Bricolage Grotesque / Public Sans', display: 'var(--f-bricolage)', body: 'var(--f-public-sans)', weight: 600 },
  plex: { label: 'IBM Plex Mono / Plex Sans', display: 'var(--f-plex-mono)', body: 'var(--f-plex-sans)', weight: 500 },
  garamond: { label: 'EB Garamond / Public Sans (editorial)', display: 'var(--f-garamond)', body: 'var(--f-public-sans)', weight: 500 },
} as const;

export type FontPair = keyof typeof FONT_PAIRS;
