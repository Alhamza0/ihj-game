// ============================ answer fields ============================
import { CATS, matchLetter } from "@ihj/shared";
import { $ } from "./dom.js";

// يبني حقول الإجابة للفئات المختارة، بحرف معيّن
export function buildFields(letter, cats) {
  const fields = $("#playFields");
  fields.innerHTML = "";
  CATS.filter(c => cats.includes(c.id)).forEach(c => {
    const f = document.createElement("div");
    f.className = "field";
    f.innerHTML = `<span class="ic">${c.em}</span>` +
      `<input class="txt" data-c="${c.id}" placeholder="${c.nm} يبدأ بحرف «${letter}»" autocomplete="off">` +
      `<span class="tag">${c.nm}</span>`;
    fields.appendChild(f);
  });
  fields.querySelectorAll("input").forEach(inp =>
    inp.oninput = e => e.target.classList.toggle("good", matchLetter(e.target.value, letter))
  );
}

export function collectFields() {
  const ans = {};
  $("#playFields").querySelectorAll("input").forEach(inp => ans[inp.dataset.c] = inp.value.trim());
  return ans;
}
