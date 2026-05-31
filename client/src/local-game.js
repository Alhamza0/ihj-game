// ============================ LOCAL game (pass & play / solo) ============================
import { LETTERS, av, scoreRound } from "@ihj/shared";
import { $, toAr, esc, toast, go } from "./dom.js";
import { CFG } from "./config.js";
import { doReveal } from "./reveal.js";
import { buildFields, collectFields } from "./fields.js";
import { startLocalTimer, clearLocalTimer } from "./timer.js";
import { renderScoreBody, renderResults, scoreFeedback } from "./scoreboard.js";
import { sDone } from "./sound.js";
import { encourage } from "./fx.js";

export const L = {
  mode: "team",
  players: [{ nm: "اللاعب ١" }, { nm: "اللاعب ٢" }],
  round: 0, turn: 0, letter: "", answers: {}, _round: {},
};

export function setMode(m) {
  L.mode = m;
  $("#mode-team").classList.toggle("on", m === "team");
  $("#mode-solo").classList.toggle("on", m === "solo");
  if (m === "solo") L.players = [{ nm: "أنا" }];
  else if (L.players.length < 2) L.players = [{ nm: "اللاعب ١" }, { nm: "اللاعب ٢" }];
  $("#playersCard").classList.toggle("hidden", m === "solo");
  renderPlayers();
}

export function renderPlayers() {
  const wrap = $("#playersList");
  wrap.innerHTML = "";
  L.players.forEach((p, i) => {
    const a = av(i);
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML =
      `<div class="av" style="background:${a.bg}">${a.em}</div>` +
      `<input class="txt" value="${esc(p.nm)}" data-i="${i}" placeholder="اسم اللاعب">` +
      `${L.players.length > 2 ? `<button class="rm" data-rm="${i}">✕</button>` : ""}`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll("input").forEach(inp => inp.oninput = e => L.players[+e.target.dataset.i].nm = e.target.value);
  wrap.querySelectorAll("[data-rm]").forEach(b => b.onclick = e => { L.players.splice(+e.target.dataset.rm, 1); renderPlayers(); });
  $("#addPlayer").style.display = L.players.length >= 8 ? "none" : "";
}

export function addPlayer() {
  if (L.players.length >= 8) return;
  L.players.push({ nm: "اللاعب " + toAr(L.players.length + 1) });
  renderPlayers();
}

export function startLocal() {
  if (CFG.cats.length < 2) { toast("اختر فئتين على الأقل"); return; }
  L.players.forEach((p, i) => { if (!p.nm.trim()) p.nm = "اللاعب " + toAr(i + 1); p.score = 0; });
  L.round = 0; L.answers = {};
  localRound();
}

function localRound() {
  L.letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  L.turn = 0;
  L.answers[L.round] = {};
  doReveal(L.round, CFG.rounds, L.letter, () => {
    if (L.mode === "solo") { L.turn = 0; beginTurn(); }
    else passNext();
  });
}

function passNext() {
  const p = L.players[L.turn], a = av(L.turn);
  $("#passAv").textContent = a.em;
  $("#passAv").style.background = a.bg;
  $("#passName").textContent = p.nm;
  $("#passLetter").textContent = "الحرف: " + L.letter + " · الجولة " + toAr(L.round + 1);
  go("s-pass");
}

export function beginTurn() {
  const p = L.players[L.turn];
  $("#playLetter").textContent = L.letter;
  $("#playWho").textContent = p.nm;
  $("#playRound").textContent = "الجولة " + toAr(L.round + 1) + " · حرف " + L.letter;
  buildFields(L.letter, CFG.cats);
  go("s-play");
  toast("هيا " + p.nm + "! اكتب بسرعة 🔥");
  setTimeout(() => $("#playFields").querySelector("input")?.focus(), 300);
  startLocalTimer(CFG.time, () => endTurn(true));
}

export function endTurn(auto) {
  clearLocalTimer();
  $("#timerNum").style.color = "";
  const ans = collectFields();
  L.answers[L.round][L.turn] = { vals: ans, invalid: {} };
  if (!auto) { sDone(); encourage("👏 أحسنت!"); }
  L.turn++;
  if (L.turn < L.players.length && L.mode === "team") passNext();
  else showLocalScore();
}

function applyInvalid(t) {
  if (!t) return {};
  const v = { ...t.vals };
  Object.keys(t.invalid || {}).forEach(k => { if (t.invalid[k]) v[k] = ""; });
  return v;
}

// يبني صفوف العرض (val = النص الأصلي، pts محسوبة بعد تطبيق الإلغاء)
function buildRows(res) {
  const rows = {};
  CFG.cats.forEach(cid => {
    rows[cid] = L.players.map((p, i) => {
      const slot = L.answers[L.round][i];
      const original = (slot && slot.vals && slot.vals[cid]) || "";
      const ptsRow = res.breakdown[cid].find(r => r.key === i);
      return { key: i, name: p.nm, val: original, pts: ptsRow ? ptsRow.pts : 0, invalid: !!(slot && slot.invalid && slot.invalid[cid]) };
    });
  });
  return rows;
}

function computeLocal() {
  const entries = L.players.map((p, i) => ({ key: i, name: p.nm, vals: applyInvalid(L.answers[L.round][i]) }));
  return scoreRound(entries, CFG.cats, L.letter);
}

function showLocalScore() {
  const res = computeLocal();
  L._round = res.totals;
  $("#scoreLetter").textContent = L.letter;
  $("#scoreRound").textContent = "الجولة " + toAr(L.round + 1);
  $("#scoreHint").classList.remove("hidden");
  $("#scoreHint").textContent = "١٠ لإجابة فريدة · ٥ إذا تكررت · ٠ إذا خاطئة. اضغط ✗ لإلغاء أي إجابة غير صحيحة.";
  $("#nextRoundBtn").textContent = (L.round + 1 >= CFG.rounds) ? "عرض النتائج 🏆" : "الجولة التالية ←";
  drawScore(res);
  scoreFeedback(buildRows(res));
  go("s-score");
}

function drawScore(res) {
  let bk = -1, bn = "";
  Object.entries(res.totals).forEach(([k, v]) => { if (v > bk) { bk = v; bn = L.players[+k]?.nm || ""; } });
  renderScoreBody({
    rows: buildRows(res), cats: CFG.cats, letter: L.letter,
    crown: (L.players.length > 1) ? { name: bn, pts: bk } : null,
    editable: true,
    onToggle: (key, cid) => {
      const t = L.answers[L.round][key];
      t.invalid[cid] = !t.invalid[cid];
      const r2 = computeLocal();
      L._round = r2.totals;
      drawScore(r2);
    },
  });
}

export function onNextRound() {
  Object.entries(L._round).forEach(([i, v]) => L.players[+i].score += v);
  L.round++;
  if (L.round >= CFG.rounds) showLocalResults();
  else localRound();
}

function showLocalResults() {
  const ranked = L.players.map((p, i) => ({ name: p.nm, score: p.score, idx: i })).sort((a, b) => b.score - a.score);
  renderResults(ranked, L.mode === "solo");
  $("#resultBtns").classList.remove("hidden");
  $("#againBtn").classList.remove("hidden");
}

export function onPlayAgain() {
  L.players.forEach(p => p.score = 0);
  L.round = 0; L.answers = {};
  localRound();
}

export function localShareList() {
  return L.players.slice().sort((a, b) => b.score - a.score).map(p => ({ name: p.nm, score: p.score }));
}
