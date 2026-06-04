// ============================ round reveal animation ============================
import { $, toAr, go } from "./dom.js";
import { sCount, sReveal } from "./sound.js";
import { flash, burst } from "./fx.js";
import { popCount, revealLetter } from "./motion.js";

// أنيميشن العدّ التنازلي ٣·٢·١ ثم ظهور الحرف، ثم استدعاء after()
export function doReveal(roundIdx, rounds, letter, after) {
  $("#revealRound").textContent = "الجولة " + toAr(roundIdx + 1) + " من " + toAr(rounds);
  go("s-reveal");
  const stage = $("#revealStage");
  stage.innerHTML = "";
  let n = 3;
  const showCount = () => {
    stage.innerHTML = `<div class="count">${toAr(n)}</div>`;
    popCount(stage.firstChild);
    sCount(n); n--;
    if (n >= 1) setTimeout(showCount, 750);
    else setTimeout(showLetter, 750);
  };
  const showLetter = () => {
    stage.innerHTML = `<div class="letter-disc"><div class="L">${letter}</div></div>` +
      `<div class="reveal-sub" style="margin-top:18px">الحرف المختار</div>`;
    revealLetter(stage.querySelector(".letter-disc"), stage.querySelector(".reveal-sub"));
    sReveal(); flash(); burst(.5, .55, 50);
    setTimeout(after, 1800);
  };
  showCount();
}
