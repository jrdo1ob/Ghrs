-- Migration 020: Reward Presets Bank (50 Rewards)
-- Creates reward_presets table and seeds 50 educational rewards

BEGIN;

-- 1. REWARD PRESETS TABLE
CREATE TABLE IF NOT EXISTS reward_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'experience',
  default_xp INTEGER DEFAULT 50,
  default_price NUMERIC DEFAULT 0,
  icon_type TEXT DEFAULT 'gift',
  is_active_by_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SEED 50 PRESET REWARDS

-- Category: experience (Moral & Experiences) - 15 rewards
INSERT INTO reward_presets (title, description, category, default_xp, default_price, icon_type) VALUES
('اختيار وجبة العشاء', 'يختار الطفل وجبة العشاء المفضلة للعائلة', 'experience', 30, 0, 'food'),
('وقت إضافي للشاشة 30 دقيقة', 'يحصل على 30 دقيقة إضافية أمام التلفاز أو الجهاز', 'experience', 40, 0, 'screen'),
('تأخير وقت النوم ساعة', 'في عطلة نهاية الأسبوع، يتأخر ساعة عن موعد النوم', 'experience', 50, 0, 'sleep'),
('قيادة الدراجة في الحديقة', 'نزهة خاصة بالدراجة في أقرب حديقة', 'experience', 35, 0, 'bike'),
('اختيار فيلم السهرة', 'يختار فيلم العائلة لمشاهدتها معاً', 'experience', 25, 0, 'movie'),
('نزهة خاصة مع الأب', 'وقت خاص مع الأب في مكان يختاره الطفل', 'experience', 60, 0, 'parent'),
('نزهة خاصة مع الأم', 'وقت خاص مع الأم في مكان يختاره الطفل', 'experience', 60, 0, 'parent'),
('دعوة صديق للبيت', 'يدعي صديقه المفضل للعب في البيت', 'experience', 45, 0, 'friend'),
('طبخ وصفة مفضلة', 'يساعد في تحضير وصفة الحلوى المفضلة', 'experience', 40, 0, 'cook'),
('رحلة للحديقة المائية', 'يوم كامل في الحديقة المائية', 'experience', 100, 0, 'water'),
('زيارة متحف', 'زيارة متحف أو معرض يختاره الطفل', 'experience', 70, 0, 'museum'),
('حفلة عشاء خاصة', 'عشاء خاص مع حلوى مفضلة', 'experience', 55, 0, 'dinner'),
('مغامرة في الملاهي', 'يوم في الملاهي أو مدينة الملاهي', 'experience', 90, 0, 'fun'),
('يوم بلا مهام', 'يوم كامل بلا أي مهام أو واجبات', 'experience', 80, 0, 'free'),
('électioniao رحلة برية', 'نزهة في الطبيعة مع العائلة', 'experience', 75, 0, 'nature'),

-- Category: toys (Toys & Goods) - 15 rewards
('لعبة جديدة', 'اختيار لعبة جديدة من المتجر', 'toys', 80, 15, 'toy'),
('كتاب أو قصة جديدة', 'كتاب أو قصة مصورة من اختيار الطفل', 'toys', 40, 8, 'book'),
('أدوات رسم وتلوين', 'علبة رسم وتلوين كاملة', 'toys', 50, 10, 'art'),
('حلويات مفضلة', 'باكيت حلويات المفضلة', 'toys', 30, 5, 'candy'),
('دببة طMONTHS', 'دببة ناعمة جميلة', 'toys', 60, 12, 'teddy'),
('PhoneNumber لعبة بناء', 'لعبة بناء مMX или مكعبات', 'toys', 70, 14, 'blocks'),
('عجلة حorescope', 'عجلة حorescope صغيرة', 'toys', 55, 11, 'car'),
('可怜doll', ' dolls جميلة', 'toys', 65, 13, 'doll'),
('كرة قدم', 'كرة قدم جديدة', 'toys', 45, 9, 'ball'),
('سماعات أطفال', 'سماعات مخصصة للأطفال', 'toys', 75, 15, 'headphones'),
('محفظة أطفال', 'محفظة جميلة بألوان مفضلة', 'toys', 35, 7, 'wallet'),
('قلم ألوان خاص', 'قلم ألوان سحري أو خاص', 'toys', 25, 5, 'pencils'),
('ساعة أطفال', 'ساعة يد مخصصة للأطفال', 'toys', 85, 18, 'watch'),
('حقيبة مدرسية', 'حقيبة مدرسية بألوان مفضلة', 'toys', 90, 20, 'bag'),
('(game) لعبة إلكترونية', 'لعبة إلكترونية بسيطة ومسلية', 'toys', 95, 22, 'game'),

