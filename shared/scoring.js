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

// entries: [{ key, name, vals }] ; cats: [catId] ; letter
// returns { totals:{key:pts}, breakdown:{cat:[{key,name,val,pts}]} }
export function scoreRound(entries, cats, letter) {
  const totals = {}, breakdown = {};
  entries.forEach(e => { totals[e.key] = 0; });
  cats.forEach(cid => {
    const counts = {};
    entries.forEach(e => {
      const v = (e.vals && e.vals[cid]) || "";
      if (v.trim() && matchLetter(v, letter)) counts[norm(v)] = (counts[norm(v)] || 0) + 1;
    });
    breakdown[cid] = entries.map(e => {
      const v = (e.vals && e.vals[cid]) || "";
      const valid = v.trim() && matchLetter(v, letter);
      const pts = valid ? (counts[norm(v)] > 1 ? 5 : 10) : 0;
      totals[e.key] += pts;
      return { key: e.key, name: e.name, val: v, pts };
    });
  });
  return { totals, breakdown };
}
