// ============================ motion (GSAP helpers) ============================
// حركات منسّقة عبر GSAP — تحترم «تقليل الحركة» (تتجاوز الحركة وتُبقي الحالة النهائية).
import { gsap } from "gsap";

const reduce = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ظهور رقم العدّ التنازلي بنبضة
export function popCount(el) {
  if (!el || reduce()) return;
  gsap.fromTo(el, { scale: .35, opacity: 0 }, { scale: 1, opacity: 1, duration: .34, ease: "back.out(2.4)" });
}

// كشف الحرف: ظهور مرن + دوران خفيف، ثم العنوان الفرعي
export function revealLetter(disc, sub) {
  if (reduce()) return;
  const tl = gsap.timeline();
  tl.fromTo(disc, { scale: .2, rotate: -28, opacity: 0 },
    { scale: 1, rotate: 0, opacity: 1, duration: .8, ease: "elastic.out(1,.55)" });
  if (sub) tl.fromTo(sub, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: "power2.out" }, "-=.25");
}

// دخول متدرّج لعناصر (صفوف النتائج مثلاً)
export function staggerIn(els, opts = {}) {
  if (!els || !els.length || reduce()) return;
  gsap.from(els, { y: 20, opacity: 0, duration: .5, stagger: .08, ease: "power3.out", ...opts });
}

// نبضة ظهور لعنصر مفرد (اسم الفائز/التميمة)
export function pop(el, opts = {}) {
  if (!el || reduce()) return;
  gsap.fromTo(el, { scale: .5, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: "back.out(2)", ...opts });
}

// تأثير ضغط مرن (squash + ارتداد) على كل عناصر اللمس — يُربط مرّة واحدة
const PRESS_SEL = ".btn,.tile,.mode,.cat,.jbtn,.icon-btn,.seg button,.stepper button,.player-row .rm,.lrow.rank";
export function pressBind() {
  if (reduce()) return;
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest(PRESS_SEL);
    if (!b || b.disabled) return;
    gsap.to(b, { scale: .92, duration: .09, ease: "power2.out", overwrite: "auto" });
    const up = () => {
      gsap.to(b, {
        scale: 1, duration: .5, ease: "elastic.out(1,.4)", overwrite: "auto",
        onComplete: () => gsap.set(b, { clearProps: "transform" }),   // يعيد تأثيرات CSS (hover)
      });
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }, { passive: true });
}
