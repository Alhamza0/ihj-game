// ============================ shared scoring logic ============================
// منطق تطبيع النصوص العربية وحساب نقاط الجولة — مشترك بين الواجهة والخادم.
// النقاط: ١٠ لإجابة صحيحة فريدة · ٥ إذا تكررت · ٠ إذا خاطئة/فارغة.

// تطبيع: إزالة التشكيل، توحيد الألف/الياء/التاء المربوطة، ضغط المسافات.
export const norm = s => (s || "")
  .trim()
  .replace(/[ً-ْٰـ]/g, "")
  .replace(/[إأآٱا]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/\s+/g, " ");

export const firstLetter = s => { const n = norm(s); return n ? n[0] : ""; };

export const matchLetter = (a, L) =>
  firstLetter(a) !== "" && firstLetter(a) === firstLetter(L);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const compact = s => norm(s).replace(/\s/g, "");

function speedBonusFor({ baseTotal, validCount, catCount, usedSec, roundTime }) {
  if (!roundTime || !Number.isFinite(usedSec) || usedSec < 0) return 0;
  if (baseTotal <= 0 || validCount <= 0 || catCount <= 0) return 0;
  // حماية عدالة: سرعة بدون جودة لا تُكافَأ.
  const quality = validCount / catCount;
  if (quality < 0.34) return 0;

  const remainRatio = clamp(1 - usedSec / roundTime, 0, 1);
  const cap = Math.min(8, Math.round(baseTotal * 0.4));
  const qualityWeight = 0.6 + quality * 0.4;
  return Math.round(cap * remainRatio * qualityWeight);
}

// entries: [{ key, name, vals }] ; cats: [catId] ; letter
// opts: { speedSecByKey?: {key:sec}, roundTime?: number }
// returns {
//   totals:{key:pts},
//   baseTotals:{key:pts},
//   speedBonus:{key:pts},
//   breakdown:{cat:[{key,name,val,normVal,pts,reason,suspicious}]}
// }
export function scoreRound(entries, cats, letter, opts = {}) {
  const totals = {}, baseTotals = {}, speedBonus = {}, breakdown = {};
  const validPerPlayer = {};
  entries.forEach(e => {
    totals[e.key] = 0;
    baseTotals[e.key] = 0;
    speedBonus[e.key] = 0;
    validPerPlayer[e.key] = 0;
  });

  cats.forEach(cid => {
    const counts = {};
    entries.forEach(e => {
      const v = (e.vals && e.vals[cid]) || "";
      if (v.trim() && matchLetter(v, letter)) counts[norm(v)] = (counts[norm(v)] || 0) + 1;
    });

    breakdown[cid] = entries.map(e => {
      const v = (e.vals && e.vals[cid]) || "";
      const trimmed = v.trim();
      const n = norm(v);
      const valid = !!trimmed && matchLetter(v, letter);
      const pts = valid ? (counts[n] > 1 ? 5 : 10) : 0;
      const c = compact(v);
      const suspicious = valid && (c.length <= 1 || /^(.)\1{2,}$/.test(c));
      const reason = !trimmed ? "empty" : (!matchLetter(v, letter) ? "letter" : (counts[n] > 1 ? "duplicate" : "ok"));

      totals[e.key] += pts;
      baseTotals[e.key] += pts;
      if (valid) validPerPlayer[e.key] += 1;

      return { key: e.key, name: e.name, val: v, normVal: n, pts, reason, suspicious };
    });
  });

  const speedSecByKey = opts.speedSecByKey || {};
  const roundTime = opts.roundTime || 0;
  entries.forEach(e => {
    const extra = speedBonusFor({
      baseTotal: baseTotals[e.key] || 0,
      validCount: validPerPlayer[e.key] || 0,
      catCount: cats.length,
      usedSec: speedSecByKey[e.key],
      roundTime,
    });
    speedBonus[e.key] = extra;
    totals[e.key] += extra;
  });

  return { totals, baseTotals, speedBonus, breakdown };
}
