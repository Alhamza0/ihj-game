// ============================ app bootstrap ============================
import "./style.css";
import { $, go, toast } from "./dom.js";
import { wireSeg, renderCatGrid, syncConfigUI, bumpRounds } from "./config.js";
import { toggleSound, unlockAudio } from "./sound.js";
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

// ---- init ----
wireSeg("timeSeg");
wireSeg("timeSeg2");
local.renderPlayers();
renderCatGrid("catGrid");
renderCatGrid("catGrid2");
syncConfigUI();

// sound toggle
$("#soundBtn").onclick = function () { this.textContent = toggleSound() ? "🔊" : "🔇"; };
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
