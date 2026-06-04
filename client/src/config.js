// ============================ game config (cats / rounds / time) ============================
import { CATS } from "@ihj/shared";
import { $, toAr, toast } from "./dom.js";
import { catCreature } from "./art.js";

export const CFG = {
  cats: CATS.filter(c => c.def).map(c => c.id),
  rounds: 3,
  time: 60,
};

// يُستدعى عند أي تغيير في الإعداد (لمزامنة الخادم في وضع الاستضافة)
let onChange = null;
export function onConfigChange(fn) { onChange = fn; }
function changed() { if (onChange) onChange({ ...CFG, cats: [...CFG.cats] }); }

export function bumpRounds(d) {
  CFG.rounds = Math.max(1, Math.min(10, CFG.rounds + d));
  $("#roundsVal").textContent = toAr(CFG.rounds);
  $("#roundsVal2").textContent = toAr(CFG.rounds);
  changed();
}

export function wireSeg(id) {
  const seg = $("#" + id);
  if (!seg) return;
  seg.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    seg.querySelectorAll("button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    CFG.time = +b.dataset.t;
    changed();
  });
}

// تحديث عدّاد الفئات ونصّ زر «تحديد الكل/إعادة الافتراضي» في الشاشتين
function updateCatMeta() {
  const n = toAr(CFG.cats.length);
  const all = CFG.cats.length >= CATS.length;
  ["catCount", "catCount2"].forEach(i => { const e = $("#" + i); if (e) e.textContent = n; });
  ["catAll", "catAll2"].forEach(i => { const e = $("#" + i); if (e) e.textContent = all ? "إعادة الافتراضي" : "تحديد الكل"; });
}

// زر سريع: تحديد كل الفئات، أو العودة للافتراضية إن كانت كلها محدّدة
export function toggleAllCats() {
  CFG.cats = CFG.cats.length >= CATS.length
    ? CATS.filter(c => c.def).map(c => c.id)
    : CATS.map(c => c.id);
  renderCatGrid("catGrid");
  renderCatGrid("catGrid2");
  changed();
}

export function renderCatGrid(id) {
  const g = $("#" + id);
  if (!g) { updateCatMeta(); return; }
  g.innerHTML = "";
  CATS.forEach(c => {
    const on = CFG.cats.includes(c.id);
    const el = document.createElement("div");
    el.className = "cat" + (on ? " on" : "");
    el.innerHTML = `<span class="em">${catCreature(c.id)}</span><span class="nm">${c.nm}</span><span class="tick">✓</span>`;
    el.onclick = () => {
      const idx = CFG.cats.indexOf(c.id);
      if (idx >= 0) {
        if (CFG.cats.length <= 2) { toast("اختر فئتين على الأقل"); return; }
        CFG.cats.splice(idx, 1);
      } else CFG.cats.push(c.id);
      renderCatGrid("catGrid");
      renderCatGrid("catGrid2");
      changed();
    };
    g.appendChild(el);
  });
  updateCatMeta();
}

export function syncConfigUI() {
  $("#roundsVal").textContent = toAr(CFG.rounds);
  $("#roundsVal2").textContent = toAr(CFG.rounds);
}
