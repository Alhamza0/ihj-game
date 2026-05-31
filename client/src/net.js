// ============================ network layer (Socket.IO client) ============================
import { io } from "socket.io-client";
import QRCode from "qrcode";
import { av } from "@ihj/shared";
import { $, toAr, esc, toast, go } from "./dom.js";
import { CFG, onConfigChange, renderCatGrid, syncConfigUI } from "./config.js";
import { doReveal } from "./reveal.js";
import { buildFields, collectFields } from "./fields.js";
import { initNetTimer, setTimerDisplay, startLocalTimer, clearLocalTimer } from "./timer.js";
import { renderScoreBody, renderResults, scoreFeedback } from "./scoreboard.js";
import { unlockAudio, sJoin, sBig, sTrombone } from "./sound.js";
import { encourage, burst } from "./fx.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${location.protocol}//${location.hostname}:3001`;
const TV = { arc: "tvArc", num: "tvNum", wrap: "tvTimerWrap" };
const PHONE = { arc: "timerArc", num: "timerNum", wrap: "timerWrap" };

export const NET = { active: false, role: null };
let socket = null;
let H = null;   // host state
let P = null;   // player state

function clientId() {
  let id = localStorage.getItem("ihj_cid");
  if (!id) { id = "c" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("ihj_cid", id); }
  return id;
}

function setStatus(el, kind, txt) {
  $("#" + el).innerHTML = `<span class="dotpulse ${kind}"></span><span>${txt}</span>`;
}

function connect() {
  if (socket) { try { socket.removeAllListeners(); socket.disconnect(); } catch (e) {} }
  socket = io(SERVER_URL, { reconnection: true, reconnectionDelay: 800 });
  wireCommon();
  return socket;
}

// ---------- shared listeners (host + player) ----------
function wireCommon() {
  socket.on("connect", () => {
    if (NET.role === "host") {
      if (H && H.code) socket.emit("host:rebind", { code: H.code });   // إعادة اتصال
      else socket.emit("host:create", { ...CFG, cats: [...CFG.cats] }); // أول اتصال
    } else if (NET.role === "player" && P) {
      socket.emit("player:join", { code: P.code, name: P.name, clientId: clientId() });
    }
  });

  socket.on("connect_error", () => {
    if (NET.role === "host") setStatus("hostStatus", "err", "تعذّر الاتصال بالخادم");
    else if (NET.role === "player" && !P?.joined) setStatus("joinStatus", "err", "تعذّر الاتصال بالخادم");
  });

  socket.on("error:msg", ({ message }) => toast(message || "حدث خطأ"));

  // --- reveal / play (both roles) ---
  socket.on("round:reveal", ({ round, rounds, letter, cats, time }) => {
    CFG.cats = cats; CFG.rounds = rounds; CFG.time = time;
    if (NET.role === "player") { P.letter = letter; P.time = time; P.round = round; }
    if (NET.role === "host") { H.round = round; H.letter = letter; }
    doReveal(round, rounds, letter, () => {});
  });

  socket.on("round:play", ({ letter, time }) => {
    if (NET.role === "host") {
      $("#tvLetter").textContent = letter;
      $("#tvBigLetter").textContent = letter;
      $("#tvRoundS").textContent = "الجولة " + toAr(H.round + 1) + " من " + toAr(CFG.rounds);
      renderTVSubmit([]);
      go("s-tvplay");
      initNetTimer(time, TV);
    } else {
      buildFields(letter, CFG.cats);
      $("#playLetter").textContent = letter;
      $("#playWho").textContent = P.name;
      $("#playRound").textContent = "الجولة " + toAr(P.round + 1) + " · حرف " + letter;
      go("s-play");
      toast("هيا " + P.name + "! اكتب بسرعة 🔥");
      setTimeout(() => $("#playFields").querySelector("input")?.focus(), 250);
      initNetTimer(time, PHONE);
      // مؤقّت احتياطي محلي: يُرسل تلقائياً عند انتهاء الوقت لو تأخّر الخادم
      startLocalTimer(time, () => playerSubmit(true), PHONE);
    }
  });

  socket.on("timer", ({ left }) => {
    setTimerDisplay(left, CFG.time, NET.role === "host" ? TV : PHONE);
  });

  socket.on("round:collect", () => {
    if (NET.role === "player" && $("#s-play").classList.contains("active")) playerSubmit(true);
  });
}

