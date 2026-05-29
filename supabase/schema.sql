-- Supabase Database Schema

-- Families tracking table
CREATE TABLE IF NOT EXISTS families (
  id text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Feeding/Pumping sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'left', 'right', 'bottle', 'pump'
  side text,          -- 'left', 'right', or null
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_s integer,
  volume_ml integer,
  notes text,
  recorded_by text,   -- partner's name
  device_id text,     -- persistent browser device ID
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Multi-column index for fast ordered queries per family
CREATE INDEX IF NOT EXISTS idx_sessions_family_time
ON sessions (family_id, started_at DESC);
