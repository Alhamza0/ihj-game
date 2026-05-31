// ============================ timer (local + network display) ============================
import { $ } from "./dom.js";
import { excitingTick, sBuzz } from "./sound.js";

const C = 2 * Math.PI * 28;   // محيط دائرة المؤقّت
let localInt = null;

// يجهّز عرض المؤقّت (أو يخفيه إن كان بلا مؤقّت)
function setup(secs, ids) {
  const wrap = $("#" + ids.wrap), num = $("#" + ids.num), arc = $("#" + ids.arc);
  if (!wrap) return null;
  if (secs === 0) { wrap.style.display = "none"; return null; }
  wrap.style.display = "";
  num.textContent = secs; num.style.color = "";
  arc.style.strokeDashoffset = "0";
  return { wrap, num, arc };
}

// مؤقّت محلي (وضع اللعب على نفس الجهاز)
export function startLocalTimer(secs, onEnd, ids = { arc: "timerArc", num: "timerNum", wrap: "timerWrap" }) {
  clearLocalTimer();
  const el = setup(secs, ids);
  if (!el) return;
  let left = secs;
  localInt = setInterval(() => {
    left--;
    paint(el, left, secs);
    excitingTick(left);
    if (left <= 0) { clearLocalTimer(); el.num.style.color = ""; el.wrap.classList.remove("urgent"); sBuzz(); onEnd && onEnd(); }
  }, 1000);
}

export function clearLocalTimer() { if (localInt) { clearInterval(localInt); localInt = null; } }

// تهيئة عرض المؤقّت في الوضع الشبكي (الخادم يقود العدّ)
export function initNetTimer(secs, ids) { setup(secs, ids); }

// تحديث عرض المؤقّت من رسالة الخادم
export function setTimerDisplay(left, total, ids = { arc: "timerArc", num: "timerNum", wrap: "timerWrap" }) {
  const wrap = $("#" + ids.wrap); if (!wrap || wrap.style.display === "none") return;
  paint({ wrap, num: $("#" + ids.num), arc: $("#" + ids.arc) }, left, total || 60);
}

function paint(el, left, total) {
  el.num.textContent = left;
  el.arc.style.strokeDashoffset = (C * (1 - left / total)).toFixed(1);
  if (left <= 5 && left > 0) { el.num.style.color = "var(--coral)"; el.wrap.classList.add("urgent"); }
  else { el.num.style.color = ""; el.wrap.classList.remove("urgent"); }
}
