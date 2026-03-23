# Setup & Installation Guide

## Prerequisites
- Node.js 18+
- PostgreSQL database
- npm

## Quick Start

### 1. Clone & Install
```bash
cd booking-app
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

**Required variables:**
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | A random 32+ character secret |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |

### 3. Setup Database
```bash
# Run migration + create admin user
npx tsx scripts/setup.ts
```

### 4. Start Development Server
```bash
npm run dev
```

- **Booking widget**: http://localhost:3000
- **Admin login**: http://localhost:3000/admin/login
- **Embed version**: http://localhost:3000/embed

---

## Embedding in Pixpa

### Option A: iframe
```html
<iframe
  src="https://your-domain.com/embed"
  width="100%"
  height="700"
  style="border: none; max-width: 720px; margin: 0 auto; display: block;"
  title="Book a Session"
></iframe>
```

### Option B: Script Embed
```html
<div data-booking-widget data-booking-url="https://your-domain.com"></div>
<script src="https://your-domain.com/embed.js"></script>
```

In Pixpa: Go to **Pages → Add Page → Custom Code** and paste either option.

---

## Production Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
```
Set environment variables in Vercel dashboard.

### Railway / Render
Push to GitHub and connect your repo. Set env vars in the platform dashboard.

### VPS (Docker)
```bash
npm run build
npm start
```
Use a reverse proxy (nginx) with SSL.
