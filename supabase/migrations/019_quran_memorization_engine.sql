-- Migration 019: Quran & Dua Memorization Engine
-- Adds quran task fields, custom content, and API integration support

BEGIN;

-- 1. ADD QURAN TASK FIELDS TO TASKS TABLE
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'standard' CHECK (task_type IN ('standard', 'quran', 'dua'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS quran_action_type TEXT CHECK (quran_action_type IN ('read', 'memorize'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS surah_number INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS from_ayah INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS to_ayah INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_title TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_content_text TEXT;

-- 2. SURAH NAMES TABLE (Juz Amma - Surah 78-114)
CREATE TABLE IF NOT EXISTS surah_names (
  id SERIAL PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name_arabic TEXT NOT NULL,
  name_english TEXT NOT NULL,
  ayah_count INTEGER NOT NULL,
  juz INTEGER DEFAULT 30
);

-- 3. SEED JUZ AMMA SURAH NAMES (78-114)
INSERT INTO surah_names (number, name_arabic, name_english, ayah_count, juz) VALUES
(78, 'النبأ', 'An-Naba', 40, 30),
(79, 'النازعات', 'An-Naziat', 46, 30),
(80, 'عبس', 'Abasa', 42, 30),
(81, 'التكوير', 'At-Takwir', 29, 30),
(82, 'الانفطار', 'Al-Infitar', 19, 30),
(83, 'المطففين', 'Al-Mutaffifin', 36, 30),
(84, 'الانشقاق', 'Al-Inshiqaq', 25, 30),
(85, 'البروج', 'Al-Buruj', 22, 30),
(86, 'الطارق', 'At-Tariq', 17, 30),
(87, 'الأعلى', 'Al-Ala', 19, 30),
(88, 'الغاشية', 'Al-Ghashiyah', 26, 30),
(89, 'الفجر', 'Al-Fajr', 30, 30),
(90, 'البلد', 'Al-Balad', 20, 30),
(91, 'الشمس', 'Ash-Shams', 15, 30),
(92, 'الليل', 'Al-Layl', 21, 30),
(93, 'الضحى', 'Ad-Duhaa', 11, 30),
(94, 'الشرح', 'Ash-Sharh', 8, 30),
(95, 'التين', 'At-Tin', 8, 30),
(96, 'العلق', 'Al-Alaq', 19, 30),
(97, 'القدر', 'Al-Qadr', 5, 30),
(98, 'البينة', 'Al-Bayyinah', 8, 30),
(99, 'الزلزلة', 'Az-Zalzalah', 8, 30),
(100, 'العاديات', 'Al-Adiyat', 11, 30),
(101, 'القارعة', 'Al-Qariah', 11, 30),
(102, 'التكاثر', 'At-Takathur', 8, 30),
(103, 'العصر', 'Al-Asr', 3, 30),
(104, 'الهمزة', 'Al-Humazah', 9, 30),
(105, 'الفيل', 'Al-Fil', 5, 30),
(106, 'قريش', 'Quraysh', 4, 30),
(107, 'الماعون', 'Al-Maun', 7, 30),
(108, 'الكوثر', 'Al-Kawthar', 3, 30),
(109, 'الكافرون', 'Al-Kafirun', 6, 30),
(110, 'النصر', 'An-Nasr', 3, 30),
(111, 'المسد', 'Al-Masad', 5, 30),
(112, 'الإخلاص', 'Al-Ikhlas', 4, 30),
(113, 'الفلق', 'Al-Falaq', 5, 30),
(114, 'الناس', 'An-Nas', 6, 30)
ON CONFLICT (number) DO NOTHING;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_surah ON tasks(surah_number);

-- 5. RLS for surah_names (read-only)
ALTER TABLE surah_names ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "surah_names_select_all" ON surah_names;
CREATE POLICY "surah_names_select_all" ON surah_names FOR SELECT USING (true);

COMMIT;
