-- ============================================
-- GHRS - غرس - Full Database Setup
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id)
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

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quran_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_pins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper functions
-- ============================================
CREATE OR REPLACE FUNCTION get_current_member()
RETURNS TABLE(member_id UUID, family_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ai.member_id, m.family_id, m.role
  FROM auth_identities ai
  JOIN members m ON m.id = ai.member_id
  WHERE ai.auth_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_family_member(target_family_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_current_member()
    WHERE family_id = target_family_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_family_parent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_current_member()
    WHERE role IN ('owner', 'parent')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_family_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_current_member()
    WHERE role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RLS Policies: families
-- ============================================
CREATE POLICY "Family members can view their family"
  ON families FOR SELECT
  USING (is_family_member(id));

CREATE POLICY "Only owner can update family"
  ON families FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_current_member()
      WHERE family_id = families.id AND role = 'owner'
    )
  );

-- ============================================
-- RLS Policies: members
-- ============================================
CREATE POLICY "Family members can view other members"
  ON members FOR SELECT
  USING (is_family_member(family_id));

CREATE POLICY "Parents can insert members"
  ON members FOR INSERT
  WITH CHECK (is_family_parent());

CREATE POLICY "Parents can update their own members"
  ON members FOR UPDATE
  USING (
    is_family_member(family_id) AND
    (is_family_parent() OR id = (SELECT member_id FROM get_current_member()))
  );

-- ============================================
-- RLS Policies: auth_identities
-- ============================================
CREATE POLICY "Members can view their own identity"
  ON auth_identities FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Members can view family identities"
  ON auth_identities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_identities ai2
      JOIN members m ON m.id = ai2.member_id
      WHERE ai2.auth_user_id = auth.uid()
      AND m.family_id = (SELECT family_id FROM members WHERE id = auth_identities.member_id)
    )
  );

-- ============================================
-- RLS Policies: tasks
-- ============================================
CREATE POLICY "Family members can view tasks"
  ON tasks FOR SELECT
  USING (is_family_member(family_id));

CREATE POLICY "Parents can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (is_family_parent());

CREATE POLICY "Parents can update tasks"
  ON tasks FOR UPDATE
  USING (is_family_member(family_id) AND is_family_parent());

-- ============================================
-- RLS Policies: task_completions
-- ============================================
CREATE POLICY "Family members can view completions"
  ON task_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_completions.task_id
      AND is_family_member(t.family_id)
    )
  );

CREATE POLICY "Members can insert their own completions"
  ON task_completions FOR INSERT
  WITH CHECK (member_id = (SELECT member_id FROM get_current_member()));

CREATE POLICY "Parents can update completions"
  ON task_completions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_completions.task_id
      AND is_family_member(t.family_id)
      AND is_family_parent()
    )
  );

-- ============================================
-- RLS Policies: xp_transactions
-- ============================================
CREATE POLICY "Members can view their own XP"
  ON xp_transactions FOR SELECT
  USING (member_id = (SELECT member_id FROM get_current_member()));

CREATE POLICY "Parents can view family XP"
  ON xp_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = xp_transactions.member_id
      AND is_family_member(m.family_id)
      AND is_family_parent()
    )
  );

-- ============================================
-- RLS Policies: money_transactions
-- ============================================
CREATE POLICY "Members can view their own money"
  ON money_transactions FOR SELECT
  USING (member_id = (SELECT member_id FROM get_current_member()));

CREATE POLICY "Parents can view family money"
  ON money_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = money_transactions.member_id
      AND is_family_member(m.family_id)
      AND is_family_parent()
    )
  );

-- ============================================
-- RLS Policies: gifts
-- ============================================
CREATE POLICY "Family members can view gifts"
  ON gifts FOR SELECT
  USING (is_family_member(family_id));

CREATE POLICY "Parents can create gifts"
  ON gifts FOR INSERT
  WITH CHECK (is_family_parent());

CREATE POLICY "Parents can update gifts"
  ON gifts FOR UPDATE
  USING (is_family_member(family_id) AND is_family_parent());

-- ============================================
-- RLS Policies: gift_redemptions
-- ============================================
CREATE POLICY "Family members can view redemptions"
  ON gift_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gifts g
      WHERE g.id = gift_redemptions.gift_id
      AND is_family_member(g.family_id)
    )
  );

CREATE POLICY "Members can insert their own redemptions"
  ON gift_redemptions FOR INSERT
  WITH CHECK (member_id = (SELECT member_id FROM get_current_member()));

-- ============================================
-- RLS Policies: achievement_definitions
-- ============================================
CREATE POLICY "Anyone can view achievements"
  ON achievement_definitions FOR SELECT
  USING (true);

-- ============================================
-- RLS Policies: member_achievements
-- ============================================
CREATE POLICY "Members can view their own achievements"
  ON member_achievements FOR SELECT
  USING (member_id = (SELECT member_id FROM get_current_member()));

CREATE POLICY "Parents can view family achievements"
  ON member_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = member_achievements.member_id
      AND is_family_member(m.family_id)
      AND is_family_parent()
    )
  );

