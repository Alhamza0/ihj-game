// ============================ answer fields ============================
import { CATS, matchLetter } from "@ihj/shared";
import { $ } from "./dom.js";
import { catCreature } from "./art.js";

const DRAFT_KEY = "ihj_draft";

// ---- مسوّدة محلية: تصمد أمام قفل الشاشة/تحديث الصفحة/ضعف الشبكة ----
// نخزّن { code, round, letter, vals } ونستعيدها فقط لنفس الجولة والحرف.
export function saveDraft(meta, vals) {
  if (!meta) return;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...meta, vals: vals || collectFields() })); } catch (e) {}
}
export function loadDraft(meta) {
  if (!meta) return null;
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (d && d.code === meta.code && d.round === meta.round && d.letter === meta.letter) return d.vals || null;
  } catch (e) {}
  return null;
}
export function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

let _saveTimer = null;
function scheduleSave(meta) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => saveDraft(meta), 400);
}

// يبني حقول الإجابة للفئات المختارة، بحرف معيّن.
// meta (اختياري) = { code, round, letter } لتفعيل حفظ/استعادة المسوّدة في الوضع الجماعي.
export function buildFields(letter, cats, meta = null) {
  const fields = $("#playFields");
  fields.innerHTML = "";
  const chosen = CATS.filter(c => cats.includes(c.id));
  chosen.forEach((c, i) => {
    const last = i === chosen.length - 1;
    const f = document.createElement("div");
    f.className = "field";
    f.innerHTML = `<span class="ic creature">${catCreature(c.id)}</span>` +
      `<input class="txt" data-c="${c.id}" placeholder="${c.nm} يبدأ بحرف «${letter}»"` +
      ` autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"` +
      ` enterkeyhint="${last ? "done" : "next"}">` +
      `<span class="tag">${c.nm}</span>`;
    fields.appendChild(f);
  });

  const inputs = [...fields.querySelectorAll("input")];

  // استعادة مسوّدة محفوظة لنفس الجولة (إن وُجدت)
  const draft = loadDraft(meta);
  if (draft) inputs.forEach(inp => { if (draft[inp.dataset.c]) inp.value = draft[inp.dataset.c]; });

  inputs.forEach((inp, i) => {
    inp.classList.toggle("good", matchLetter(inp.value, letter));
    inp.oninput = e => {
      e.target.classList.toggle("good", matchLetter(e.target.value, letter));
      if (meta) scheduleSave(meta);
    };
    // Enter: انتقل للحقل التالي، وفي الأخير → «انتهيت»
    inp.onkeydown = e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (i + 1 < inputs.length) inputs[i + 1].focus();
      else { inp.blur(); window.onDone && window.onDone(); }
    };
  });
}

export function collectFields() {
  const ans = {};
  $("#playFields").querySelectorAll("input").forEach(inp => ans[inp.dataset.c] = inp.value.trim());
  return ans;
}