/* ============================ HOST ============================ */
export function hostStart() {
  unlockAudio();
  document.body.classList.add("tv");
  NET.active = true; NET.role = "host";
  H = { code: null, round: 0, letter: "" };
  CFG.time = 60;
  renderCatGrid("catGrid2"); syncConfigUI();
  go("s-lobby");
  renderLobby([]);
  setStatus("hostStatus", "wait", "جارِ تجهيز الغرفة…");

  // إعدادات الغرفة تُزامَن مع الخادم عند تغييرها
  onConfigChange(cfg => { if (socket && H.code) socket.emit("host:config", cfg); });

  connect();
  wireHost();
}

function wireHost() {
  socket.on("host:created", ({ code, config }) => {
    H.code = code;
    if (config) { CFG.cats = config.cats; CFG.rounds = config.rounds; CFG.time = config.time; }
    buildQR(code);
    renderCatGrid("catGrid2"); syncConfigUI();
    setStatus("hostStatus", "", `جاهزة · الرمز ${code}`);
  });

  socket.on("room:lobby", ({ players }) => renderLobby(players));
  socket.on("submit:status", players => renderTVSubmit(players));

  socket.on("round:score:host", payload => renderHostScore(payload));

  socket.on("game:results", ({ ranking }) => {
    H.ranking = ranking;
    renderResults(ranking, false);
    $("#resultBtns").classList.remove("hidden");
    $("#againBtn").classList.remove("hidden");
  });
}

function joinURL(code) { return `${location.origin}${location.pathname}?room=${code}`; }

function buildQR(code) {
  const box = $("#qrbox");
  box.innerHTML = "";
  $("#roomCode").textContent = code;
  $("#joinUrlHint").textContent = joinURL(code);
  const size = document.body.classList.contains("tv") ? 240 : 200;
  const canvas = document.createElement("canvas");
  box.appendChild(canvas);
  QRCode.toCanvas(canvas, joinURL(code), { width: size, margin: 1, color: { dark: "#0c1030", light: "#ffffff" } },
    err => { if (err) box.innerHTML = '<div class="hint">تعذّر إنشاء الرمز</div>'; });
}

function renderLobby(players) {
  $("#joinCount").textContent = toAr(players.length);
  const wrap = $("#lobbyPlayers");
  if (!players.length) { wrap.innerHTML = '<div class="hint">في انتظار انضمام اللاعبين…</div>'; }
  else {
    wrap.innerHTML = "";
    players.forEach(e => {
      const a = av(e.idx);
      const c = document.createElement("div");
      c.className = "pchip";
      c.style.opacity = e.connected ? "1" : ".5";
      c.innerHTML = `<span class="av" style="background:${a.bg}">${a.em}</span>${esc(e.name)}`;
      wrap.appendChild(c);
    });
  }
  $("#hostStartBtn").disabled = players.length < 1;
}

function renderTVSubmit(players) {
  const wrap = $("#tvSubmit");
  wrap.innerHTML = "";
  players.forEach(e => {
    const a = av(e.idx);
    const el = document.createElement("div");
    el.className = "sstat" + (e.ready ? " done" : "");
    el.innerHTML = `<span class="av" style="background:${a.bg}">${a.em}</span>${esc(e.name)} ${e.ready ? '<span class="ck">✓</span>' : ""}`;
    wrap.appendChild(el);
  });
}

export function hostBeginGame() {
  if (!socket) return;
  socket.emit("host:start");
}

function renderHostScore({ round, letter, cats, breakdown, totals, invalid, players, firstRender }) {
  clearLocalTimer();
  CFG.cats = cats; H.letter = letter; H.round = round;
  const rows = {};
  cats.forEach(cid => {
    rows[cid] = players.map(pl => {
      const brow = (breakdown[cid] || []).find(r => r.key === pl.key);
      const inv = !!(invalid[pl.key] && invalid[pl.key][cid]);
      return { key: pl.key, name: pl.name, val: (pl.rawVals && pl.rawVals[cid]) || "", pts: brow ? brow.pts : 0, invalid: inv };
    });
  });
  let bk = -1, bn = "";
  players.forEach(pl => { const v = totals[pl.key] || 0; if (v > bk) { bk = v; bn = pl.name; } });

  $("#scoreLetter").textContent = letter;
  $("#scoreRound").textContent = "الجولة " + toAr(round + 1);
  $("#scoreHint").classList.remove("hidden");
  $("#scoreHint").textContent = "اضغط ✗ بجانب أي إجابة خاطئة لإلغائها — تتحدّث النقاط فوراً على هواتف اللاعبين.";
  $("#nextRoundBtn").textContent = (round + 1 >= CFG.rounds) ? "عرض النتائج 🏆" : "الجولة التالية ←";

  renderScoreBody({
    rows, cats, letter,
    crown: (players.length > 1) ? { name: bn, pts: bk } : null,
    editable: true,
    onToggle: (key, cid) => socket.emit("host:invalidate", { key, cat: cid }),
  });
  if (firstRender) scoreFeedback(rows);
  go("s-score");
}

