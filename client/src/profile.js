// ============================ public player profile ============================
import { sb, currentUser, signOut } from "./auth.js";
import { $, toAr, esc, go } from "./dom.js";

export async function openProfile(pid, fallbackName) {
  if (!sb || !pid) return;
  go("s-profile");
  const head = $("#profHead"), list = $("#profMatches");
  head.innerHTML = '<div class="hint">جارِ التحميل…</div>';
  list.innerHTML = "";

  const [profRes, statsRes, matchesRes] = await Promise.all([
    sb.from("profiles").select("display_name,avatar_url,created_at").eq("id", pid).single(),
    sb.rpc("player_stats", { pid }),
    sb.from("match_players")
      .select("score,placement,is_winner,created_at,matches(player_count,finished_at)")
      .eq("profile_id", pid).order("created_at", { ascending: false }).limit(10),
  ]);

  const prof = profRes.data;
  const name = prof?.display_name || fallbackName || "لاعب";
  const s = (statsRes.data && statsRes.data[0]) || { total_score: 0, games: 0, wins: 0, best_score: 0 };
  const isSelf = currentUser()?.uid === pid;

  const av = prof?.avatar_url
    ? `<img class="profav" src="${esc(prof.avatar_url)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="profav ph">👤</span>`;
  head.innerHTML =
    `<div class="prof-top">${av}<div class="prof-name">${esc(name)}</div></div>` +
    `<div class="stat-grid">` +
      stat("النقاط", s.total_score) + stat("مباريات", s.games) +
      stat("انتصارات", s.wins) + stat("أعلى نتيجة", s.best_score) +
    `</div>` +
    (isSelf ? `<button class="btn ghost sm" style="margin-top:14px" onclick="doSignOut()">تسجيل الخروج</button>` : "");

  if (!matchesRes.data || !matchesRes.data.length) {
    list.innerHTML = '<div class="hint">لا مباريات بعد.</div>';
    return;
  }
  list.innerHTML = "";
  matchesRes.data.forEach(m => {
    const row = document.createElement("div");
    row.className = "mrow";
    const place = m.is_winner ? "🥇 فائز" : "المركز " + toAr(m.placement);
    row.innerHTML =
      `<span class="mp">${place}</span>` +
      `<small>${toAr(m.matches?.player_count || 0)} لاعبين</small>` +
      `<span class="sc">${toAr(m.score)}</span>`;
    list.appendChild(row);
  });
}

export async function doSignOut() { await signOut(); go("s-home"); }

function stat(label, val) {
  return `<div class="stat"><b>${toAr(val)}</b><span>${label}</span></div>`;
}
