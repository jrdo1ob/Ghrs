-- ============================================
-- GHRS - Seed Data
-- ============================================

-- Insert default achievement definitions
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
