# إنسان · حيوان · جماد — لعبة حروف عربية جماعية

لعبة الحروف الكلاسيكية (Scattergories بالعربي) بوضع محلي + لعب جماعي أونلاين.
أُعيد بناؤها من ملف HTML واحد (`Desktop/index.html` الأصلي، ~183KB كان يعتمد على PeerJS P2P)
إلى مشروع منظّم بخادم موثوق (authoritative server).

## ⚠️ مهم: اعتراض TLS على هذا الجهاز
هذا الجهاز فيه بروكسي/برنامج حماية يعترض شهادات HTTPS، فيفشل `npm install`
بخطأ `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. الحل: جعل Node يثق بمخزن شهادات Windows.

- تم ضبط متغيّر البيئة `NODE_OPTIONS=--use-system-ca` على مستوى المستخدم (يعمل في أي طرفية جديدة).
- لو ظهر خطأ TLS في أمر تثبيت، صدّر المتغيّر يدوياً أولاً:
  ```powershell
  $env:NODE_OPTIONS="--use-system-ca"; npm install
  ```
- التشغيل/البناء لا يحتاجان شبكة، فالمشكلة تخص التثبيت فقط.

## التشغيل
```powershell
npm install          # مرة واحدة (راجع ملاحظة TLS أعلاه)
npm run dev          # يشغّل الخادم (3001) + الواجهة (5173) معاً
npm run build        # يبني الواجهة في client/dist
npm start            # يشغّل الخادم وحده (للإنتاج)
```
- الواجهة المحلية: http://localhost:5173
- للاختبار من الجوال على نفس الشبكة: افتح رابط Network الذي يطبعه Vite (مثل `http://192.168.x.x:5173`).
  الواجهة تتصل بالخادم تلقائياً على `http://<نفس-المضيف>:3001` في التطوير.

## المعمارية
Monorepo بـ npm workspaces (`type: module`، ESM في كل مكان).

```
shared/         منطق مشترك بين الواجهة والخادم
  data.js       LETTERS, CATS, AVAB, av()
  scoring.js    norm/matchLetter/scoreRound — حساب النقاط (المصدر الوحيد للحقيقة)
server/         خادم Node + Socket.IO (authoritative — يدير الحرف/المؤقّت/الجمع/النقاط)
  server.js     نقطة الدخول: يربط أحداث Socket.IO بـ RoomManager
  rooms.js      RoomManager: الغرف، اللاعبون، تدفّق الجولات، إعادة الاتصال
client/         واجهة Vite (vanilla JS modules) — تحافظ على نفس تصميم النسخة الأصلية
  index.html    الترميز (محفوظ من الأصل، أزرار onclick مربوطة عبر window)
  src/
    main.js     التهيئة + توجيه أزرار الواجهة + شاشة المشاركة
    dom.js       $ / go / toast / esc / toAr
    sound.js     مؤثرات صوتية مُركّبة (Web Audio، بلا ملفات)
    fx.js        كونفيتي / فلاش / تشجيع / countUp / crown
    config.js    CFG (الفئات/الجولات/المدة) + onConfigChange لمزامنة الخادم
    fields.js    بناء/جمع حقول الإجابات
    timer.js     مؤقّت محلي + عرض مؤقّت الخادم
    reveal.js    أنيميشن العدّ التنازلي ٣·٢·١ وكشف الحرف
    scoreboard.js عرض النتائج (مدفوع بالبيانات) + النتائج النهائية
    local-game.js وضع اللعب المحلي (تناوب/فردي)
    net.js       عميل Socket.IO (مضيف + لاعب) — يستبدل PeerJS بالكامل
```

### نموذج اللعب الجماعي
- المضيف = شاشة "تلفاز" (`body.tv`). ينشئ غرفة بكود من ٤ خانات، QR للانضمام.
- الخادم موثوق: يختار الحرف، يدير المؤقّت لكل ثانية (`timer`)، يجمع الإجابات، ويحسب النقاط.
- اللاعبون ينضمّون بالكود/QR، يكتبون، يرسلون. المضيف يلغي الإجابات الخاطئة → الخادم يعيد الحساب فوراً.
- إعادة الاتصال: العميل يحفظ `clientId` في localStorage؛ اللاعب يعود لمقعده، المضيف يستخدم `host:rebind`.

### أحداث Socket.IO الرئيسية
- مضيف→خادم: `host:create` / `host:rebind` / `host:config` / `host:start` / `host:invalidate` / `host:next` / `host:again`
- لاعب→خادم: `player:join` / `player:answers` / `player:done`
- خادم→عملاء: `host:created` / `room:lobby` / `round:reveal` / `round:play` / `timer` / `round:collect` / `submit:status` / `round:score:host` / `round:score:player` / `game:results` / `host:gone` / `room:closed`

