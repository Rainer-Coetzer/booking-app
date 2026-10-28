# What changed, and why

The original app was a booking widget for one Namibian photography studio. Its packages, prices, N$ currency, `Africa/Windhoek` timezone, studio copy and developer credit were written into the code, and it ran on a hosted Supabase Postgres. This rebuild turns it into a product that any appointment-based business can install and configure for itself, and fixes the bugs and security problems found along the way.

Each entry gives what it was, what it is now, and why.

---

## 1. Security

### A live database password and the admin password were committed to git
**Before:** `scripts/setup.ts` contained the Supabase connection string, including its password, and the owner's email and plaintext password. Both are in the repository's history.
**After:** the script is gone. The first admin is created on the `/setup` page, which works only while no admin exists and can additionally require a `SETUP_TOKEN`. No secrets live in code; `.env.example` documents every variable.
**Why:** anyone with read access to the repo, now or later, had full database access. Deleting the file does not remove it from history, so **the Supabase password must be rotated (or the project deleted) and that admin password changed anywhere it is reused.** That step cannot be done from code.

### Anyone could attach their Google account to the business
**Before:** `/api/admin/google/callback` never checked who was calling, and the OAuth flow had no `state` parameter. A crafted callback link would store an attacker's Google tokens, and every booking would then be written to the attacker's calendar.
**After:** both connect and callback require an admin session. The `state` is HMAC-signed, expires in ten minutes, and is bound to the admin's id and a nonce held in an httpOnly cookie only that browser has ([connect](../src/app/api/integrations/google/connect/route.ts), [callback](../src/app/api/integrations/google/callback/route.ts)).
**Why:** a classic OAuth login-CSRF. It gave an outsider a copy of every customer's name, email and phone number.

### Sessions could not be revoked, and the JWT secret had a public fallback
**Before:** a 24-hour JWT signed with `JWT_SECRET || 'fallback-secret-change-me'`. If the variable was missing, anyone could mint an admin token. Logging out only deleted the cookie; a stolen token stayed valid.
**After:** random session tokens, stored as SHA-256 hashes in `admin_sessions` with an expiry ([auth.ts](../src/server/auth.ts)). Logout deletes the row; changing the password deletes every session for that user. Production refuses to start without `APP_SECRET`.
**Why:** server-side sessions are revocable, and a missing secret should stop the app, not quietly weaken it.

### The OAuth redirect could never have carried the session
**Before:** the admin cookie was `SameSite=Strict`. Browsers do not send Strict cookies on a cross-site navigation, which is exactly what Google's redirect back to the callback is. The code even carried a comment wondering whether this would work.
**After:** `SameSite=Lax`, which is sent on top-level GET navigations but not on cross-site POSTs. Admin mutations are server actions, which Next checks against the request `Origin`.

### Password checking was tied to Postgres and behaved oddly
**Before:** `verifyPassword` searched for a row *by its hash* and ran `crypt()` through pgcrypto.
**After:** bcrypt in the app. Unknown emails are compared against a dummy hash so response time does not reveal which accounts exist. Five failed attempts lock the account for 15 minutes, on top of a per-IP limit.

### Admin endpoints accepted anything
**Before:** `PATCH /api/admin/bookings` wrote any `status` string straight into the database; `POST` accepted unvalidated fields.
**After:** every input goes through a zod schema ([validation.ts](../src/server/validation.ts)), and status changes go through an explicit transition table ([status.ts](../src/lib/status.ts)): a cancelled booking cannot be confirmed again, for example.

### Rate limiting trusted a header the client controls
**Before:** the client IP came from the *first* `X-Forwarded-For` entry, which is whatever the client sends.
**After:** the IP is read from the right-hand end of the chain, counting `TRUST_PROXY_HOPS` proxies ([rate-limit.ts](../src/server/rate-limit.ts)). That entry was written by your own proxy. There is also a per-email limit on new requests.

### Weaker headers than they looked
**Before:** a CSP with `'unsafe-eval'` in production, `X-XSS-Protection` (deprecated, and harmful in old browsers), `X-Frame-Options: ALLOWALL` (not a valid value), and CORS that reflected any origin with credentials in development.
**After:** a per-request nonce CSP with `'strict-dynamic'` and no `unsafe-eval` outside development, `frame-ancestors 'none'` everywhere except `/embed`, which uses `EMBED_ALLOWED_ORIGINS`. No CORS: the widget runs inside an iframe on our own origin, so it never needs it ([proxy.ts](../src/proxy.ts)).

