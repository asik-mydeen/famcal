-- AI Home Assistant Migration
-- Adds tables for AI preferences, conversations, messages, and learned memories

-- AI Preferences (family-level settings)
CREATE TABLE IF NOT EXISTS ai_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  assistant_name TEXT DEFAULT 'Amara',
  personality TEXT DEFAULT 'warm, concise, family-friendly',
  cuisine_preferences TEXT[],
  dietary_restrictions TEXT[],
  tone TEXT DEFAULT 'friendly',
  language TEXT DEFAULT 'en',
  custom_instructions TEXT,
  meal_defaults JSONB DEFAULT '{}',
  shopping_defaults JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations (chat sessions)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INT DEFAULT 0,
  tags TEXT[],
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Messages (chat history)
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Memories (learned facts)
CREATE TABLE IF NOT EXISTS ai_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  confidence FLOAT DEFAULT 1.0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_preferences_family ON ai_preferences(family_id);
CREATE INDEX IF NOT EXISTS idx_conversations_family ON conversations(family_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_family ON ai_memories(family_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_active ON ai_memories(family_id, active);

-- Enable RLS on all tables
ALTER TABLE ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;

-- RLS policies: allow anonymous read access (for dashboard /d/{slug} mode)
DO $$ BEGIN
  CREATE POLICY "anon_read_ai_preferences" ON ai_preferences FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_conversations" ON conversations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_conversation_messages" ON conversation_messages FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_ai_memories" ON ai_memories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
