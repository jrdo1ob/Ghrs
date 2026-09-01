-- Migration 018: Task Management + Stories Engine
-- Adds: priority, schedule_days, assigned_to to tasks
-- Creates: stories table + RPCs
-- Updates: edit/delete/pause task RPCs

BEGIN;

-- 1. ADD NEW COLUMNS TO TASKS
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS schedule_days INTEGER[] DEFAULT NULL; -- 0=Sun,1=Mon,...6=Sat
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- 2. STORIES TABLE
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  moral_value TEXT,
  reward_xp INTEGER DEFAULT 5,
  assigned_to UUID REFERENCES members(id) ON DELETE SET NULL,
  is_preset BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRESET STORIES TABLE
CREATE TABLE IF NOT EXISTS preset_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  moral_value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT DEFAULT '📖',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SEED PRESET STORIES
INSERT INTO preset_stories (title, content, moral_value, category, icon, sort_order) VALUES
('الأميرة الصغيرة والtruth', 'كانت هناك أميرة صغيرة سمت لأمها أنها لن تكذب أبداً. في يوم من الأيام، وجدت_currency حديقة\. قالت للأميرة: "هل تريدِ تفاحة؟" قالت الأميرة: "لا، شكراً. أنا لا أريد تفاحة today". كانت تفاحة لذيذة جداً، لكن الأميرة صادقة.', 'الصدق', 'values', '⭐', 1),
('الولد الطيب والقطعة المكسورة', 'لعب أحمد بكرة عزيزة عليه. فجأة انكسرت! خاف أحمد وخبأها. لكنه تذكر أن الصدق أحسن. راح لماما وقال: "ماما، أنا كسرت الكورة". ماما ابتسمت و قالت: "أنت شاطر لأنك صادق، خلنا نصلحها سوا!"', 'البر بالأم', 'values', '💖', 2),
('النحلة المجتمعية', 'كانت نحلة صغيرة اسمها نونو. كل يوم كانت تساعد رفيقاتها. يوم قالت لها رفيقتها: "ليش تساعدونا كل يوم؟" قالت نونو: "لأن المجتمع ي SIZE يساعد بعضه!" وكبرت النحلة وصارت ملكة.', 'النظام والمجتمع', 'values', '🐝', 3),
('ال علم والمعرفة', 'جلس الولد الصغير مع جده كل يوم يسمع قصص. سأله الجد: "ليش تحب القصص؟" قال الولد: "لأنها تعيني أفهم العالم!" ابتسم الجد وقال: "أنت أذكى مني!"', 'العلم', 'values', '📚', 4),
('الغزالة والنهر', 'كانت غزالة عطشانة. وجدت نهراً صغيراً. شربت وقالت: "الحمد لله". جاءت بقرة وقالت: "سمحت لي أشرب؟" قالت الغزالة: "تفضل!" وشاركتها الماء.', 'الإيثار', 'values', '🦌', 5);