### Calendar tokens were stored in plaintext
**After:** encrypted with AES-256-GCM under a key derived from `APP_SECRET` ([crypto.ts](../src/server/crypto.ts)). A copied database file no longer hands over the owner's Google account.

---

## 2. Bugs that broke real flows

### Every quote request and every decline failed
The database `CHECK` allowed `pending/confirmed/cancelled/completed`, but the code wrote `quote_requested` and `declined`. Custom-session requests returned a 500 and the Decline button silently did nothing. The status set is now defined once in [schema.ts](../src/server/db/schema.ts) and checked by both the database and TypeScript.

### Closed days and blocked dates were never shown to customers
The public calendar fetched `/api/admin/hours` and `/api/admin/blocked-dates`, which return 401 to anyone not logged in. Visitors could pick any day and only found out at the time step. The booking page now receives its configuration from the server in one go ([getPublicConfig](../src/server/settings.ts)).

### Two people could book the same slot
The check for an existing booking and the insert were separate queries with nothing between them. Booking now runs inside an `IMMEDIATE` SQLite transaction that recomputes availability before inserting ([createPublicBooking](../src/server/bookings.ts)). Verified by firing ten simultaneous requests at one slot: one 201, nine 409s.

### Slots ignored the service
Slots were whole hours only. Service duration, buffers between bookings, minimum notice, the booking window and times already past today were all ignored. Times were computed in the server's timezone. A 90-minute session at 16:00 in a 17:00 close was offered. See the slot engine below.

### Calendar events had the wrong length and could crash
The end time was `hour + 1`, whatever the service, so a 23:00 start produced `24:00`. The Google OAuth client was one shared object, so concurrent requests could use each other's credentials. Events now use the booking's real start and end, and each call gets its own client.

### The confirmation promised an email that never came
"Check your email for confirmation details". No email code existed. There is now a mailer (see section 4).

### The embed never resized
`embed.js` listened for `booking-resize` messages that nothing sent. The embed page now reports its content height ([EmbedResizer](../src/components/booking/EmbedResizer.tsx)). The first version measured the document, which in an iframe equals the iframe's own height, so it never shrank. It now measures the content.

### Validation errors wiped the form
React 19 resets a form after every server action, including failed ones. A typo in one field cleared every other field. Failed actions now return the submitted values and forms use them as defaults ([restore.ts](../src/components/admin/restore.ts)).

### Emails with surrounding spaces were rejected
zod 4's `z.email()` validates before `.trim()` runs. Email fields now trim first, then validate.

### `middleware.ts` used a removed convention
Next 16 renamed middleware to `proxy`. Moved to [src/proxy.ts](../src/proxy.ts).

---

## 3. White-label: nothing business-specific in code

| Was hardcoded | Now |
|---|---|
| Four photography packages and N$ prices in `constants.ts` | `services` table, managed under **Services**. Each has a duration, optional price or price text, quote-only flag, visibility and order. |
| `Africa/Windhoek` in the calendar code | Per-install timezone; all slot maths runs in it ([availability.ts](../src/lib/availability.ts)). |
| `en-US` date formatting, `N$` currency strings | Locale and ISO currency in **Settings**, formatted with `Intl` ([format.ts](../src/lib/format.ts)). |
| One opening range per day, whole hours | Any number of ranges per day (lunch breaks), any start minute. |
| Single blocked dates | Date ranges with a note. |
| "Photography Studio" titles, 📷 in calendar events, "Book a Photography Session" iframe title | Business name and tagline from settings, neutral copy everywhere. |
| "Developed by Rainer Coetzer" footer on every page | Optional vendor credit via `POWERED_BY_TEXT`, off unless the business enables it. |
| Pixpa-specific embed instructions | Generic embed snippet shown in the admin with the install's own URL. |
| Supabase Postgres | Embedded SQLite (`better-sqlite3` + Drizzle). One file, no database server. |
| Hand-run seed script with real credentials | First-run `/setup` page. |

Theming is three colours (background, text, accent), a typeface pair, a cover photo and a light/dark preference. Everything else (borders, muted text, surfaces, status colours) is derived with `color-mix()` in [globals.css](../src/app/globals.css), so any palette produces a complete, consistent interface. Dark mode is derived from the same three colours: the brand's text colour, deepened, becomes the ground. A business can follow each visitor's device or force either scheme. Settings refuses text/background pairs below WCAG AA contrast (4.5:1) and shows the ratio live. Muted text measures above 6.5:1 and input borders above 3:1 in both schemes.

