# Google Calendar

When connected, confirmed bookings appear in the owner's Google Calendar. Moving a booking moves the event; cancelling or declining removes it. Pending requests and quote requests are not added until they are confirmed.

Sync is one-way, from this app to Google. Events created directly in Google do not block slots here (see [BOOKING_SYSTEM_PROBLEMS.md](BOOKING_SYSTEM_PROBLEMS.md#calendar-sync)).

## 1. Create OAuth credentials

These belong to whoever runs the install, once per deployment.

1. In the [Google Cloud Console](https://console.cloud.google.com), create a project.
2. **APIs & Services → Library**: enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**: user type External, add the scopes `calendar.events` and `calendar.readonly`. While the app is in Testing mode, add the owner's Google account as a test user.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type Web application. Add the authorised redirect URI:
   - `https://your-domain.example/api/integrations/google/callback`
   - and for local development `http://localhost:3000/api/integrations/google/callback`

## 2. Configure the server

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APP_URL=https://your-domain.example
```

`GOOGLE_REDIRECT_URI` only needs setting if the callback URL differs from `${APP_URL}/api/integrations/google/callback`.

## 3. Connect

Sign in to the admin, open **Email & calendar**, and choose **Connect Google Calendar**. After approving, pick which calendar receives events.

## What is stored

The access and refresh tokens are encrypted with AES-256-GCM using a key derived from `APP_SECRET` before they are written to the database. Changing `APP_SECRET` makes them unreadable, so reconnect afterwards.

If the owner revokes access from their Google account, the next sync attempt marks the connection as errored and the admin shows a reconnect prompt. Bookings keep working throughout; calendar sync never blocks or fails a booking.
