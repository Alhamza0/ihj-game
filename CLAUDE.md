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

## الحالة وما تبقّى (آخر تحديث: 2026-06-01)
تم: الهيكل + تفكيك الكود + الخادم الموثوق + ربط الواجهة + إعادة الاتصال. البناء ينجح (96 وحدة).
لم يُختبر بعد دورة لعب كاملة في المتصفح حياً (الخطوة التالية المباشرة).

الخطوات القادمة المتفق عليها (طموح "متوسط"):
1. **اختبار**: تشغيل `npm run dev` ولعب دورة كاملة (مضيف + لاعب) للتأكد من التدفّق.
2. **Supabase**: تسجيل دخول + حفظ نتائج المباريات + قائمة متصدّرين.
3. **محتوى**: فئات جديدة + تحسينات تجربة.
4. **النشر**: الواجهة (Cloudflare Pages/Vercel) + الخادم (Render/Railway)؛ ضبط `VITE_SERVER_URL` و`CLIENT_ORIGIN`.

## ملاحظات
- النسخة الأصلية محفوظة في `C:\Users\Hamzah\Desktop\index.html` (لا تُحذف — مرجع).
- لغة الواجهة عربية RTL. حافظ على نفس النبرة والمؤثرات.
- متغيّرات البيئة: الواجهة `VITE_SERVER_URL` (انظر `client/.env.example`)؛ الخادم `PORT` و`CLIENT_ORIGIN`.
