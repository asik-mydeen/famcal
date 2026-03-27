-- Emergency Info table
CREATE TABLE IF NOT EXISTS emergency_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id), -- null = household-level
  category TEXT NOT NULL, -- medical, contact, household, insurance
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INT DEFAULT 0, -- higher = more important
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Babysitter PIN on families
ALTER TABLE families ADD COLUMN IF NOT EXISTS babysitter_pin TEXT;

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  name TEXT NOT NULL,
  species TEXT DEFAULT 'dog', -- dog, cat, fish, bird, hamster, rabbit, other
  breed TEXT,
  birth_date DATE,
  photo_url TEXT,
  icon TEXT DEFAULT 'pets',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pet care logs
CREATE TABLE IF NOT EXISTS pet_care_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  care_type TEXT NOT NULL, -- feed, walk, medicine, vet, groom, play
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE emergency_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_care_logs ENABLE ROW LEVEL SECURITY;

-- Anon read
CREATE POLICY "emergency_info_anon_select" ON emergency_info FOR SELECT USING (true);
CREATE POLICY "pets_anon_select" ON pets FOR SELECT USING (true);
CREATE POLICY "pet_care_logs_anon_select" ON pet_care_logs FOR SELECT USING (true);

-- Authenticated CRUD
CREATE POLICY "emergency_info_auth_all" ON emergency_info FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pets_auth_all" ON pets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pet_care_logs_auth_all" ON pet_care_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_info;
ALTER PUBLICATION supabase_realtime ADD TABLE pets;
ALTER PUBLICATION supabase_realtime ADD TABLE pet_care_logs;
