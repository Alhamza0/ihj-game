// ============================ app bootstrap ============================
import "./style.css";
import { $, go, toast, esc } from "./dom.js";
import { wireSeg, renderCatGrid, syncConfigUI, bumpRounds } from "./config.js";
import { toggleSound, unlockAudio } from "./sound.js";
import { MASCOT, tile, star } from "./art.js";
import * as local from "./local-game.js";
import * as net from "./net.js";
import { authEnabled, onAuthChange, currentUser, signInWithGoogle } from "./auth.js";
import { openLeaderboard, lbSetPeriod } from "./leaderboard.js";
import { openProfile, doSignOut } from "./profile.js";

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
  installApp,
  applyUpdate,
  openLeaderboard,
  lbSetPeriod,
  openProfile,
  doSignOut,
  authAction,
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

// ---- رقم الإصدار (يُحقَن من package.json عبر Vite) + حقوق النشر ----
const APP_VERSION = (typeof __APP_VERSION__ !== "undefined") ? __APP_VERSION__ : "";
const OWNER = "حمزة إحسان علي";   // مصمم ومطوّر اللعبة وصاحب الحقوق
if ($("#appCredit")) $("#appCredit").textContent = `تصميم وتطوير اللعبة — ${OWNER}`;
if ($("#appCopy")) $("#appCopy").textContent = "© 2026 · جميع الحقوق محفوظة";
if ($("#appVer")) $("#appVer").textContent = "إصدار " + APP_VERSION;

// ---- PWA: تسجيل الـ service worker + كشف التحديثات ----
let _swReg = null, _reloading = false;
function showUpdate() {
  const bar = $("#updateBar");
  if (!bar) return;
  // اجلب ملخّص التحديث من نسخة الخادم الجديدة (مع تجاوز الكاش)
  fetch("/version.json?ts=" + Date.now(), { cache: "no-store" })
    .then(r => (r.ok ? r.json() : null))
    .then(info => {
      const ul = $("#updateNotes");
      if (ul) {
        ul.innerHTML = "";
        ((info && Array.isArray(info.notes)) ? info.notes : []).slice(0, 4)
          .forEach(n => { const li = document.createElement("li"); li.textContent = n; ul.appendChild(li); });
      }
      const t = $("#updateTitle");
      if (t && info && info.version) t.textContent = `🎉 نسخة جديدة (${info.version})`;
    })
    .catch(() => {})
    .finally(() => bar.classList.remove("hidden"));
}
function applyUpdate() {
  const w = _swReg && _swReg.waiting;
  $("#updateBar")?.classList.add("hidden");
  if (w) w.postMessage({ type: "SKIP_WAITING" });   // ثم يعيد controllerchange تحميل الصفحة
  else location.reload();
}
function watchUpdates(reg) {
  _swReg = reg;
  // نسخة جديدة "تنتظر" مسبقاً (من زيارة سابقة)
  if (reg.waiting && navigator.serviceWorker.controller) showUpdate();
  // نسخة جديدة وصلت أثناء الجلسة الحالية
  reg.addEventListener("updatefound", () => {
    const nw = reg.installing;
    if (!nw) return;
    nw.addEventListener("statechange", () => {
      if (nw.state === "installed" && navigator.serviceWorker.controller) showUpdate();
    });
  });
  // افحص وجود تحديث دورياً وعند العودة إلى التبويب
  setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reg.update().catch(() => {});
  });
}
if ("serviceWorker" in navigator) {
  const ok = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  if (ok) window.addEventListener("load", () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (_reloading) return; _reloading = true; location.reload();
    });
    navigator.serviceWorker.register("/sw.js").then(watchUpdates).catch(() => {});
  });
}

// ---- PWA: زر «ثبّت التطبيق» ----
let _deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredPrompt = e;
  $("#installBtn")?.classList.remove("hidden");
});
window.addEventListener("appinstalled", () => {
  _deferredPrompt = null;
  $("#installBtn")?.classList.add("hidden");
});
async function installApp() {
  if (!_deferredPrompt) { toast("افتح قائمة المتصفح ثم «إضافة إلى الشاشة الرئيسية»"); return; }
  _deferredPrompt.prompt();
  try { await _deferredPrompt.userChoice; } catch (e) {}
  _deferredPrompt = null;
  $("#installBtn")?.classList.add("hidden");
}

// ---- الحسابات (Supabase) — تُخفى الأزرار إن لم تُهيّأ البيئة ----
function authAction() {
  const u = currentUser();
  if (u) openProfile(u.uid, u.name);
  else signInWithGoogle();
}
if (authEnabled) {
  $("#lbTile")?.classList.remove("hidden");
  const btn = $("#authBtn");
  onAuthChange(u => {
    if (btn) {
      btn.classList.remove("hidden");
      btn.innerHTML = u
        ? (u.avatar ? `<img class="btnav" src="${u.avatar}" referrerpolicy="no-referrer" alt="">` : "👤") + ` ${esc(u.name.split(" ")[0])}`
        : `<svg class="ic"><use href="#ic-users"/></svg> دخول`;
    }
    // املأ اسم الانضمام تلقائياً من الحساب (إن كان الحقل فارغاً)
    const nameInput = $("#joinName");
    if (u && nameInput && !nameInput.value) nameInput.value = u.name.slice(0, 14);
  });
}

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
