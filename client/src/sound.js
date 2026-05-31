// ============================ sound (synth, no assets) ============================
let soundOn = true;
let AC = null;

export function isSoundOn() { return soundOn; }
export function toggleSound() {
  soundOn = !soundOn;
  if (soundOn) tone(660, 0, .08);
  return soundOn;
}
// فتح سياق الصوت عند أول تفاعل من المستخدم
export function unlockAudio() { ac(); }

function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === "suspended") AC.resume();
  return AC;
}

export function tone(f, t0, dur, type = "sine", vol = .14, glideTo) {
  if (!soundOn) return;
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, a.currentTime + t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, a.currentTime + t0 + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + .02);
}

function noise(t0, dur, vol = .25) {
  if (!soundOn) return;
  const a = ac(); if (!a) return;
  const n = a.sampleRate * dur, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(); src.buffer = buf;
  const g = a.createGain(); const f = a.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = 1600;
  g.gain.setValueAtTime(vol, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + dur);
  src.connect(f); f.connect(g); g.connect(a.destination); src.start(a.currentTime + t0);
}

function kick(t0 = 0, vol = .34) {
  if (!soundOn) return; const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(); o.type = "sine";
  o.frequency.setValueAtTime(170, a.currentTime + t0);
  o.frequency.exponentialRampToValueAtTime(48, a.currentTime + t0 + .13);
  g.gain.setValueAtTime(vol, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + .2);
  o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + .22);
}

function hat(t0 = 0, vol = .12, dur = .04) {
  if (!soundOn) return; const a = ac(); if (!a) return;
  const n = a.sampleRate * dur, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
  const s = a.createBufferSource(); s.buffer = b;
  const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
  const g = a.createGain(); g.gain.setValueAtTime(vol, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + dur);
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(a.currentTime + t0);
}

function applause(t0 = 0, dur = 1.4, vol = .2) {
  if (!soundOn) return; const a = ac(); if (!a) return;
  const n = a.sampleRate * dur, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / (a.sampleRate * .15)) * (1 - i / n);
    d[i] = (Math.random() * 2 - 1) * env * (0.6 + 0.4 * Math.abs(Math.sin(i / 180)));
  }
  const s = a.createBufferSource(); s.buffer = b;
  const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = .6;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(a.currentTime + t0);
}

const sparkle = (t0 = 0) => { [1318, 1568, 2093].forEach((f, k) => tone(f, t0 + k * .05, .18, "triangle", .09)); };

export const sCount   = i => { kick(0, .36); tone(360 + (3 - i) * 150, 0, .18, "triangle", .13); hat(0, .1); };
export const sReveal  = () => {
  tone(180, 0, .5, "sawtooth", .16, 1500); for (let k = 0; k < 6; k++) hat(.06 * k, .05);
  kick(.48, .4); noise(.46, .5, .34);
  [523, 659, 784, 1046].forEach((f, k) => tone(f, .5 + k * .02, 1, "triangle", .13)); sparkle(.55);
};
export const sDone    = () => { [523, 659, 784, 1046].forEach((f, k) => tone(f, k * .06, .2, "triangle", .13)); sparkle(.18); };
export const sCheer   = () => { applause(0, 1.1, .16); [784, 988].forEach((f, k) => tone(f, k * .08, .3, "triangle", .1)); };
export const sJoin    = () => { tone(660, 0, .1, "sine", .12); tone(880, .08, .14, "sine", .12); kick(0, .18); };
export const sBig     = () => { kick(0, .42); tone(880, 0, .25, "triangle", .16); sparkle(.05); };
export const sFanfare = () => {
  const seq = [[523, 0], [659, .12], [784, .24], [1046, .36], [784, .5], [1046, .62]];
  seq.forEach(([f, t]) => tone(f, t, .5, "triangle", .16));
  kick(0, .4); kick(.36, .4); noise(.36, .45, .3); applause(.2, 1.6, .2);
};
export const sBuzz     = () => { tone(150, 0, .45, "sawtooth", .18); noise(0, .3, .2); kick(0, .3); };
export const sTrombone = () => { [[392, 0], [349, .18], [311, .36], [233, .54]].forEach(([f, t]) => tone(f, t, .5, "sawtooth", .12)); };

// نبضات تصاعدية مع اقتراب الوقت من النهاية
export function excitingTick(left) {
  if (left > 10 || left <= 0) return;
  if (left > 5) { kick(0, .16); hat(0, .06); }
  else {
    const p = 520 + (5 - left) * 120; kick(0, .3); kick(.16, .22); tone(p, 0, .08, "square", .1);
    if (left <= 3) { tone(p * 1.6, .02, .07, "triangle", .07); hat(0, .12); }
  }
}
