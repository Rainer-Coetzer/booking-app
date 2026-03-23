export interface SessionPackage {
  id: string;
  name: string;
  price: string;
  description: string;
  isCustom: boolean;
  duration: number; // minutes
}

export const SESSION_PACKAGES: SessionPackage[] = [
  {
    id: 'couple',
    name: 'Couple Session',
    price: 'N$650 / session',
    description: 'Capture your love story with a professional couple photoshoot.',
    isCustom: false,
    duration: 60,
  },
  {
    id: 'portrait',
    name: 'Single Portrait',
    price: 'N$650 / session',
    description: 'A personal portrait session tailored to your unique style.',
    isCustom: false,
    duration: 60,
  },
  {
    id: 'matric',
    name: 'Matric Photoshoot',
    price: 'N$800 / session',
    description: 'Celebrate your milestone with a stunning matric photoshoot.',
    isCustom: false,
    duration: 60,
  },
  {
    id: 'custom',
    name: 'Custom Session',
    price: 'Quote provided',
    description: 'For all events — weddings, corporate, and special occasions.',
    isCustom: true,
    duration: 0,
  },
];

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const BOOKING_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  QUOTE_REQUESTED: 'quote_requested',
} as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[keyof typeof BOOKING_STATUSES];
