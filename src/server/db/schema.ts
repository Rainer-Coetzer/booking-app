import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const BOOKING_STATUSES = [
  'pending',
  'quote_requested',
  'confirmed',
  'declined',
  'cancelled',
  'completed',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that hold a slot on the calendar. */
export const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'confirmed'];

export const settings = sqliteTable(
  'settings',
  {
    id: integer('id').primaryKey(),
    businessName: text('business_name').notNull(),
    tagline: text('tagline').notNull().default(''),
    logoUrl: text('logo_url').notNull().default(''),
    contactEmail: text('contact_email').notNull().default(''),
    contactPhone: text('contact_phone').notNull().default(''),
    notificationEmail: text('notification_email').notNull().default(''),
    timezone: text('timezone').notNull(),
    locale: text('locale').notNull().default('en'),
    currency: text('currency').notNull().default('USD'),
    // Light-mode brand colours; dark mode is derived from them.
    colorAccent: text('color_accent').notNull().default('#2c48c5'),
    colorBackground: text('color_background').notNull().default('#f6f7f8'),
    colorText: text('color_text').notNull().default('#16181d'),
    colorScheme: text('color_scheme', { enum: ['auto', 'light', 'dark'] }).notNull().default('auto'),
    fontFamily: text('font_family').notNull().default('geist'),
    coverImageUrl: text('cover_image_url').notNull().default(''),
    slotIntervalMinutes: integer('slot_interval_minutes').notNull().default(30),
    bufferMinutes: integer('buffer_minutes').notNull().default(0),
    minNoticeHours: integer('min_notice_hours').notNull().default(12),
    maxAdvanceDays: integer('max_advance_days').notNull().default(90),
    requireApproval: integer('require_approval', { mode: 'boolean' }).notNull().default(true),
    showPoweredBy: integer('show_powered_by', { mode: 'boolean' }).notNull().default(false),
    bookingPolicy: text('booking_policy').notNull().default(''),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => [check('settings_single_row', sql`${t.id} = 1`)],
);

export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  durationMinutes: integer('duration_minutes').notNull(),
  priceCents: integer('price_cents'),
  priceLabel: text('price_label').notNull().default(''),
  requiresQuote: integer('requires_quote', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(now),
});

export const availabilityRules = sqliteTable(
  'availability_rules',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
  },
  (t) => [
    index('availability_rules_day_idx').on(t.dayOfWeek),
    check('availability_rules_day', sql`${t.dayOfWeek} BETWEEN 0 AND 6`),
    check('availability_rules_order', sql`${t.startTime} < ${t.endTime}`),
  ],
);

export const timeOff = sqliteTable(
  'time_off',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    reason: text('reason').notNull().default(''),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [check('time_off_order', sql`${t.startDate} <= ${t.endDate}`)],
);

export const bookings = sqliteTable(
  'bookings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
    serviceName: text('service_name').notNull(),
    priceCents: integer('price_cents'),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    location: text('location').notNull().default(''),
    notes: text('notes').notNull().default(''),
    // Quote requests carry only a preferred date; timed bookings carry start/end in UTC.
    preferredDate: text('preferred_date'),
    startAt: text('start_at'),
    endAt: text('end_at'),
    status: text('status', { enum: BOOKING_STATUSES }).notNull(),
    // Hash for lookup; encrypted copy so later emails can repeat the customer's link.
    manageTokenHash: text('manage_token_hash').notNull(),
    manageTokenEnc: text('manage_token_enc').notNull(),
    googleEventId: text('google_event_id'),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => [
    index('bookings_start_idx').on(t.startAt),
    index('bookings_status_idx').on(t.status),
    uniqueIndex('bookings_manage_token_idx').on(t.manageTokenHash),
    check(
      'bookings_status',
      sql`${t.status} IN ('pending','quote_requested','confirmed','declined','cancelled','completed')`,
    ),
    check('bookings_times', sql`(${t.startAt} IS NULL) = (${t.endAt} IS NULL)`),
  ],
);

export const adminUsers = sqliteTable('admin_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  failedLogins: integer('failed_logins').notNull().default(0),
  lockedUntil: text('locked_until'),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default(now),
});

export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [index('admin_sessions_user_idx').on(t.userId)],
);

export const integrations = sqliteTable('integrations', {
  provider: text('provider').primaryKey(),
  // AES-256-GCM ciphertext of the provider's credential JSON.
  credentials: text('credentials').notNull(),
  config: text('config', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
  status: text('status', { enum: ['connected', 'error'] }).notNull().default('connected'),
  lastError: text('last_error'),
  updatedAt: text('updated_at').notNull().default(now),
});

export type Settings = typeof settings.$inferSelect;
export type Service = typeof services.$inferSelect;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type TimeOff = typeof timeOff.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
