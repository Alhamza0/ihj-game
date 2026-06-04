// ============================ scoreboard + results rendering ============================
import { CATS, av, norm, matchLetter } from "@ihj/shared";
import { $, esc, toAr, go } from "./dom.js";
import { countUp, crownHTML, burst } from "./fx.js";
import { sFanfare, sCheer, sTrombone, speakArabicLine } from "./sound.js";

// ---- humorous commentator ----
const MC_LINES = [
  "🎤 المعلّق يقول: استعدوا للمفاجآت!",
  "🎤 لجنة التحكيم تضحك في الكواليس…",
  "🎤 جولة ساخنة! خلّونا نشوف الإبداع",
  "🎤 بعض الإجابات تستحق جائزة الكوميديا 🏆",
  "🎤 الحرف صعب… بس الإبداع أصعب 😄",
];

function pickMC(rows, cats) {
  let notable = false;
  cats.forEach(cid => (rows[cid] || []).forEach(r => {
    const v = (r.val || "").trim();
    if (!v || r.pts === 0) notable = true;
  }));
  return notable ? MC_LINES[Math.floor(Math.random() * MC_LINES.length)] : null;
}

function quipFor(row, catRows, letter, invalidated) {
  const v = (row.val || "").trim();
  if (invalidated) return row.auto
    ? { t: "🤖 رُفض آلياً — اضغط ✓ للقبول", k: "miss" }
    : { t: "✋ أُلغيت — مرفوضة من اللجنة", k: "miss" };
  if (!v) return { t: "📄 بياض الورقة… إلهام مفقود!", k: "miss" };
  if (!matchLetter(v, letter)) return { t: "🙃 الحرف المطلوب «" + letter + "» مو هذا!", k: "miss" };
  const compact = norm(v).replace(/\s/g, "");
  if (/^(.)\1{2,}$/.test(compact)) return { t: "😆 ضغطة مطوّلة على الزر؟", k: "fun" };
  if (compact.length <= 1) return { t: "😅 حرف واحد وانتهينا!", k: "fun" };
  const words = v.split(/\s+/).filter(Boolean);
  if (v.length >= 16 || words.length >= 4) return { t: "📚 هذي رواية مو إجابة!", k: "fun" };
  const valid = catRows.filter(r => { const vv = (r.val || "").trim(); return vv && matchLetter(vv, letter); });
  const same = valid.filter(r => norm(r.val) === norm(v)).length;
  if (valid.length >= 3 && same === valid.length) return { t: "🤝 اتفقتوا كلكم! إجابة الجماهير", k: "meh" };
  if (same > 1) return { t: "👯 توأمة في التفكير", k: "meh" };
  return null;
}

export function anyMiss(rows) {
  let miss = false;
  Object.values(rows || {}).forEach(arr => arr.forEach(r => {
    const v = (r.val || "").trim();
    if (!v || r.pts === 0) miss = true;
  }));
  return miss;
}

/*
 * يعرض نتيجة الجولة. opts:
 *  - rows: { catId: [{ key, name, val, pts, invalid }] }   (val = النص الأصلي للعرض، pts = النقاط النهائية)
 *  - cats: [catId]
 *  - letter
 *  - crown: { name, pts } | null
 *  - editable: bool ، onToggle(key, catId)
 *  - multiplayer: bool (لإظهار التاج فقط عند وجود أكثر من لاعب)
 */
export function renderScoreBody(opts) {
  const { rows, cats, letter, crown, editable, onToggle } = opts;
  const body = $("#scoreBody");
  body.innerHTML = "";

  const mc = pickMC(rows, cats);
  if (mc) {
    const h = document.createElement("div");
    h.className = "mc";
    h.innerHTML = `<span class="em">🎙️</span><span>${mc.replace("🎤 ", "")}</span>`;
    body.appendChild(h);
    speakArabicLine(mc);
  }

  if (crown && crown.pts > 0) {
    const cr = document.createElement("div");
    cr.innerHTML = crownHTML(crown.name, crown.pts);
    body.appendChild(cr.firstChild);
  }

  CATS.filter(c => cats.includes(c.id)).forEach(c => {
    const block = document.createElement("div");
    block.className = "score-cat card";
    block.style.marginBottom = "12px";
    block.innerHTML = `<div class="h"><span>${c.em}</span>${c.nm}</div>`;
    (rows[c.id] || []).forEach(row => {
      const v = (row.val || "").trim();
      const inv = !!row.invalid;
      const pts = row.pts;
      const q = quipFor(row, rows[c.id], letter, inv);
      const r = document.createElement("div");
      r.className = "ans" + (inv ? " invalid" : "");
      r.innerHTML =
        `<span class="who">${esc(row.name)}</span>` +
        `<div class="valwrap"><span class="val ${v ? "" : "empty"}">${v ? esc(v) : "— فارغ —"}</span>` +
        `${q ? `<div class="quip ${q.k}">${q.t}</div>` : ""}</div>` +
        `<span class="pts p${pts}">${pts}</span>` +
        `${(editable && v) ? `<button class="toggle">${inv ? "✗" : "✓"}</button>` : ""}`;
      const tg = r.querySelector(".toggle");
      if (tg && onToggle) tg.onclick = () => onToggle(row.key, c.id);
      block.appendChild(r);
    });
    body.appendChild(block);
  });
}

export function scoreFeedback(rows) {
  if (anyMiss(rows)) sTrombone();
  let best = 0;
  Object.values(rows || {}).forEach(arr => arr.forEach(r => { if (r.pts > best) best = r.pts; }));
  if (best > 0) setTimeout(sCheer, 500);
}

// ---- final results ----
export function renderResults(list, solo) {
  const top = list[0];
  $("#winEm").textContent = solo ? "🎯" : "🏆";
  $("#winName").textContent = top ? top.name : "—";
  const lead = $("#finalLead");
  lead.innerHTML = "";
  list.forEach((p, rank) => {
    const a = av(p.idx ?? rank);
    const row = document.createElement("div");
    row.className = "lrow" + (rank === 0 ? " gold" : "");
    row.innerHTML =
      `<div class="rk">${rank === 0 ? "★" : toAr(rank + 1)}</div>` +
      `<div class="av" style="background:${a.bg}">${a.em}</div>` +
      `<div class="nm">${esc(p.name)}</div>` +
      `<div class="sc" data-to="${p.score}">٠</div>`;
    lead.appendChild(row);
  });
  go("s-results");
  lead.querySelectorAll(".sc").forEach(el => countUp(el, +el.dataset.to, 1100));
  sFanfare();
  if (top?.name) speakArabicLine(`المتصدر حالياً ${top.name} برصيد ${top.score} نقطة`);
  burst(.5, .4, 140);
  setTimeout(() => burst(.2, .3, 70), 300);
  setTimeout(() => burst(.8, .3, 70), 520);
}
