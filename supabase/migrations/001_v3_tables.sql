-- FamCal v3.0 Migration — New tables for meals, lists, notes, countdowns, photos

-- Meals
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meals_family_date ON meals(family_id, date);

-- Lists
CREATE TABLE IF NOT EXISTS lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'checklist',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- List Items
CREATE TABLE IF NOT EXISTS list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT,
  checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMPTZ,
  added_by UUID REFERENCES family_members(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id),
  text TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Countdowns
CREATE TABLE IF NOT EXISTS countdowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date DATE NOT NULL,
  icon TEXT DEFAULT 'celebration',
  color TEXT DEFAULT '#6C5CE7',
  source_event_id UUID,
  auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  sort_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family table additions for v3
ALTER TABLE families ADD COLUMN IF NOT EXISTS weather_location TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS kiosk_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS photo_interval INT DEFAULT 5;
ALTER TABLE families ADD COLUMN IF NOT EXISTS idle_timeout INT DEFAULT 300;
ALTER TABLE families ADD COLUMN IF NOT EXISTS font_scale FLOAT DEFAULT 1.0;

-- Enable RLS on new tables
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE countdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