-- 5. RPC: Update task (edit)
CREATE OR REPLACE FUNCTION update_task(
  p_task_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_xp_reward INTEGER DEFAULT NULL,
  p_money_reward NUMERIC DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_schedule_days INTEGER[] DEFAULT NULL,
  p_assigned_to UUID[] DEFAULT NULL,
  p_requires_approval BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_task RECORD;
  v_caller RECORD;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;

  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL OR v_caller.family_id != v_task.family_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF v_caller.role NOT IN ('owner', 'parent') THEN
    RAISE EXCEPTION 'Only parents can edit tasks';
  END IF;

  UPDATE tasks SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    xp_reward = COALESCE(p_xp_reward, xp_reward),
    money_reward = COALESCE(p_money_reward, money_reward),
    frequency = COALESCE(p_frequency, frequency),
    priority = COALESCE(p_priority, priority),
    schedule_days = COALESCE(p_schedule_days, schedule_days),
    assigned_to = COALESCE(p_assigned_to, assigned_to),
    requires_approval = COALESCE(p_requires_approval, requires_approval)
  WHERE id = p_task_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Soft delete task
CREATE OR REPLACE FUNCTION delete_task(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_task RECORD;
  v_caller RECORD;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;

  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL OR v_caller.family_id != v_task.family_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF v_caller.role NOT IN ('owner', 'parent') THEN
    RAISE EXCEPTION 'Only parents can delete tasks';
  END IF;

  UPDATE tasks SET is_deleted = TRUE, deleted_at = NOW() WHERE id = p_task_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Pause/Resume task
CREATE OR REPLACE FUNCTION toggle_task_pause(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_task RECORD;
  v_caller RECORD;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;

  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL OR v_caller.family_id != v_task.family_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF v_caller.role NOT IN ('owner', 'parent') THEN
    RAISE EXCEPTION 'Only parents can pause tasks';
  END IF;

  UPDATE tasks SET is_paused = NOT is_paused WHERE id = p_task_id;
  RETURN NOT v_task.is_paused;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Create story
CREATE OR REPLACE FUNCTION create_story(
  p_family_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_moral_value TEXT DEFAULT NULL,
  p_reward_xp INTEGER DEFAULT 5,
  p_assigned_to UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_story_id UUID;
  v_caller RECORD;
BEGIN
  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL OR v_caller.family_id != p_family_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF v_caller.role NOT IN ('owner', 'parent') THEN
    RAISE EXCEPTION 'Only parents can create stories';
  END IF;

  INSERT INTO stories (family_id, title, content, moral_value, reward_xp, assigned_to, created_by)
  VALUES (p_family_id, p_title, p_content, p_moral_value, p_reward_xp, p_assigned_to, v_caller.id)
  RETURNING id INTO v_story_id;

  -- Create a reading task for the child
  INSERT INTO tasks (family_id, title, description, xp_reward, assigned_to, requires_approval, is_active, created_by, story_content)
  VALUES (p_family_id, 'اقرأ: ' || p_title, 'قصة تربوية - ' || COALESCE(p_moral_value, ''), p_reward_xp,
          CASE WHEN p_assigned_to IS NOT NULL THEN ARRAY[p_assigned_to] ELSE NULL END,
          TRUE, TRUE, v_caller.id, p_content);

  RETURN v_story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Add preset story to family
CREATE OR REPLACE FUNCTION add_preset_story(
  p_preset_id UUID,
  p_family_id UUID,
  p_assigned_to UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_preset RECORD;
  v_story_id UUID;
  v_caller RECORD;
BEGIN
  SELECT * INTO v_preset FROM preset_stories WHERE id = p_preset_id;
  IF v_preset IS NULL THEN RAISE EXCEPTION 'Preset story not found'; END IF;

  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL OR v_caller.family_id != p_family_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO stories (family_id, title, content, moral_value, reward_xp, assigned_to, is_preset, created_by)
  VALUES (p_family_id, v_preset.title, v_preset.content, v_preset.moral_value, 5, p_assigned_to, TRUE, v_caller.id)
  RETURNING id INTO v_story_id;

  INSERT INTO tasks (family_id, title, description, xp_reward, assigned_to, requires_approval, is_active, created_by, story_content)
  VALUES (p_family_id, 'اقرأ: ' || v_preset.title, 'قصة تربوية - ' || v_preset.moral_value, 5,
          CASE WHEN p_assigned_to IS NOT NULL THEN ARRAY[p_assigned_to] ELSE NULL END,
          TRUE, TRUE, v_caller.id, v_preset.content);

  RETURN v_story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: Delete story
CREATE OR REPLACE FUNCTION delete_story(p_story_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_story RECORD;
  v_caller RECORD;
BEGIN
  SELECT * INTO v_story FROM stories WHERE id = p_story_id;
  IF v_story IS NULL THEN RAISE EXCEPTION 'Story not found'; END IF;

  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL OR v_caller.family_id != v_story.family_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM stories WHERE id = p_story_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RLS for stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stories_select_all" ON stories;
CREATE POLICY "stories_select_all" ON stories FOR SELECT USING (true);

-- 12. RLS for preset_stories
ALTER TABLE preset_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preset_stories_select_all" ON preset_stories;
CREATE POLICY "preset_stories_select_all" ON preset_stories FOR SELECT USING (true);

-- 13. INDEXES
CREATE INDEX IF NOT EXISTS idx_stories_family ON stories(family_id);
CREATE INDEX IF NOT EXISTS idx_stories_assigned ON stories(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(family_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_paused ON tasks(family_id, is_paused);

COMMIT;
