/**
 * React 19 resets a form after every action, including failed ones. Feeding the
 * submitted values back in as defaults means a validation error never wipes
 * what was typed.
 */
export function restore(values: Record<string, string> | undefined) {
  return {
    text: (name: string, fallback?: string | number | null) => (values ? (values[name] ?? '') : (fallback ?? '')),
    checked: (name: string, fallback?: boolean | null) => (values ? values[name] === 'on' : Boolean(fallback)),
  };
}
