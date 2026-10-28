// A short list of the most common throwaway providers. It will never be
// complete; it exists to stop the laziest spam, not determined abuse.
const DOMAINS = new Set([
  '10minutemail.com',
  'dispostable.com',
  'fakeinbox.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'mailinator.com',
  'maildrop.cc',
  'sharklasers.com',
  'temp-mail.org',
  'tempail.com',
  'tempmail.com',
  'throwaway.email',
  'trashmail.com',
  'yopmail.com',
]);

export function isDisposableEmail(email: string): boolean {
  return DOMAINS.has(email.split('@')[1]?.toLowerCase() ?? '');
}
