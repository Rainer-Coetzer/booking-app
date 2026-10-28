import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { headers } from 'next/headers';
import { getSettings } from '@/server/settings';
import { readableOn } from '@/lib/color';
import { FONT_PAIRS, fontVariables, type FontPair } from './fonts';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const s = getSettings();
  const name = s?.businessName ?? 'Bookings';
  return {
    title: { default: `Book | ${name}`, template: `%s | ${name}` },
    description: s?.tagline || `Book an appointment with ${name}.`,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading headers opts every page into dynamic rendering, which the per-request CSP nonce needs.
  await headers();
  const s = getSettings();
  const fonts = FONT_PAIRS[s?.fontFamily as FontPair] ?? FONT_PAIRS.geist;
  const accent = s?.colorAccent ?? '#2c48c5';

  // Only the brand inputs go inline; globals.css derives the ramp and the dark variant.
  const theme = {
    '--brand-bg': s?.colorBackground ?? '#f6f7f8',
    '--brand-ink': s?.colorText ?? '#16181d',
    '--accent': accent,
    '--on-accent': readableOn(accent),
    '--font-display': fonts.display,
    '--font-body': fonts.body,
    '--display-weight': fonts.weight,
  } as CSSProperties;

  return (
    <html lang={s?.locale ?? 'en'} className={fontVariables} style={theme} data-scheme={s?.colorScheme ?? 'auto'}>
      <body>{children}</body>
    </html>
  );
}
