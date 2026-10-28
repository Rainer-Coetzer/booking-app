# Booking

A self-hosted booking system that any appointment-based business can install and make its own: a physio, a photographer, a salon, a tutor, a consultant. Each install serves one business. Its name, services, prices, hours, timezone, currency, colours and typefaces are set from the admin screen, not in code.

- **Customers** pick a service, a day and a time (or request a quote for work without a fixed time), and get an email with a link to view or cancel.
- **The owner** approves or declines requests, schedules quotes, moves bookings, blocks out holidays and gets an email for every new request.
- **Embeds** into any website with one script tag, and sizes itself to fit.
- **Optional** Google Calendar sync (bookings out to the calendar) and SMTP or Resend email.

Data lives in one SQLite file. There is no external database to run.

## Quick start

### Docker

```bash
cp .env.example .env
```

Set `APP_SECRET` in `.env` to 32 or more random characters (the file shows a command that generates one), then:

```bash
docker compose up -d
```

Open http://localhost:3000. The first visit goes to `/setup`, where you create the owner account. The database is kept in the `booking-data` volume.

### Local development

Requires Node 20.9 or later.

```bash
npm install
```

```bash
npm run dev
```

In development, `APP_SECRET` is optional: a random one is generated into `data/.dev-secret` on first run.

## After setup

1. **Services**: rename the starter "Consultation", add your own, mark quote-only ones.
2. **Hours & time off**: set weekly hours (add a second range for a lunch break) and holidays.
3. **Settings**: name, logo, contact details, timezone, locale, currency, colours, typefaces, slot spacing, buffer between bookings, minimum notice, how far ahead people can book, and whether you approve each booking.
4. **Email & calendar**: send a test email, connect Google Calendar, copy the embed code.

## Embedding

```html
<div data-booking-widget data-booking-url="https://book.example.com"></div>
<script src="https://book.example.com/embed.js" async></script>
```

Or a plain iframe pointing at `/embed`. Restrict which sites may frame it with `EMBED_ALLOWED_ORIGINS`.

## Configuration

Everything about the business is configured in the admin. The environment only holds deployment concerns; `.env.example` documents each variable.

| Variable | Purpose |
|---|---|
| `APP_SECRET` | Required in production. Signs sessions, encrypts stored tokens. |
| `APP_URL` | Public URL, used in email links and the Google redirect. |
| `DATA_DIR` | Directory holding `booking.db`. Back it up. |
| `SETUP_TOKEN` | Optional. Required on `/setup` so nobody else can claim a fresh install. |
| `TRUST_PROXY_HOPS` | Number of reverse proxies in front, for correct client IPs. |
| `EMBED_ALLOWED_ORIGINS` | Sites allowed to iframe `/embed`. |
| `EMAIL_PROVIDER` | `console`, `smtp` or `resend`, plus their settings. |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Enables Google Calendar sync. See [docs/GOOGLE_CALENDAR.md](docs/GOOGLE_CALENDAR.md). |
| `POWERED_BY_TEXT` / `_URL` | Optional platform credit a business can choose to show. |

## Hosting

SQLite needs a persistent disk and a single running instance. That rules out serverless platforms that throw the filesystem away between requests (Vercel, Netlify functions). It works on a VPS, Docker on any host, Railway, Fly.io or Render with a mounted volume. Put it behind a reverse proxy that terminates HTTPS and set `TRUST_PROXY_HOPS` to match.

**Backups:** copy `booking.db` while the app is running with `sqlite3 booking.db ".backup backup.db"`, or stop the app and copy the file along with any `-wal` file.

## Development

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run lint
```

After changing `src/server/db/schema.ts`, generate a migration with `npm run db:generate`. Migrations run automatically on start.

## Further reading

- [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md): what changed from the original single-studio app, and why.
- [docs/BOOKING_SYSTEM_PROBLEMS.md](docs/BOOKING_SYSTEM_PROBLEMS.md): the hard problems in booking software and how this build handles each.
- [docs/GOOGLE_CALENDAR.md](docs/GOOGLE_CALENDAR.md): connecting Google Calendar.