-- ============================================
-- RLS Policies: quran_progress
-- ============================================
CREATE POLICY "Members can view their own progress"
  ON quran_progress FOR SELECT
  USING (member_id = (SELECT member_id FROM get_current_member()));

CREATE POLICY "Parents can view family progress"
  ON quran_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = quran_progress.member_id
      AND is_family_member(m.family_id)
      AND is_family_parent()
    )
  );

CREATE POLICY "Members can insert their own progress"
  ON quran_progress FOR INSERT
  WITH CHECK (member_id = (SELECT member_id FROM get_current_member()));

-- ============================================
-- RLS Policies: family_pins
-- ============================================
CREATE POLICY "Members can view their own PIN"
  ON family_pins FOR SELECT
  USING (member_id = (SELECT member_id FROM get_current_member()));

-- ============================================
-- RPC Functions
-- ============================================
CREATE OR REPLACE FUNCTION verify_member_pin(
  p_member_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT pin_hash INTO stored_hash
  FROM family_pins
  WHERE member_id = p_member_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = crypt(p_pin, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_member_pin(
  p_member_id UUID,
  p_pin TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO family_pins (member_id, pin_hash)
  VALUES (p_member_id, crypt(p_pin, gen_salt('bf')))
  ON CONFLICT (member_id) DO UPDATE
  SET pin_hash = crypt(p_pin, gen_salt('bf'));

  UPDATE members
  SET pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_family_member_codes()
RETURNS TABLE(member_id UUID, member_name TEXT, member_role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, m.role
  FROM members m
  WHERE m.family_id = (SELECT family_id FROM get_current_member());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION complete_task_with_rewards(
  p_task_id UUID,
  p_member_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_task RECORD;
  v_completion_id UUID;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;

  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM task_completions
    WHERE task_id = p_task_id AND member_id = p_member_id
    AND completed_at::date = NOW()::date
  ) THEN
    RAISE EXCEPTION 'Task already completed today';
  END IF;

  INSERT INTO task_completions (task_id, member_id, approved)
  VALUES (p_task_id, p_member_id, NOT v_task.requires_approval)
  RETURNING id INTO v_completion_id;

  INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
  VALUES (p_member_id, v_task.xp_reward, 'task', p_task_id, 'Completion: ' || v_task.title);

  IF v_task.money_reward IS NOT NULL AND v_task.money_reward > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (p_member_id, v_task.money_reward, 'earned', 'task', p_task_id,
            CASE WHEN v_task.requires_approval THEN 'pending' ELSE 'approved' END,
            'Reward: ' || v_task.title);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_money_pending_as_paid(
  p_transaction_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE money_transactions
  SET status = 'approved'
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or not pending';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_withdrawal_paid_with_transaction(
  p_withdrawal_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  SELECT * INTO v_withdrawal FROM withdrawal_requests WHERE id = p_withdrawal_id;

  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  UPDATE withdrawal_requests
  SET status = 'paid',
      processed_at = NOW()
  WHERE id = p_withdrawal_id;

  INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
  VALUES (v_withdrawal.member_id, v_withdrawal.amount, 'withdrawn', 'withdrawal', p_withdrawal_id, 'paid', 'Withdrawal');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION link_auth_identity_to_member(
  p_member_id UUID,
  p_auth_user_id UUID,
  p_provider TEXT DEFAULT 'email'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO auth_identities (member_id, auth_user_id, provider)
  VALUES (p_member_id, p_auth_user_id, p_provider)
  ON CONFLICT (auth_user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_member_info()
RETURNS TABLE(member_id UUID, member_name TEXT, family_id UUID, family_name TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, f.id, f.name, m.role
  FROM get_current_member() gcm
  JOIN members m ON m.id = gcm.member_id
  JOIN families f ON f.id = gcm.family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Seed Data
-- ============================================
INSERT INTO achievement_definitions (title, description, icon, requirement_type, requirement_value) VALUES
('البذرة الأولى', 'أكمل أول مهمة', '🌱', 'tasks_completed', 1),
('النبتة النامية', 'أكمل 10 مهام', '🌿', 'tasks_completed', 10),
('الشجرة القوية', 'أكمل 50 مهمة', '🌳', 'tasks_completed', 50),
('حديقة الإنجازات', 'أكمل 100 مهمة', '🏡', 'tasks_completed', 100),
('سلسلة النمو', 'أكمل مهمة كل يوم لمدة 7 أيام', '🔥', 'streak', 7),
('سلسلة الشهر', 'أكمل مهمة كل يوم لمدة 30 يوم', '💪', 'streak', 30),
('متخصص القرآن', 'إتمام سورة كاملة', '📖', 'quran_surah', 1),
('حافظ الصغير', 'إتمام 5 سور', '📚', 'quran_surah', 5),
('نجم المال', 'اكسب أول مكافأة مالية', '⭐', 'money_earned', 1),
('储蓄达人', 'ادّخر 100 وحدة مالية', '💰', 'money_saved', 100);
