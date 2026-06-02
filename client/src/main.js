// ============================ app bootstrap ============================
import "./style.css";
import { $, go, toast } from "./dom.js";
import { wireSeg, renderCatGrid, syncConfigUI, bumpRounds } from "./config.js";
import { toggleSound, unlockAudio } from "./sound.js";
import { MASCOT, tile, star } from "./art.js";
import * as local from "./local-game.js";
import * as net from "./net.js";

// ---- route inline-handler buttons (kept in HTML) ----
const routes = {
  go,
  hostStart: net.hostStart,
  joinRoom: net.joinRoom,
  hostBeginGame: net.hostBeginGame,
  leaveNet: net.leaveNet,
  setMode: local.setMode,
  addPlayer: local.addPlayer,
  startLocal: local.startLocal,
  beginTurn: local.beginTurn,
  bumpRounds,
  onNextRound: () => net.NET.active ? net.hostNextRound() : local.onNextRound(),
  onPlayAgain: () => net.NET.active ? net.hostPlayAgain() : local.onPlayAgain(),
  onDone: () => (net.NET.active && net.NET.role === "player") ? net.playerDone() : local.endTurn(false),
  shareResult,
};
Object.assign(window, routes);

async function shareResult() {
  const list = net.NET.active ? net.netShareList() : local.localShareList();
  let txt = "🏆 نتائج لعبة إنسان · حيوان · جماد\n\n";
  (list || []).forEach((p, i) => txt += `${["🥇", "🥈", "🥉"][i] || "▫️"} ${p.name}: ${p.score} نقطة\n`);
  txt += "\nالعب أنت أيضاً!";
  try { if (navigator.share) { await navigator.share({ title: "نتيجة اللعبة", text: txt }); return; } } catch (e) {}
  try { await navigator.clipboard.writeText(txt); toast("نُسخت النتيجة! الصقها لمشاركتها"); } catch (e) { toast("النتيجة جاهزة"); }
}

// ---- home mascot scene (mascot + floating letter tiles & stars) ----
(function buildMascotScene() {
  const scene = $("#mascotScene");
  if (!scene) return;
  scene.innerHTML =
    `<span class="deco d-star1">${star("#ffd23f")}</span>` +
    `<span class="deco d-star2">${star("#23d6c6")}</span>` +
    `<span class="deco d-tile1">${tile("أ", "#7b5cff")}</span>` +
    `<span class="deco d-tile2">${tile("ح", "#3aa0ff")}</span>` +
    `<span class="deco d-tile3">${tile("ج", "#ff8a3d")}</span>` +
    `<div class="mascot-hold">${MASCOT}</div>`;
})();

// ---- init ----
wireSeg("timeSeg");
wireSeg("timeSeg2");
local.renderPlayers();
renderCatGrid("catGrid");
renderCatGrid("catGrid2");
syncConfigUI();

// sound toggle (swap custom SVG icon)
$("#soundBtn").onclick = function () {
  const on = toggleSound();
  this.innerHTML = `<svg class="ic"><use href="#${on ? "ic-sound" : "ic-mute"}"/></svg>`;
};
// فتح الصوت عند أول لمسة
window.addEventListener("pointerdown", () => unlockAudio(), { once: true });

// توجيه اللاعب تلقائياً إذا دخل عبر رمز QR (?room=CODE)
(function () {
  const m = new URLSearchParams(location.search).get("room");
  if (m) {
    const code = m.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    $("#joinCode").value = code;
    go("s-join");
    setTimeout(() => $("#joinName").focus(), 400);
  }
})();
