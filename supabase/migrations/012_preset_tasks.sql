-- Migration 012: Preset Tasks Library + Story Reader
-- Adds preset_tasks table, story fields to tasks, and is_bonus support

BEGIN;

-- ============================================================
-- 1. PRESET TASKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS preset_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- quran, reading, hygiene, chores, other
  xp_reward INTEGER DEFAULT 10,
  money_reward NUMERIC DEFAULT 0,
  requires_approval BOOLEAN DEFAULT TRUE,
  frequency TEXT DEFAULT 'daily',
  icon TEXT DEFAULT '📋',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. STORY FIELDS ON TASKS
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_content TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_type TEXT; -- text, image, pdf
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 3. SEED PRESET TASKS
-- ============================================================

INSERT INTO preset_tasks (title, description, category, xp_reward, money_reward, requires_approval, frequency, icon, sort_order) VALUES
-- Quran
('قراءة القرآن', 'قراءة سورة أو صفحة من القرآن الكريم', 'quran', 20, 0, TRUE, 'daily', '📖', 1),
('حفظ سورة جديدة', 'حفظ سورة من القرآن الكريم', 'quran', 50, 0, TRUE, 'weekly', '🕌', 2),

-- Reading
('قراءة قصة', 'قراءة قصة من القصص المتوفرة في التطبيق', 'reading', 15, 0, FALSE, 'daily', '📚', 3),
('قراءة كتاب', 'قراءة 10 صفحات من كتاب', 'reading', 20, 0, FALSE, 'daily', '📖', 4),

-- Hygiene
('تنظيف الأسنان', 'تنظيف الأسنان صباحاً ومساءً', 'hygiene', 10, 0, FALSE, 'daily', '🪥', 5),
('الاستحمام', 'الاستحمام والنظافة الشخصية', 'hygiene', 10, 0, FALSE, 'daily', '🚿', 6),
('غسل اليد بعد الأكل', 'غسل اليدين بعد الانتهاء من الطعام', 'hygiene', 5, 0, FALSE, 'daily', '🧼', 7),

-- Chores
('ترتيب السرير', 'ترتيب السرير بعد الاستيقاظ', 'chores', 10, 0, FALSE, 'daily', '🛏️', 8),
('ترتيب الغرفة', 'تنظيف وترتيب الغرفة', 'chores', 15, 0, FALSE, 'daily', '🏠', 9),
('مساعدة في المطبخ', 'مساعدة الوالدين في تحضير الطعام أو تنظيف المطبخ', 'chores', 20, 0, TRUE, 'daily', '🍳', 10),
('إطعام الحيوانات الأليفة', 'إطعام وcare الحيوانات الأليفة', 'chores', 10, 0, FALSE, 'daily', '🐾', 11),

-- Other
('تمارين رياضية', 'القيام بتمارين رياضية لمدة 15 دقيقة', 'other', 15, 0, FALSE, 'daily', '🏃', 12),
('المشي في الخارج', 'الخروج للمشي لمدة 20 دقيقة', 'other', 10, 0, FALSE, 'daily', '🚶', 13),
('تعليم something جديد', 'تعلم مهارة أو معلومة جديدة', 'other', 25, 0, TRUE, 'weekly', '💡', 14);

-- ============================================================
-- 4. RPC: Add preset task to family
-- ============================================================

CREATE OR REPLACE FUNCTION add_preset_task(
  p_preset_id UUID,
  p_family_id UUID,
  p_custom_xp INTEGER DEFAULT NULL,
  p_custom_money NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_preset RECORD;
  v_new_task_id UUID;
BEGIN
  -- Get preset task
  SELECT * INTO v_preset FROM preset_tasks WHERE id = p_preset_id;
  
  IF v_preset IS NULL THEN
    RAISE EXCEPTION 'Preset task not found';
  END IF;

  -- Insert into tasks for this family
  INSERT INTO tasks (
    family_id, title, description, xp_reward, money_reward, 
    requires_approval, frequency, is_active, is_bonus
  ) VALUES (
    p_family_id,
    v_preset.title,
    v_preset.description,
    COALESCE(p_custom_xp, v_preset.xp_reward),
    COALESCE(p_custom_money, v_preset.money_reward),
    v_preset.requires_approval,
    v_preset.frequency,
    TRUE,
    FALSE
  ) RETURNING id INTO v_new_task_id;

  RETURN v_new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. RLS for preset_tasks (read-only for everyone)
-- ============================================================

ALTER TABLE preset_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preset_tasks_select_all" ON preset_tasks;
CREATE POLICY "preset_tasks_select_all" ON preset_tasks FOR SELECT USING (true);

COMMIT;
