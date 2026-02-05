-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE (Extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '{"STR": 0, "INT": 0, "WIL": 0, "CRE": 0}'::jsonb,
  inventory JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HABITS TABLE
CREATE TABLE public.habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  attribute TEXT NOT NULL CHECK (attribute IN ('STR', 'INT', 'WIL', 'CRE')),
  description TEXT,
  frequency JSONB DEFAULT '{"days": [0,1,2,3,4,5,6]}'::jsonb, -- 0=Sunday
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DAILY ENTRIES (The Core Log)
-- One row per day per user. Optimized for heavy reads.
CREATE TABLE public.daily_logs (
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  date DATE NOT NULL,
  completed_habits JSONB DEFAULT '{}'::jsonb, -- Map of habit_id -> boolean
  metrics JSONB DEFAULT '{}'::jsonb, -- sleep, phone_time, etc
  mood_score INTEGER, -- 1-10
  review_win TEXT,
  review_fail TEXT,
  review_fix TEXT,
  xp_gained INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- NOTES (The Brain)
CREATE TABLE public.notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT,
  content TEXT,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUESTS
CREATE TABLE public.quests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('common', 'rare', 'epic', 'legendary')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  xp_reward INTEGER DEFAULT 10,
  gold_reward INTEGER DEFAULT 5,
  deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES (Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- Simple "Users can only see/edit their own data" policy for all tables
CREATE POLICY "Users can only see their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only see their own habits" ON public.habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own logs" ON public.daily_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own quests" ON public.quests FOR ALL USING (auth.uid() = user_id);

-- Function to handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth user
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
