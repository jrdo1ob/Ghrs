-- ============================================
-- GHRS - غرس Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. families
-- ============================================
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. members
-- ============================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'parent', 'child')),
  pin_hash TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. auth_identities
-- ============================================
CREATE TABLE auth_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_user_id)
);

-- ============================================
-- 4. family_invitations
-- ============================================
CREATE TABLE family_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  invited_by UUID NOT NULL REFERENCES members(id),
  used_by UUID REFERENCES members(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. tasks
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID[] DEFAULT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  xp_reward INTEGER NOT NULL DEFAULT 10,
  money_reward INTEGER DEFAULT NULL,
  requires_approval BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. task_completions
-- ============================================
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES members(id),
  approved_at TIMESTAMPTZ
);

-- ============================================
-- 7. xp_transactions
-- ============================================
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. money_transactions
-- ============================================
CREATE TABLE money_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'paid', 'withdrawn', 'redeemed')),
  source TEXT NOT NULL,
  source_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. withdrawal_requests
-- ============================================
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_by UUID REFERENCES members(id),
  processed_at TIMESTAMPTZ
);

-- ============================================
-- 10. gifts
-- ============================================
CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cost_xp INTEGER NOT NULL,
  cost_money INTEGER,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. gift_redemptions
-- ============================================
CREATE TABLE gift_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_id UUID NOT NULL REFERENCES gifts(id),
  member_id UUID NOT NULL REFERENCES members(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. achievement_definitions
-- ============================================
CREATE TABLE achievement_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. member_achievements
-- ============================================
CREATE TABLE member_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id),
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, achievement_id)
);

-- ============================================
-- 14. quran_progress
-- ============================================
CREATE TABLE quran_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id),
  surah INTEGER NOT NULL,
  ayah INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. family_pins
-- ============================================
CREATE TABLE family_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_members_family_id ON members(family_id);
CREATE INDEX idx_auth_identities_auth_user_id ON auth_identities(auth_user_id);
CREATE INDEX idx_tasks_family_id ON tasks(family_id);
CREATE INDEX idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX idx_task_completions_member_id ON task_completions(member_id);
CREATE INDEX idx_xp_transactions_member_id ON xp_transactions(member_id);
CREATE INDEX idx_money_transactions_member_id ON money_transactions(member_id);
CREATE INDEX idx_gifts_family_id ON gifts(family_id);
CREATE INDEX idx_member_achievements_member_id ON member_achievements(member_id);
CREATE INDEX idx_quran_progress_member_id ON quran_progress(member_id);