## النشر الحي (Production)
- **الواجهة (Vercel):** https://ihj-game.vercel.app
- **الخادم (Render):** https://ihj-game.onrender.com (Free plan — قد ينام بعد فترة خمول)
- **المستودع:** https://github.com/Alhamza0/ihj-game

### إعدادات النشر
- Render: Web Service · Root Directory `server` · Build `npm install` · Start `npm start`
- Vercel: Build `npm run build` · Output `client/dist` · متغير `VITE_SERVER_URL=https://ihj-game.onrender.com`
- Auto-deploy مفعّل: أي push على `main` يعيد النشر تلقائياً على المنصتين.

## الحالة وما تبقّى (آخر تحديث: 2026-06-02 — أُضيف دعم PWA وصمود الجوال)
**تم بالكامل:**
- الهيكل + تفكيك الكود + الخادم الموثوق + ربط الواجهة + إعادة الاتصال.
- نشر مجاني حي على Render + Vercel مع ربط متغيرات البيئة.
- إصلاح: الانضمام أثناء مرحلة `reveal` صار مسموحاً (يدخل نفس الجولة).
- محرك نقاط متطوّر: حالات تحقق (`empty`/`letter`/`duplicate`/`ok`) + علامة `suspicious` للإجابات المشكوكة.
- مكافأة سرعة عادلة: تحتسب فقط عند جودة ≥ 34% من الفئات؛ مرتبطة بالوقت المتبقي وحجم النقاط الأساسية.
- فئات جديدة: مدينة، ماركة، رياضة، فيلم، مسلسل (إضافة على الفئات الأصلية).
- تعليق صوتي عربي خفيف عبر Web Speech API (يُفعَّل في لحظات النتائج).
- اختبار E2E على البروتوكول عبر `server/e2e-test.mjs` يمر بالكامل.
- **PWA + صمود الجوال:** manifest + service worker يدويان (بلا اعتماد جديد، تجنّباً لمشكلة TLS) — تثبيت كتطبيق وقشرة تعمل أوفلاين (وضع اللعب المحلي يعمل بلا إنترنت). حفظ مسوّدة الإجابات محلياً (`ihj_draft`) واستعادتها لنفس الجولة؛ إعادة إرسال تلقائية للإجابات المعلّقة (`ihj_pending`) عند عودة الاتصال؛ مؤشّر «غير متصل»؛ حفظ عند قفل الشاشة (`visibilitychange`/`pagehide`). حقول أكبر للمس + تنقّل Enter (مقيّد بـ `body:not(.tv)`).

### بنية محرك النقاط (المحدّث)
`scoreRound(entries, cats, letter, { speedSecByKey, roundTime })` يعيد:
- `totals` = نقاط أساسية + مكافأة سرعة (نهائية).
- `baseTotals` = نقاط الإجابات فقط (10 فريد · 5 مكرر · 0 خطأ).
- `speedBonus` = مكافأة السرعة لكل لاعب (≤ min(8, 40% من الأساسي)).
- `breakdown[cat]` = صفوف بكل المعلومات: `{ key, name, val, normVal, pts, reason, suspicious }`.

### الخطوات القادمة المقترحة
1. **حسابات لاعب**: تسجيل دخول (Google/Email) + حفظ تاريخ المباريات.
2. **ليدربورد**: تصنيف يومي/أسبوعي + ملف لاعب عام.
3. ~~**تحسينات الجوال (PWA)**~~ ✅ تم (انظر «تم بالكامل» أعلاه). متبقٍّ اختياري: أيقونات PNG مولّدة + لقطات شاشة للمنيفست.
4. **تحكيم أذكى**: مطابقة تقريبية للأخطاء الإملائية + قاموس كلمات لكل فئة.
5. **أوضاع لعب**: سريع / تنافسي (ELO) / خاص بالأصدقاء.
6. **ضبط أوزان السرعة**: 3 أنماط (هادئ/متوازن/سريع) قابلة للاختيار من إعدادات الغرفة.

## ملاحظات
- النسخة الأصلية محفوظة في `C:\Users\Hamzah\Desktop\index.html` (لا تُحذف — مرجع).
- لغة الواجهة عربية RTL. حافظ على نفس النبرة والمؤثرات.
- متغيّرات البيئة: الواجهة `VITE_SERVER_URL` (انظر `client/.env.example`)؛ الخادم `PORT` و`CLIENT_ORIGIN`.