Bookings keep a snapshot of the service name and price at the time of booking, so editing or deleting a service never rewrites history.

---

## 4. New capability

- **Email** behind a three-method interface with `console`, `smtp` and `resend` providers ([mailer.ts](../src/server/email/mailer.ts)). Customers get request-received, confirmed (with an `.ics` invite), rescheduled, declined and cancelled messages. The owner gets new-request and customer-cancelled alerts. Emails are sent after the response with Next's `after()`, so a slow mail server never delays a booking.
- **Customer self-service**: every email links to `/manage/<token>` to view or cancel. The token is stored hashed for lookup and encrypted so later emails can repeat the link.
- **Admin**: a "needs a decision" queue, two-week agenda, filterable and paginated bookings, scheduling for quote requests, moving bookings with a conflict check, manual bookings, and per-booking personal-data erasure.
- **Instant or approved** bookings, chosen per business.
- **Health endpoint** (`/api/health`) and a Docker image with a persistent `/data` volume.

---

## 5. Code quality

- **Layers.** Route handlers and server actions parse input and call a domain layer (`src/server/*`). The slot engine is a pure function with no database access, so it is unit-tested directly, DST transitions included.
- **The 21 KB dashboard** was one client component with seven views switched by state, hand-rolled fetches with empty `catch { /* */ }` blocks, and inline styles everywhere. It is now separate App Router pages, rendered on the server with data read directly, with small client components only where there is interaction.
- **The booking wizard** tracked steps with index arithmetic (`getActualStep`, `isCustom && step === 4`). It is now a reducer over named steps.
- **Accessibility**: package cards were clickable `div`s; they are buttons now. The calendar supports arrow-key navigation with a roving tab index. Inputs have associated labels, errors are linked with `aria-describedby`, status changes are announced, focus is visible, and reduced-motion is respected.
- **Dependencies removed:** `pg`, `jsonwebtoken`, `react-icons` (unused), `framer-motion`, `googleapis` (replaced by the much smaller `@googleapis/calendar`), Tailwind (installed but unused).
- **Tests:** 36 Vitest tests covering the slot engine (intervals, durations, multiple ranges, buffers, notice, window, time off, DST in both directions), the booking service against in-memory SQLite (overlaps, transitions, quotes, admin overrides, token cancellation), crypto and validation.

### AI tells removed

In code: comments that narrate the next line (`// Get current booking`, `// Insert booking`), an `if/else` with identical branches, a musing comment block left in the OAuth callback, empty catch blocks, a "Helmet.js equivalent" comment, an unused `sanitizeString`, a `GET` handler that only returned 404, unused icon and animation libraries, leftover create-next-app SVGs and the boilerplate README. Comments that remain explain *why*, not *what*.

In design: the default Inter + Outfit pairing loaded from Google Fonts, a near-black `#0a0a0a` theme of greys, Tailwind 400-series status colours, uppercase letter-spaced buttons, staggered fade-ins on every card and slot, `transition: all` throughout, emoji used as icons, and evenly split layouts. They are replaced by:

- **Type:** self-hosted typeface pairs, sans by default (Geist), with tracking set by size. One serif pair (EB Garamond) is offered for businesses that want an editorial voice on purpose.
- **Colour:** a cool neutral ground with one cobalt accent by default, a derived dark scheme, and no pure black or white.
- **Surfaces:** one 2px radius, and one shadow, on the modal only.
- **Motion:** one 520ms curve, on step changes only.
- **Layout:** an asymmetric intro column on the booking page, and a weighted stats row in the admin.

Fonts served from our own origin also mean visitors' browsers never contact Google.

A later sweep against a stricter checklist also replaced "Step 1 of 4" with a stepper that names each step and shows what was chosen (click to go back), typed arrows with Phosphor icons, the "Checking availability…" text with a skeleton grid in the shape of the slots, and bare empty states with ones that say what to do next. Buttons now give press feedback.

---

## Deliberate departures from the original plan

- **Admin mutations use server actions** instead of a REST API under `/api/admin/*`. They get Next's built-in origin check, need no client fetch code, and keep types end to end. The public API is still plain route handlers, because the embed and any future integrations need them.
- **Embed origins come from an environment variable**, not a database setting. Next's proxy is meant to run without shared state or database access.
- **No separate month-grid calendar in the admin.** The two-week agenda and the filterable list cover the same need with less code; a full calendar view is a reasonable follow-up.
