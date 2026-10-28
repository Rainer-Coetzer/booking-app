export type Status = 'pending' | 'quote_requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export const TRANSITIONS: Record<Status, Status[]> = {
  pending: ['confirmed', 'declined', 'cancelled'],
  quote_requested: ['declined', 'cancelled'], // confirmed only by scheduling a time
  confirmed: ['cancelled', 'completed'],
  declined: [],
  cancelled: [],
  completed: [],
};

export const ACTION_LABELS: Partial<Record<Status, string>> = {
  confirmed: 'Confirm',
  declined: 'Decline',
  cancelled: 'Cancel',
  completed: 'Mark done',
};
