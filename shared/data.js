// ============================ shared game data ============================
// تُستخدم في الواجهة والخادم معاً.

export const LETTERS = ["أ","ب","ت","ج","ح","خ","د","ر","ز","س","ش","ص","ط","ع","ف","ق","ك","ل","م","ن","ه","و","ي"];

export const CATS = [
  { id:"person",  nm:"إنسان",    em:"🧑", def:true },
  { id:"animal",  nm:"حيوان",    em:"🦁", def:true },
  { id:"plant",   nm:"نبات",     em:"🌿", def:true },
  { id:"object",  nm:"جماد",     em:"🪑", def:true },
  { id:"country", nm:"بلاد",     em:"🌍", def:true },
  { id:"food",    nm:"أكلة",     em:"🍽️", def:false },
  { id:"job",     nm:"مهنة",     em:"👷", def:false },
  { id:"object2", nm:"شيء برّاق", em:"💎", def:false }
];

export const AVAB = [
  { bg:"linear-gradient(135deg,#ff9e57,#ff4d97)", em:"🦊" },
  { bg:"linear-gradient(135deg,#3ec8ff,#22d3c5)", em:"🐬" },
  { bg:"linear-gradient(135deg,#ffd166,#ff9e57)", em:"🦁" },
  { bg:"linear-gradient(135deg,#5be08b,#22d3c5)", em:"🐸" },
  { bg:"linear-gradient(135deg,#ff6b6b,#ff4d97)", em:"🦩" },
  { bg:"linear-gradient(135deg,#a98bff,#3ec8ff)", em:"🦄" },
  { bg:"linear-gradient(135deg,#ffb1d8,#ff6b6b)", em:"🐱" },
  { bg:"linear-gradient(135deg,#86f7e0,#3ec8ff)", em:"🐧" }
];

export const av = i => AVAB[i % AVAB.length];
