-- Booking Application Database Schema

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL CHECK (email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
  phone VARCHAR(50) NOT NULL,
  session_type VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(20),
  location VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  google_event_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opening_hours (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  UNIQUE(day_of_week)
);

CREATE TABLE IF NOT EXISTS google_tokens (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row for single-tenant
  access_token TEXT,
  refresh_token TEXT,
  expiry_date BIGINT,
  calendar_id VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default opening hours
-- 0=Sunday, 1=Monday, ..., 6=Saturday
INSERT INTO opening_hours (day_of_week, start_time, end_time, enabled) VALUES
  (0, '08:00', '18:00', false),  -- Sunday: closed
  (1, '15:00', '17:00', true),   -- Monday
  (2, '15:00', '17:00', true),   -- Tuesday
  (3, '15:00', '17:00', true),   -- Wednesday
  (4, '15:00', '17:00', true),   -- Thursday
  (5, '15:00', '17:00', true),   -- Friday
  (6, '08:00', '18:00', true)    -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;
