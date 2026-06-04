// ============================ character art (hand-built SVG) ============================
// تمائم وشخصيات اللعبة — رسومات SVG مرسومة يدوياً (بلا ملفات خارجية).
// كلها currentColor-free وألوانها مدمجة، فتعمل أينما وُضعت.

// ---- التميمة الرئيسية: «حَرفوش» مخلوق لطيف بحالات تعبير ----
const eyesOpen = (up = 0) =>
  `<circle cx="78" cy="112" r="20" fill="#fff"/><circle cx="122" cy="112" r="20" fill="#fff"/>` +
  `<circle cx="83" cy="${115 - up}" r="10" fill="#2b2358"/><circle cx="117" cy="${115 - up}" r="10" fill="#2b2358"/>` +
  `<circle cx="87" cy="${111 - up}" r="3.2" fill="#fff"/><circle cx="121" cy="${111 - up}" r="3.2" fill="#fff"/>`;
const eyesClosed =
  `<path d="M68 114 q10 9 20 0" stroke="#2b2358" stroke-width="5" stroke-linecap="round" fill="none"/>` +
  `<path d="M112 114 q10 9 20 0" stroke="#2b2358" stroke-width="5" stroke-linecap="round" fill="none"/>`;
const spark = (x, y, s, c = "#ffd23f") =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10l2.6 6.3 6.7.7-5 4.6 1.4 6.6-5.7-3.5-5.7 3.5 1.4-6.6-5-4.6 6.7-.7z" fill="${c}"/>`;

const MOODS = {
  happy: { face: eyesOpen() + `<path d="M84 148 q16 16 32 0" stroke="#2b2358" stroke-width="6" stroke-linecap="round" fill="none"/>` },
  celebrate: {
    face: eyesOpen() + `<path d="M86 146 q14 24 28 0z" fill="#2b2358"/><path d="M93 154 q7 7 14 0z" fill="#ff5b6e"/>`,
    extra: spark(32, 48, 1.2) + spark(170, 56, 1.4, "#23d6c6") + spark(154, 18, 1, "#ff4d97") + spark(24, 110, .9, "#3aa0ff"),
  },
  think: {
    face: eyesOpen(4) + `<circle cx="100" cy="150" r="4" fill="#2b2358"/>`,
    extra: `<circle cx="150" cy="70" r="5" fill="#fff" stroke="#e3def9" stroke-width="2"/>` +
      `<circle cx="163" cy="55" r="8" fill="#fff" stroke="#e3def9" stroke-width="2"/>` +
      `<circle cx="180" cy="34" r="16" fill="#fff" stroke="#e3def9" stroke-width="2"/>` +
      `<text x="180" y="40" text-anchor="middle" font-family="Cairo,sans-serif" font-weight="800" font-size="18" fill="#7b5cff">؟</text>`,
  },
  sleep: {
    face: eyesClosed + `<path d="M90 150 h20" stroke="#2b2358" stroke-width="5" stroke-linecap="round"/>`,
    extra: `<g fill="#a98bff" font-family="Baloo Bhaijaan 2,sans-serif" font-weight="800">` +
      `<text x="148" y="72" font-size="18">z</text><text x="164" y="56" font-size="24">z</text><text x="184" y="38" font-size="30">z</text></g>`,
  },
};

export function mascotSVG(mood = "happy") {
  const m = MOODS[mood] || MOODS.happy;
  return `
<svg class="mascot-svg" viewBox="0 0 200 212" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="mBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8a5cff"/><stop offset=".55" stop-color="#ff4d97"/><stop offset="1" stop-color="#ff7a59"/>
    </linearGradient>
  </defs>
  <ellipse cx="100" cy="198" rx="58" ry="11" fill="#2b2358" opacity=".12"/>
  <path d="M42 120 C18 112 12 86 22 70" stroke="url(#mBody)" stroke-width="16" stroke-linecap="round" fill="none"/>
  <path d="M158 122 C180 118 186 102 184 88" stroke="url(#mBody)" stroke-width="16" stroke-linecap="round" fill="none"/>
  <ellipse cx="80" cy="192" rx="16" ry="11" fill="#7b5cff"/>
  <ellipse cx="120" cy="192" rx="16" ry="11" fill="#7b5cff"/>
  <path d="M100 60 C97 42 103 32 116 26" stroke="#7b5cff" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M118 16 l3.2 7.6 7.6 3.2 -7.6 3.2 -3.2 7.6 -3.2 -7.6 -7.6 -3.2 7.6 -3.2z" fill="#ffd23f"/>
  <rect x="34" y="58" width="132" height="134" rx="58" fill="url(#mBody)"/>
  <circle cx="64" cy="134" r="11" fill="#ff4d8f" opacity=".5"/>
  <circle cx="136" cy="134" r="11" fill="#ff4d8f" opacity=".5"/>
  ${m.face}
  ${m.extra || ""}
</svg>`;
}

// توافق: التميمة الافتراضية السعيدة
export const MASCOT = mascotSVG("happy");

// ---- دوال زخرفية صغيرة ----
export const star = (c = "#ffd23f") =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 6.3L21 9l-5 4.3L17.6 21 12 17.3 6.4 21 8 13.3 3 9l6.4-.7z" fill="${c}"/></svg>`;

