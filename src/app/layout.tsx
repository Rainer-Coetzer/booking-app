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
  const fonts = FONT_PAIRS[(s?.fontFamily as FontPair) ?? 'instrument'] ?? FONT_PAIRS.instrument;

  const theme = {
    '--bg': s?.colorBackground ?? '#f7f5f0',
    '--ink': s?.colorText ?? '#1c1b19',
    '--accent': s?.colorAccent ?? '#1f4d3a',
    '--on-accent': readableOn(s?.colorAccent ?? '#1f4d3a'),
    '--font-display': fonts.display,
    '--font-body': fonts.body,
  } as CSSProperties;

  return (
    <html lang={s?.locale ?? 'en'} className={fontVariables} style={theme}>
      <body>{children}</body>
    </html>
  );
}
