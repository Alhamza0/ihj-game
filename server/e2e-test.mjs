// اختبار تدفّق كامل: مضيف + لاعبان عبر جولة واحدة (time:0 لتجاوز المؤقّت)
import { io } from "socket.io-client";
const URL = "http://localhost:3001";
const log = (...a) => console.log(...a);
const wait = ms => new Promise(r => setTimeout(r, ms));

function mk(label) {
  const s = io(URL, { transports: ["websocket"] });
  s.onAny((ev, ...args) => log(`  [${label}] <- ${ev}`, JSON.stringify(args[0])?.slice(0, 160) || ""));
  return s;
}

const host = mk("HOST");
const p1 = mk("P1");
const p2 = mk("P2");
let code, letter, cats;

const fail = m => { console.error("❌ FAIL:", m); process.exit(1); };

(async () => {
  await new Promise(r => host.on("connect", r));
  log("== host:create ==");
  // فئات مفتوحة فقط: لا يرفضها القاموس بلا مفتاح ذكاء، فيختبر البروتوكول/الحساب بثبات
  host.emit("host:create", { cats: ["person", "animal", "plant"], rounds: 1, time: 0 });
  const created = await new Promise(r => host.once("host:created", r));
  code = created.code;
  log("room code:", code, "config:", JSON.stringify(created.config));
  if (!code || code.length !== 4) fail("لم يُنشأ كود غرفة صحيح");

  log("== players join ==");
  p1.emit("player:join", { code, name: "أحمد", clientId: "c1" });
  p2.emit("player:join", { code, name: "سارة", clientId: "c2" });
  const j1 = await new Promise(r => p1.once("join:ok", r));
  await new Promise(r => p2.once("join:ok", r));
  if (j1.clientId !== "c1") fail("clientId اللاعب غير صحيح");

  // التقاط reveal للحصول على الحرف
  const revealP = new Promise(r => host.once("round:reveal", r));
  log("== host:start ==");
  host.emit("host:start");
  const reveal = await revealP;
  letter = reveal.letter; cats = reveal.cats;
  log("الحرف:", letter, "الفئات:", JSON.stringify(cats));
  if (!letter) fail("لا يوجد حرف في reveal");

  // انتظار round:play (بعد أنيميشن الكشف ~4.2s)
  await new Promise(r => host.once("round:play", r));
  log("== round:play (الكتابة) ==");

  // إجابات: نستخدم الحرف الفعلي لضمان نقاط
  const ans = { [cats[0]]: letter + "خمد", [cats[1]]: letter + "رنب", [cats[2]]: letter + "ولندا" };
  // P1 و P2 يرسلان نفس الإجابة للفئة الأولى (تكرار → 5)، وP1 فقط فريد في البقية
  p1.emit("player:done", { vals: { [cats[0]]: ans[cats[0]], [cats[1]]: ans[cats[1]], [cats[2]]: ans[cats[2]] } });

  const scoreHostP = new Promise(r => host.once("round:score:host", r));
  const scoreP1P = new Promise(r => p1.once("round:score:player", r));
  p2.emit("player:done", { vals: { [cats[0]]: ans[cats[0]] } }); // نفس إجابة الفئة الأولى فقط

  log("== انتظار النقاط ==");
  const sHost = await scoreHostP;
  const sP1 = await scoreP1P;
  log("نقاط (host totals):", JSON.stringify(sHost.totals));
  log("نتيجة P1:", JSON.stringify(sP1));

  // تحقق: الفئة الأولى متكررة → 5 لكل لاعب ; P1 يحصل على 10+10 للفئتين الأخريين = 25
  if (sHost.totals.c1 !== 25) fail(`متوقع c1=25 (5+10+10)، حصلنا ${sHost.totals.c1}`);
  if (sHost.totals.c2 !== 5) fail(`متوقع c2=5، حصلنا ${sHost.totals.c2}`);

  // اختبار host:invalidate — إلغاء إجابة P1 في الفئة الثانية (يفقد 10) → c1=15
  log("== host:invalidate (إلغاء c1/" + cats[1] + ") ==");
  const reScoreP = new Promise(r => host.once("round:score:host", r));
  host.emit("host:invalidate", { key: "c1", cat: cats[1] });
  const sHost2 = await reScoreP;
  log("بعد الإلغاء (host totals):", JSON.stringify(sHost2.totals));
  if (sHost2.totals.c1 !== 15) fail(`بعد الإلغاء متوقع c1=15، حصلنا ${sHost2.totals.c1}`);

  // host:next → بما أن rounds=1، يجب أن تظهر النتائج النهائية
  log("== host:next → game:results ==");
  const resultsP = new Promise(r => host.once("game:results", r));
  host.emit("host:next");
  const results = await resultsP;
  log("النتائج النهائية:", JSON.stringify(results));
  if (!results.ranking || results.ranking.length !== 2) fail("ترتيب نهائي غير صحيح");
  if (results.winner !== "أحمد") fail(`متوقع الفائز أحمد، حصلنا ${results.winner}`);

  log("\n✅ نجح التدفّق الكامل: إنشاء → انضمام → جولة → نقاط → إلغاء → نتائج");
  host.close(); p1.close(); p2.close();
  process.exit(0);
})().catch(e => { console.error("❌ خطأ غير متوقّع:", e); process.exit(1); });

setTimeout(() => fail("انتهت المهلة (15s) — التدفّق لم يكتمل"), 15000);