export const tile = (ch, bg = "#7b5cff") =>
  `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="13" fill="${bg}"/><rect x="4" y="4" width="40" height="40" rx="13" fill="#fff" opacity=".14"/><text x="24" y="34" text-anchor="middle" font-family="Baloo Bhaijaan 2, sans-serif" font-weight="800" font-size="26" fill="#fff">${ch}</text></svg>`;

// ---- شخصيات الفئات (وجوه لطيفة) ----
const face = (cx, cy, eyeDx = 5, eyeR = 1.9, smile = true) =>
  `<circle cx="${cx - eyeDx}" cy="${cy}" r="${eyeR}" fill="#2b2358"/>` +
  `<circle cx="${cx + eyeDx}" cy="${cy}" r="${eyeR}" fill="#2b2358"/>` +
  (smile ? `<path d="M${cx - 4} ${cy + 4} q4 4 8 0" stroke="#2b2358" stroke-width="1.7" stroke-linecap="round" fill="none"/>` : "");

const CREATURES = {
  // إنسان
  person: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M14 58a18 18 0 0136 0z" fill="#7b5cff"/>
    <circle cx="32" cy="26" r="15" fill="#ffcf9e"/>
    <path d="M17 24a15 15 0 0130 0c0-9-7-13-15-13s-15 4-15 13z" fill="#3a2c5e"/>
    <circle cx="65" cy="0" r="0"/>${face(32, 27, 5.5, 2.1)}
    <circle cx="22" cy="30" r="2.6" fill="#ff8aa6" opacity=".55"/><circle cx="42" cy="30" r="2.6" fill="#ff8aa6" opacity=".55"/>
  </svg>`,
  // حيوان (قطّة)
  animal: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M16 18l4-10 9 7zM48 18l-4-10-9 7z" fill="#ff9a3d"/>
    <circle cx="32" cy="34" r="20" fill="#ffb55c"/>
    <path d="M19 12l3 7M45 12l-3 7" stroke="#ff7a18" stroke-width="0"/>
    ${face(32, 32, 7, 2.3)}
    <path d="M30 38h4l-2 2z" fill="#ff5b6e"/>
    <path d="M14 33h-8M14 37h-8M50 33h8M50 37h8" stroke="#ffe1bd" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="22" cy="38" r="3" fill="#ff8aa6" opacity=".5"/><circle cx="42" cy="38" r="3" fill="#ff8aa6" opacity=".5"/>
  </svg>`,
  // نبات (برعم في أصيص)
  plant: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M22 40h20l-3 18H25z" fill="#ff8a3d"/><rect x="20" y="36" width="24" height="7" rx="3" fill="#ff7a18"/>
    <path d="M32 36c0-8-6-12-12-12 0 8 5 12 12 12z" fill="#3ddc84"/>
    <path d="M32 36c0-10 6-15 13-15 0 9-6 15-13 15z" fill="#1fc8a9"/>
    ${face(33, 30, 4.5, 1.7)}
  </svg>`,
  // بلاد (كرة أرضية)
  country: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="22" fill="#3aa0ff"/>
    <path d="M14 28c6 2 9-3 14-1s8 7 13 4M16 40c5-1 7 3 12 2s9-5 14-2" stroke="#23d6c6" stroke-width="0"/>
    <path d="M20 24c5 1 6 6 12 5s8-6 13-3l-2 8c-6-2-8 4-14 3s-7-7-13-5z" fill="#3ddc84"/>
    <path d="M22 44c5 0 6 4 11 3" stroke="#3ddc84" stroke-width="4" stroke-linecap="round" fill="none"/>
    ${face(32, 31, 6, 2.1)}
  </svg>`,
  // جماد (نجمة بوجه)
  object: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 6l7 16 17 1-13 11 4 17-15-9-15 9 4-17-13-11 17-1z" fill="#ffcf3a"/>
    ${face(32, 32, 5.5, 2.1)}
    <circle cx="24" cy="35" r="2.6" fill="#ff8aa6" opacity=".5"/><circle cx="40" cy="35" r="2.6" fill="#ff8aa6" opacity=".5"/>
  </svg>`,
  // أكلة (تفاحة)
  food: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 20c-7-6-22-3-22 14 0 14 10 22 22 22s22-8 22-22c0-17-15-20-22-14z" fill="#ff5b6e"/>
    <path d="M32 20c0-6 4-10 10-11-1 7-4 10-10 11z" fill="#3ddc84"/>
    ${face(32, 36, 6, 2.1)}
    <circle cx="23" cy="39" r="3" fill="#ffd2d8" opacity=".6"/><circle cx="41" cy="39" r="3" fill="#ffd2d8" opacity=".6"/>
  </svg>`,
  // مهنة (خوذة عمل)
  job: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="36" r="15" fill="#ffcf9e"/>
    ${face(32, 38, 5.5, 2)}
    <path d="M14 32a18 18 0 0136 0z" fill="#ffb020"/><rect x="12" y="30" width="40" height="6" rx="3" fill="#ff9a3d"/>
    <rect x="29" y="16" width="6" height="10" rx="2" fill="#ff9a3d"/>
  </svg>`,
  // شيء برّاق (جوهرة)
  object2: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M20 14h24l10 14-22 24L10 28z" fill="#23d6c6"/>
    <path d="M20 14h24l10 14H10z" fill="#3aa0ff" opacity=".55"/>
    <path d="M32 52L10 28h44z" fill="#1fc8a9" opacity=".5"/>
    ${face(32, 30, 5, 1.9)}
  </svg>`,
};

export const catCreature = id => CREATURES[id] || star("#ff4d97");
