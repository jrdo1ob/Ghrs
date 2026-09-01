# 🌱 غرس (GHRS) — ازرع العادة، واحصد الإنجاز

تطبيق عائلي لتحويل مهام الأطفال اليومية إلى رحلة نمو مع نظام المكافآت والتحديات.

**الرابط الحي:** https://ghrs-cyan.vercel.app

---

## 🚀 الميزات الرئيسية

- **نظام المهام اليومية** — إنشاء مهام مخصصة لكل طفل مع مكافآت XP ومالية
- **الحديقة التفاعلية** — تطور النبات من بذرة إلى حديقة مزهرة حسب المستوى
- **نظام المستويات** — 6 مستويات (البذرة → البرعم → النبتة → الشجرة → الحديقة)
- **السلسلة (Streak)** — تتبع الأيام المتتالية للإنجاز مع دروع الحماية
- **المكافآت المالية** — سحب النقود مع اعتماد الوالدين
- **هدايا XP** — متجر هدايا يحتوي على 14 مهمة مقترحة جاهزة
- **azar1 Realtime** — تحديث فوري للمهام المعلقة
- **دعم العملة** — 6 عملات خليجية (KWD, SAR, AED, QAR, BHD, OMR)
- **وضع عائلي** — دخول الوالد بكلمة مرور + دخول الطفل بكود و PIN
- **PWA** — دعم العمل بدون إنترنت

---

## 🏗️ البنية التحتية

### Tech Stack
- **Frontend:** Next.js 16.3.4 + TypeScript + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + RLS + RPC)
- **Animations:** Framer Motion
- **Deployment:** Vercel

### قاعدة البيانات
- **17 جدول** مع RLS مفعّل
- **30 RPC function** للمنطق التجاري
- **5 migrations** للتحديثات

---

## ⚙️ إعدادات Supabase المطلوبة

### 1. تفعيل Realtime

يجب تفعيل Realtime على الجداول التالية لضمان التحديث اللحظي:

**الطريقة SQL:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE task_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE money_transactions;
```

**الطريقة اليدوية (Dashboard):**
1. اذهب إلى **Database → Replication**
2. فعّل التبديل (toggle) على:
   - `task_completions`
   - `money_transactions`

### 2. تفعيل pg_cron (إعادة تعيين الدروع أسبوعياً)

 pg_cron مفعّل بالفعل عبر migration `015_pg_cron_shields.sql`:

```sql
-- التحقق من تفعيل pg_cron
SELECT * FROM cron.job WHERE jobname = 'reset-weekly-grace-shields';

-- النتيجة المتوقعة:
-- jobname: reset-weekly-grace-shields
-- schedule: 0 0 * * 0  (كل أحد الساعة 00:00)
-- command: SELECT reset_weekly_grace_shields()
-- active: true
```

**إعادة التعيين يدوياً (لل_test):**
```sql
SELECT reset_weekly_grace_shields();
```

---

## 📁 هيكل المشروع

```
ghrs/
├── src/
│   ├── app/                    # صفحات التطبيق
│   │   ├── page.tsx            # الصفحة الرئيسية
│   │   ├── owner-login/        # دخول الوالد
│   │   ├── family-login/       # دخول الطفل
│   │   ├── dashboard/          # لوحة تحكم الوالد
│   │   ├── child-mode/         # وضع الطفل
│   │   │   ├── page.tsx        # الرئيسية
│   │   │   ├── tasks/          # المهام
│   │   │   ├── gifts/          # الهدايا
│   │   │   ├── garden/         # الحديقة
│   │   │   └── profile/        # الملف الشخصي
│   │   ├── tasks/              # إدارة المهام (الوالد)
│   │   ├── rewards/            # إدارة الهدايا (الوالد)
│   │   ├── payments/           # المعاملات المالية
│   │   ├── presets/            # بنك المهام المقترحة
│   │   ├── settings/           # الإعدادات
│   │   └── children/           # إدارة الأبناء
│   ├── components/             # المكونات المشتركة
│   │   ├── layout.tsx          # BottomNav, Sidebar, Toast, etc.
│   │   ├── CelebrationModal.tsx
│   │   ├── StoryReader.tsx
│   │   ├── PageLoader.tsx
│   │   └── ConfirmDialog.tsx
│   ├── hooks/
│   │   └── useFamilyCurrency.ts
│   └── lib/
│       ├── gamification.ts     # LEVELS, getLevel, getNextLevel
│       ├── currency.ts         # formatMoney, CURRENCIES
│       └── auth/               # نظام المصادقة
├── supabase/
│   ├── setup.sql               # الإعداد الأولي
│   └── migrations/             # التحديثات
│       ├── 001_initial_schema.sql
│       ├── ...
│       ├── 010_infrastructure.sql
│       ├── 011_streak_engine.sql
│       ├── 012_preset_tasks.sql
│       ├── 013_realtime_first_responder.sql
│       ├── 014_recurrence_engine.sql
│       └── 015_pg_cron_shields.sql
└── public/
    ├── manifest.json           # PWA manifest
    └── sw.js                   # Service Worker
```

---

## 🔐 الأمان

- **RLS (Row Level Security)** مفعّل على جميع الجداول
- **Ledger Protection** — triggers تمنع UPDATE/DELETE على xp_transactions و money_transactions
- **Middleware** — يتحقق من `ghrs_member_session` cookie
- **RPC Security** — جميع الدوال تتحقق من صلاحيات العائلة
- **Soft Delete** — `is_deleted` + `deleted_at` على الجداول الرئيسية

---

## 🎮 نظام Gamification

### المستويات
| المستوى | الاسم | XP المطلوب |
|---------|-------|------------|
| 1 | 🌰 البذرة | 0 |
| 2 | 🌱 البرعم | 50 |
| 3 | 🌿 النبتة | 200 |
| 4 | 🌳 الشجرة الصغيرة | 500 |
| 5 | 🌲 الشجرة الكبيرة | 1000 |
| 6 | 🏡 الحديقة | 2000 |

### الـ Streak
- يُحسب اليوم كـ streak ناجح عند إكمال **100%** من المهام المجدولة
- **درع الحماية** — 3 دروع تتجدد أسبوعياً (كل أحد)
- عند التوقف عن الحل، تتوقف الحديقة عن النمو وتظهر حالة "عطشى" 💧

---

## 🚀 التشغيل المحلي

```bash
# تثبيت التبعيات
npm install

# تشغيل بيئة التطوير
npm run dev

# بناء للإنتاج
npm run build

# نشر على Vercel
npx vercel --prod
```

---

## 📝 المطور

- **المشروع:** https://github.com/jrdoob/Ghrs
- **النشر:** https://ghrs-cyan.vercel.app
- **التقنيات:** Next.js, Supabase, Tailwind CSS, Framer Motion
