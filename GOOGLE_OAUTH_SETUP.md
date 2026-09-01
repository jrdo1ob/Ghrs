# دليل إعداد Google OAuth الخاص بمشروع غرس (GHRS)

## المشكلة
تظهر شاشة موافقة Google بنطاق `xcbedqffmknlzjfpuwdr.supabase.co` بدلاً من نطاق مشروعك.

## الحل
إنشاء عميل Google OAuth خاص بك وربطه بـ Supabase.

---

## الخطوة 1: إنشاء مشروع في Google Cloud Console

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. من القائمة الجانبية، اذهب إلى **APIs & Services > OAuth consent screen**
4. اختر **External** ثم اضغط **CREATE**

### بيانات شاشة الموافقة:
- **App name:** `غرس - GHRS`
- **User support email:** البريد الإلكتروني الخاص بك
- **App logo:** ارفع شعار المشروع (اختياري)
- **Application home page:** `https://ghrs-cyan.vercel.app`
- **Application privacy policy link:** `https://ghrs-cyan.vercel.app` (مؤقتاً)
- **Authorized domains:** أضف `ghrs-cyan.vercel.app`
- **Developer contact information:** البريد الإلكتروني الخاص بك

5. اضغط **SAVE AND CONTINUE**

---

## الخطوة 2: إنشاء OAuth Client ID

1. من القائمة الجانبية، اذهب إلى **APIs & Services > Credentials**
2. اضغط **+ CREATE CREDENTIALS > OAuth client ID**
3. اختر **Web application** كنوع التطبيق
4. أدخل البيانات:

### Basic Information:
- **Name:** `GHRS OAuth Client`

### Authorized redirect URIs:
أضف الروابط التالية:
```
https://xcbedqffmknlzjfpuwdr.supabase.co/auth/v1/callback
https://ghrs-cyan.vercel.app/auth/callback
```

5. اضغط **CREATE**
6. **احفظ** بيانات العميل:
   - **Client ID:** `533663504579-xxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`

---

## الخطوة 3: ربط العميل بـ Supabase

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard/)
2. اختر مشروعك: `xcbedqffmknlzjfpuwdr`
3. من القائمة الجانبية، اذهب إلى **Authentication > Providers**
4. ابحث عن **Google** واضغط عليه
5. فعّل التبديل (Enable Sign in with Google)
6. أدخل البيانات:
   - **Client ID:** البيانات من الخطوة 2
   - **Client Secret:** البيانات من الخطوة 2
7. اضغط **Save**

---

## الخطوة 4: التحقق من إعدادات Supabase

### Site URL:
1. اذهب إلى **Authentication > URL Configuration**
2. تأكد من أن **Site URL** هو:
   ```
   https://ghrs-cyan.vercel.app
   ```

### Redirect URLs:
تأكد من وجود الروابط التالية:
```
https://ghrs-cyan.vercel.app
https://ghrs-cyan.vercel.app/auth/callback
https://ghrs-cyan.vercel.app/owner-login
```

---

## الخطوة 5: التحقق من Google Cloud Console

### OAuth Consent Screen:
1. تأكد من أن التطبيق في حالة **PUBLISH** (وليس **Testing**)
2. إذا كان في وضع Testing، اضغط **PUBLISH APP**

### Authorized Domains:
تأكد من وجود:
```
ghrs-cyan.vercel.app
```

---

## الخطوة 6: اختبار تسجيل الدخول

1. افتح [https://ghrs-cyan.vercel.app/owner-login](https://ghrs-cyan.vercel.app/owner-login)
2. اضغط "دخول عبر Google"
3. يجب أن تظهر شاشة الموافقة باسم **غرس - GHRS** ونطاقك الخاص

---

## ملاحظات مهمة

### إذا ظهرت رسالة خطأ:
- تأكد من أن **Client ID** و **Client Secret** صحيحان
- تأكد من أن **Redirect URIs** متطابقة تماماً (بدون / في النهاية)
- تأكد من أن التطبيق في وضع **PUBLISH** وليس **Testing**

### اختبار على骡�� various devices:
- على الهاتف، قد تحتاج لتفعيل "Advanced" ثم "Go to ghrs-cyan.vercel.app (unsafe)"
- هذا يحدث فقط في وضع Testing

### تحسينات إضافية:
- أضف **App Logo** لعرض الشعار في شاشة الموافقة
- أضف **Privacy Policy** و **Terms of Service** روابط حقيقية
- فعّل **Google People API** لجلب معلومات المستخدم

---

## thời gian متوقع

- إنشاء المشروع: 5 دقائق
- إنشاء OAuth Client: 10 دقائق
- ربط Supabase: 5 دقائق
- الاختبار: 5 دقائق

**الوقت الإجمالي: ~25 دقيقة**

---

## الدعم الفني

إذا واجهت مشاكل:
1. راجع [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2/web-server)
2. راجع [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
3. تواصل مع فريق الدعم الفني
