export function formatPrice(
  service: { priceCents: number | null; priceLabel: string; requiresQuote?: boolean },
  currency: string,
  locale: string,
): string {
  if (service.priceLabel) return service.priceLabel;
  if (service.priceCents == null) return service.requiresQuote ? 'Quoted on request' : '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: service.priceCents % 100 === 0 ? 0 : 2,
  }).format(service.priceCents / 100);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatTime(iso: string, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** A calendar date (YYYY-MM-DD) formatted without shifting it through a timezone. */
export function formatDate(date: string, locale: string, style: 'long' | 'short' = 'long'): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function parsePriceToCents(value: string): number | null {
  if (!value) return null;
  return Math.round(Number(value.replace(',', '.')) * 100);
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting approval',
  quote_requested: 'Quote requested',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
};
