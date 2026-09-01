-- ============================================
-- GHRS - RLS Policies
-- ============================================

-- Enable RLS on all tables
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
-- Helper function: get current user's member
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

-- ============================================
-- Helper function: check if user is family member
-- ============================================
CREATE OR REPLACE FUNCTION is_family_member(target_family_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_current_member()
    WHERE family_id = target_family_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Helper function: check if user is parent/owner
-- ============================================
CREATE OR REPLACE FUNCTION is_family_parent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_current_member()
    WHERE role IN ('owner', 'parent')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Helper function: check if user is owner
-- ============================================
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
