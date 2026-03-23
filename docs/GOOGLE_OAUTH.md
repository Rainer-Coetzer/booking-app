# Google OAuth Setup Guide

## Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **"Create Project"** → name it (e.g., "Studio Booking")
3. Select the project

## Step 2: Enable Calendar API
1. Go to **APIs & Services → Library**
2. Search for **"Google Calendar API"**
3. Click **Enable**

## Step 3: Create OAuth Credentials
1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials" → "OAuth client ID"**
3. If prompted, configure the **OAuth consent screen** first:
   - User Type: **External**
   - App name: "Studio Booking"
   - Scopes: Add `https://www.googleapis.com/auth/calendar`
4. Back in Credentials → **OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://your-domain.com/api/admin/google/callback`
   - For local dev also add: `http://localhost:3000/api/admin/google/callback`
5. Copy the **Client ID** and **Client Secret**

## Step 4: Add to .env
```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://your-domain.com/api/admin/google/callback
```

## Step 5: Connect in Admin Dashboard
1. Log in to `/admin/dashboard`
2. Go to **Google Calendar** section
3. Click **"Connect Google Calendar"**
4. Authorize in the popup
5. Bookings will now auto-sync to your Google Calendar