export function hostNextRound() { if (socket) socket.emit("host:next"); }
export function hostPlayAgain() { if (socket) socket.emit("host:again"); }

/* ============================ PLAYER ============================ */
export function joinRoom() {
  unlockAudio();
  const code = ($("#joinCode").value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  const name = ($("#joinName").value || "").trim().slice(0, 14);
  if (code.length < 4) { toast("أدخل رمز الغرفة (٤ خانات)"); return; }
  if (!name) { toast("اكتب اسمك"); return; }
  startPlayer(code, name);
}

function startPlayer(code, name) {
  NET.active = true; NET.role = "player";
  P = { code, name, letter: "", time: 60, round: 0, ranking: null, joined: false };
  setStatus("joinStatus", "wait", "جارِ الاتصال بالغرفة…");
  connect();
  wirePlayer();
}

function wirePlayer() {
  socket.on("join:ok", ({ name, config }) => {
    P.joined = true;
    if (config) { CFG.cats = config.cats; CFG.rounds = config.rounds; CFG.time = config.time; }
    sJoin();
    const a = av(0);
    $("#pwaitMe").innerHTML = `<span class="av" style="background:${a.bg}">🙂</span>${esc(name)}`;
    $("#pwaitTitle").textContent = "أنت في الغرفة!";
    $("#pwaitSub").textContent = "في انتظار أن يبدأ المضيف…";
    if (!$("#s-play").classList.contains("active") && !$("#s-reveal").classList.contains("active")) go("s-pwait");
  });

  socket.on("join:failed", ({ message }) => setStatus("joinStatus", "err", message || "تعذّر الانضمام"));

  socket.on("phase:late", () => {
    $("#pwaitTitle").textContent = "جولة جارية";
    $("#pwaitSub").textContent = "ستدخل اللعب في الجولة القادمة…";
    go("s-pwait");
  });

  socket.on("round:score:player", ({ pts, total, rank }) => {
    clearLocalTimer();
    $("#pRoundPts").textContent = "+" + toAr(pts);
    $("#pTotal").textContent = toAr(total);
    $("#pRank").textContent = toAr(rank);
    go("s-pscore");
    if (pts > 0) { burst(.5, .5, 55); sBig(); encourage(rank === 1 ? "👑 الأول!" : "🔥 ممتاز!"); }
    else { sTrombone(); encourage("🙈 جولة صعبة!"); }
  });

  socket.on("game:results", ({ ranking }) => {
    P.ranking = ranking;
    renderResults(ranking, false);
    $("#resultBtns").classList.remove("hidden");
    $("#againBtn").classList.add("hidden");
  });

  socket.on("host:gone", () => toast("انقطع اتصال المضيف… بانتظار عودته"));
  socket.on("room:closed", () => { toast("أُغلقت الغرفة"); setStatus("joinStatus", "err", "أُغلقت الغرفة"); });
}

let _submittedScreen = false;
function playerSubmit(auto) {
  if (!$("#s-play").classList.contains("active")) return;
  const vals = collectFields();
  clearLocalTimer();
  if (socket) socket.emit("player:done", { vals });
  if (!auto) { encourage("👏 أحسنت!"); } else toast("انتهى الوقت — أُرسلت إجاباتك");
  go("s-psent");
}

// زر «انتهيت» في شاشة اللعب
export function playerDone() { playerSubmit(false); }

/* ============================ leave / cleanup ============================ */
export function leaveNet(to) {
  clearLocalTimer();
  try { if (socket) { socket.removeAllListeners(); socket.disconnect(); } } catch (e) {}
  socket = null; H = null; P = null;
  NET.active = false; NET.role = null;
  document.body.classList.remove("tv");
  $("#resultBtns").classList.remove("hidden");
  $("#againBtn").classList.remove("hidden");
  try { if (location.search && history.replaceState) history.replaceState(null, "", location.pathname); } catch (e) {}
  go(to || "s-home");
}

export function netShareList() {
  if (NET.role === "host") return H?.ranking || [];
  if (NET.role === "player") return P?.ranking || [];
  return [];
}
