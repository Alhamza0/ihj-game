# إعداد Supabase — الحسابات والليدربورد

اللعبة تعمل **بدون** هذا الإعداد (يُلعب كضيف). هذه الخطوات تُفعّل الدخول بـ Google والليدربورد.
كلها لمرّة واحدة، وأغلبها من لوحة Supabase. خذ وقتك — لا كود هنا.

## ١) إنشاء المشروع
1. ادخل https://supabase.com → **New project** (الخطة المجانية كافية).
2. بعد الإنشاء، من **Project Settings → API** انسخ:
   - `Project URL` → سيصبح `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key (سرّي! للخادم فقط) → `SUPABASE_SERVICE_ROLE_KEY`

## ٢) تنفيذ المخطّط
- افتح **SQL Editor → New query**، الصق محتوى [`supabase/schema.sql`](supabase/schema.sql) كاملاً، ثم **Run**.
- ينشئ الجداول (`profiles`, `matches`, `match_players`)، سياسات RLS (قراءة عامة فقط)، ودوال الليدربورد.

## ٣) تفعيل دخول Google
1. أنشئ **OAuth Client** في [Google Cloud Console](https://console.cloud.google.com/) →
   APIs & Services → Credentials → *OAuth client ID* → نوع **Web application**.
   - **Authorized redirect URI**: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
     (تجده جاهزاً في صفحة مزوّد Google داخل Supabase).
2. في Supabase → **Authentication → Providers → Google**: فعّله، والصق `Client ID` و`Client Secret`.
3. في Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://ihj-game.vercel.app`
   - **Redirect URLs** (أضِف الاثنين): `https://ihj-game.vercel.app` و `http://localhost:5173`

## ٤) ضبط متغيّرات البيئة
**Vercel** (الواجهة) → Project → Settings → Environment Variables (بيئة Production):
```
VITE_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```
**Render** (الخادم) → Service → Environment:
```
SUPABASE_URL=https://<PROJECT-REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```
> ⚠️ لا تضع `service_role` في الواجهة إطلاقاً — للخادم فقط.

للتطوير المحلي: انسخ `client/.env.example` إلى `client/.env` واملأ متغيّرات `VITE_`،
وللخادم صدّر `SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` في الطرفية قبل `npm start`.

## ٥) إعادة النشر
- الواجهة: `vercel --prod --yes` (مع `$env:NODE_OPTIONS="--use-system-ca"`).
- الخادم: «Manual Deploy» من Render بعد إضافة المتغيّرات.

## كيف أتأكّد؟
- سجّل دخول Google في شاشة الانضمام → يظهر اسمك/صورتك.
- العب مباراة كاملة → في Supabase **Table editor** ستجد صفوفاً في `matches` و`match_players`.
- افتح شاشة الليدربورد في اللعبة → يظهر حسابك. الضيوف لا يظهرون.

---

# (اختياري) التحكيم الذكي — Claude

لتفعيل التحكيم الآلي للإجابات (يقلّل الإلغاء اليدوي): أضِف مفتاح Anthropic في Render.
بدونه تعمل اللعبة كالمعتاد (الإلغاء يدوي بالكامل).

1. أنشئ مفتاحاً من https://console.anthropic.com → **API Keys**.
2. في **Render** → الخدمة → **Environment**:
   ```
   ANTHROPIC_API_KEY = <المفتاح السرّي>
   ```
3. **Save** (يعيد النشر تلقائياً).

كيف يعمل: عند انتهاء كل جولة، يتحقّق الخادم من الإجابات (قاموس للبلدان/المدن + Claude Haiku للبقية)،
ويضع علامة «🤖 رُفض آلياً» على المشكوك فيها — ويبقى المضيف قادراً على قبولها بنقرة. التكلفة ضئيلة جداً.
