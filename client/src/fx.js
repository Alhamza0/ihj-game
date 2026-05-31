// ============================ visual effects ============================
import { $, toAr, esc } from "./dom.js";

// ---- confetti ----
const cv = $("#cft"), ctx = cv.getContext("2d");
let parts = [];
function rz() { cv.width = innerWidth; cv.height = innerHeight; }
rz(); addEventListener("resize", rz);
const COLORS = ["#ff6b6b", "#ff4d97", "#ff9e57", "#ffd166", "#22d3c5", "#3ec8ff", "#5be08b"];

export function burst(xr, yr, n) {
  for (let i = 0; i < n; i++)
    parts.push({
      x: cv.width * xr, y: cv.height * yr,
      vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 4,
      g: .4 + Math.random() * .2, r: 5 + Math.random() * 6,
      c: COLORS[i % COLORS.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 0,
    });
  if (!parts._raf) { parts._raf = true; requestAnimationFrame(tick); }
}
function tick() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter(p => p.y < cv.height + 40 && p.life < 200);
  parts.forEach(p => {
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.rot += p.vr; p.life++;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - p.life / 200);
    ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6); ctx.restore();
  });
  if (parts.length) requestAnimationFrame(tick); else parts._raf = false;
}

// ---- screen flash + shake ----
export function flash() {
  const f = $("#flash");
  f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
  const app = document.querySelector(".app");
  app.classList.remove("shake"); void app.offsetWidth; app.classList.add("shake");
  setTimeout(() => app.classList.remove("shake"), 560);
}

// ---- encouragement banner ----
const ENC = ["🔥 رائع!", "👏 أحسنت!", "💪 استمر!", "⭐ ممتاز!", "🚀 يلّا!", "🌟 بطل!", "😎 جامد!", "✨ مبدع!"];
export function encourage(txt) {
  const e = $("#encourage");
  e.textContent = txt || ENC[Math.floor(Math.random() * ENC.length)];
  e.classList.remove("show"); void e.offsetWidth; e.classList.add("show");
}

// ---- count-up animation ----
export function countUp(el, to, dur = 900) {
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = toAr(Math.round(to * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function crownHTML(name, pts) {
  return `<div class="crown"><span class="em">👑</span><span>بطل الجولة: ${esc(name)} · ${toAr(pts)} نقطة</span></div>`;
}
