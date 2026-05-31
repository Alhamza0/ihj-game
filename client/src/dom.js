// ============================ DOM helpers ============================
export const $ = s => document.querySelector(s);

// أرقام عربية
export const toAr = n => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);

// تهريب HTML
export const esc = s => (s || "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

// تبديل الشاشة المعروضة
export function go(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = $("#" + id);
  if (!el) return;
  el.classList.add("active");
  el.querySelectorAll(".stagger").forEach(g =>
    Array.from(g.children).forEach(ch => { ch.style.animation = "none"; void ch.offsetWidth; ch.style.animation = ""; })
  );
  window.scrollTo(0, 0);
}

export function toast(t) {
  const e = $("#toast");
  e.textContent = t;
  e.classList.add("show");
  clearTimeout(e._t);
  e._t = setTimeout(() => e.classList.remove("show"), 2200);
}
