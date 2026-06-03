// ============================ leaderboard ============================
import { sb } from "./auth.js";
import { $, toAr, esc, go } from "./dom.js";

let period = "all";

export function openLeaderboard() {
  go("s-leaderboard");
  loadLeaderboard();
}

export function lbSetPeriod(p, btn) {
  period = p;
  document.querySelectorAll("#lbTabs button").forEach(b => b.classList.toggle("on", b === btn));
  loadLeaderboard();
}

async function loadLeaderboard() {
  const body = $("#lbBody");
  body.innerHTML = '<div class="hint">جارِ التحميل…</div>';
  if (!sb) { body.innerHTML = '<div class="hint">الليدربورد غير متاح حالياً.</div>'; return; }
  const { data, error } = await sb.rpc("leaderboard", { period, lim: 50 });
  if (error) { body.innerHTML = '<div class="hint">تعذّر تحميل الليدربورد.</div>'; return; }
  if (!data || !data.length) { body.innerHTML = '<div class="hint">لا نتائج بعد — كن أول من يتصدّر! 🏆</div>'; return; }
  body.innerHTML = "";
  data.forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "lrow rank" + (i < 3 ? " top" : "");
    const medal = ["🥇", "🥈", "🥉"][i] || `<b class="rk">${toAr(i + 1)}</b>`;
    const av = r.avatar_url
      ? `<img class="lbav" src="${esc(r.avatar_url)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="lbav ph">👤</span>`;
    row.innerHTML =
      `<span class="medal">${medal}</span>${av}` +
      `<span class="who"><span class="nm">${esc(r.display_name)}</span>` +
      `<small>${toAr(r.games)} مباراة · ${toAr(r.wins)} فوز</small></span>` +
      `<span class="sc">${toAr(r.total_score)}</span>`;
    row.onclick = () => window.openProfile(r.profile_id, r.display_name);
    body.appendChild(row);
  });
}