-- Category: financial (Financial Rewards) - 10 rewards
('مصروف إضافي', 'مصروف أسبوعي إضافي', 'financial', 50, 5, 'money'),
('إضافة مبلغ للرصيد', 'إضافة مبلغ مالي لرصيده', 'financial', 60, 10, 'savings'),
('uction هدية مالية صغيرة', 'هدية مالية صغيرة كمكافأة', 'financial', 40, 3, 'gift'),
('تذكرة سينما', 'تذكرة سينما لفيلم يختاره', 'financial', 70, 12, 'cinema'),
('tokens رصيد 게يمنق', 'شحن رصيد لمحرك الألعاب', 'financial', 80, 15, 'gaming'),
('shopping رحلة تسوق', 'يوم تسوق واختيار هدية', 'financial', 90, 20, 'shopping'),
('donation تبرع بالنيابة', 'تبرع باسم الطفل لمشروع خيري', 'financial', 100, 25, 'charity'),
(' savings دفتر توفير', 'دفتر توفير خاص بالطفل', 'financial', 45, 8, 'piggy'),
(' prize جائزة مالية', 'جائزة مالية كبيرة للإنجاز', 'financial', 120, 30, 'prize'),
(' bonus مكافأة نهاية المуعد', 'مكافأة نهاية الأسبوع أو المدة', 'financial', 55, 7, 'bonus'),

-- Category: islamic (Educational & Spiritual) - 10 rewards
('سجادة صلاة مخصصة', 'سجادة صلاة بألوان مفضلة ومكتوب عليها اسمه', 'islamic', 70, 15, 'prayer'),
('مصحف صغير', 'مصحف صغير وجميل للطفل', 'islamic', 80, 18, 'quran'),
('religion قصص أنبياء', 'كتاب قصص الأنبياء للطفال', 'islamic', 45, 10, 'prophets'),
('isson دعاء مكتوب', ' FRAME ل教导 الأدعية', 'islamic', 35, 7, 'dua'),
('charity صندوق تبرع', 'صندوق تبرع خاص بالطفل', 'islamic', 50, 10, 'charity'),
('tasbih مسبحة صغيرة', 'مسبحة جميلة صغيرة', 'islamic', 30, 6, 'tasbih'),
('religion زيارة مسجد', 'زيارة مسجد خاص بالعائلية', 'islamic', 40, 0, 'mosque'),
('charity عمل خيري', 'المشاركة في عمل خيري مع العائلة', 'islamic', 60, 0, 'volunteer'),
('education دروس إسلامية', 'دورة قصيرة في تلاوة القرآن', 'islamic', 90, 20, 'lessons'),
('gift هدية دينية', 'هدية دينية جميلة للأطفال', 'islamic', 55, 12, 'gift');

-- 3. RPC: Add preset reward to family gifts
CREATE OR REPLACE FUNCTION add_preset_reward(
  p_preset_id UUID,
  p_family_id UUID,
  p_custom_xp INTEGER DEFAULT NULL,
  p_custom_price NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_preset RECORD;
  v_gift_id UUID;
  v_caller RECORD;
BEGIN
  SELECT * INTO v_preset FROM reward_presets WHERE id = p_preset_id;
  IF v_preset IS NULL THEN RAISE EXCEPTION 'Reward preset not found'; END IF;

  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL OR v_caller.family_id != p_family_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF v_caller.role NOT IN ('owner', 'parent') THEN
    RAISE EXCEPTION 'Only parents can add rewards';
  END IF;

  INSERT INTO gifts (family_id, title, description, cost_xp, cost_money, is_active, created_by)
  VALUES (p_family_id, v_preset.title, v_preset.description,
          COALESCE(p_custom_xp, v_preset.default_xp),
          COALESCE(p_custom_price, v_preset.default_price),
          TRUE, v_caller.id)
  RETURNING id INTO v_gift_id;

  RETURN v_gift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS for reward_presets (read-only for everyone)
ALTER TABLE reward_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reward_presets_select_all" ON reward_presets;
CREATE POLICY "reward_presets_select_all" ON reward_presets FOR SELECT USING (true);

-- 5. INDEX
CREATE INDEX IF NOT EXISTS idx_reward_presets_category ON reward_presets(category);

COMMIT;
