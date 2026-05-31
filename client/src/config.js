// ============================ game config (cats / rounds / time) ============================
import { CATS } from "@ihj/shared";
import { $, toAr, toast } from "./dom.js";

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

export function renderCatGrid(id) {
  const g = $("#" + id);
  if (!g) return;
  g.innerHTML = "";
  CATS.forEach(c => {
    const on = CFG.cats.includes(c.id);
    const el = document.createElement("div");
    el.className = "cat" + (on ? " on" : "");
    el.innerHTML = `<span class="em">${c.em}</span><span class="nm">${c.nm}</span><span class="tick">✓</span>`;
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
}

export function syncConfigUI() {
  $("#roundsVal").textContent = toAr(CFG.rounds);
  $("#roundsVal2").textContent = toAr(CFG.rounds);
}
