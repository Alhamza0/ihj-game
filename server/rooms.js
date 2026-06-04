// ============================ authoritative room manager ============================
// الخادم هو المصدر الموثوق: يختار الحرف، يدير المؤقّت، يجمع الإجابات، ويحسب النقاط.
import { LETTERS, scoreRound } from "@ihj/shared";
import { verifyToken, recordMatch } from "./supabase.js";
import { judgeRound, judgeEnabled } from "./judge.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REVEAL_MS = 4200;   // مدة أنيميشن العدّ التنازلي + ظهور الحرف على العملاء
const COLLECT_GRACE_MS = 900;
const HOST_GRACE_MS = 60000;   // مهلة بقاء الغرفة إذا انقطع المضيف

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();          // code -> Room
    this.socketIndex = new Map();    // socketId -> { code, role, clientId }
  }

  genCode() {
    let c;
    do {
      c = "";
      for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    } while (this.rooms.has(c));
    return c;
  }

  // ---------- host ----------
  createRoom(socket, config) {
    const code = this.genCode();
    const room = {
      code,
      hostSocketId: socket.id,
      hostTimeout: null,
      config: normalizeConfig(config),
      players: new Map(),   // clientId -> player
      phase: "lobby",
      round: 0,
      letter: "",
      roundTotals: {},
      scoreInvalid: {},
      autoJudge: {},
      playStartedAt: null,
      timer: null,
    };
    this.rooms.set(code, room);
    this.socketIndex.set(socket.id, { code, role: "host" });
    socket.join(code);
    socket.emit("host:created", { code, config: room.config });
    return room;
  }

  rebindHost(socket, code) {
    const room = this.rooms.get(code);
    if (!room) { socket.emit("error:msg", { message: "الغرفة غير موجودة" }); return; }
    if (room.hostTimeout) { clearTimeout(room.hostTimeout); room.hostTimeout = null; }
    room.hostSocketId = socket.id;
    this.socketIndex.set(socket.id, { code, role: "host" });
    socket.join(code);
    socket.emit("host:created", { code, config: room.config });
    this.broadcastLobby(room);
  }

  // ---------- player ----------
  async joinRoom(socket, { code, name, clientId, token }) {
    code = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const room = this.rooms.get(code);
    if (!room) { socket.emit("join:failed", { message: "لا توجد غرفة بهذا الرمز" }); return; }

    // هوية اختيارية عبر Supabase (يبقى ضيفاً إن لم يسجّل الدخول)
    const auth = token ? await verifyToken(token) : null;
    if (!this.rooms.has(code)) return;   // قد تُغلق الغرفة أثناء التحقّق

    let player = clientId && room.players.get(clientId);
    if (player) {
      // إعادة اتصال لاعب موجود
      player.socketId = socket.id;
      player.connected = true;
      if (name) player.name = name.slice(0, 14);
      if (auth) player.auth = auth;
    } else {
      clientId = clientId || socket.id;
      player = {
        clientId, socketId: socket.id,
        name: (name || auth?.name || "لاعب").slice(0, 14),
        idx: room.players.size,
        score: 0, answers: null, ready: false, doneAt: null, connected: true,
        auth: auth || null,
      };
      room.players.set(clientId, player);
    }
    this.socketIndex.set(socket.id, { code, role: "player", clientId });
    socket.join(code);

    socket.emit("join:ok", { clientId, name: player.name, idx: player.idx, config: room.config });
    this.broadcastLobby(room);

    // إذا انضم أثناء اللعب/التقييم/النتائج: ينتظر الجولة القادمة.
    // الانضمام أثناء reveal مسموح ليشارك في نفس الجولة.
    if (room.phase === "play" || room.phase === "score" || room.phase === "results") {
      socket.emit("phase:late");
    }
  }

  // ---------- lobby ----------
  broadcastLobby(room) {
    const players = this.activePlayers(room).map(p => ({ name: p.name, idx: p.idx, connected: p.connected }));
    this.io.to(room.code).emit("room:lobby", { players, config: room.config });
  }

  activePlayers(room) {
    return [...room.players.values()].filter(p => p.connected);
  }

  setConfig(socket, config) {
    const room = this.roomOfHost(socket);
    if (!room) return;
    room.config = normalizeConfig(config);
    this.broadcastLobby(room);
  }

  // ---------- game flow ----------
  startGame(socket) {
    const room = this.roomOfHost(socket);
    if (!room) return;
    if (this.activePlayers(room).length < 1) { socket.emit("error:msg", { message: "يلزم لاعب واحد على الأقل" }); return; }
    if (room.config.cats.length < 2) { socket.emit("error:msg", { message: "اختر فئتين على الأقل" }); return; }
    room.players.forEach(p => { p.score = 0; });
    room.round = 0;
    this.startRound(room);
  }

  startRound(room) {
    room.letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    room.phase = "reveal";
    room.playStartedAt = null;
    room.scoreInvalid = {};
    room.autoJudge = {};
    room.players.forEach(p => { p.answers = null; p.ready = false; p.doneAt = null; });

    this.io.to(room.code).emit("round:reveal", {
      round: room.round, rounds: room.config.rounds,
      letter: room.letter, cats: room.config.cats, time: room.config.time,
    });

    setTimeout(() => {
      if (!this.rooms.has(room.code)) return;
      room.phase = "play";
      room.playStartedAt = Date.now();
      this.io.to(room.code).emit("round:play", { letter: room.letter, time: room.config.time });
      this.startTimer(room);
    }, REVEAL_MS);
  }

  startTimer(room) {
    this.clearTimer(room);
    if (room.config.time === 0) return; // بدون مؤقّت
    let left = room.config.time;
    room.timer = setInterval(() => {
      left--;
      this.io.to(room.code).emit("timer", { left });
      if (left <= 0) { this.clearTimer(room); this.collect(room); }
    }, 1000);
  }

  clearTimer(room) { if (room.timer) { clearInterval(room.timer); room.timer = null; } }

  savePlayerAnswers(socket, vals, done) {
    const ref = this.socketIndex.get(socket.id);
    if (!ref || ref.role !== "player") return;
    const room = this.rooms.get(ref.code);
    if (!room || room.phase !== "play") return;
    const player = room.players.get(ref.clientId);
    if (!player) return;
    player.answers = vals || player.answers || {};
    if (done) {
      if (!player.doneAt) player.doneAt = Date.now();
      player.ready = true;
      this.io.to(room.code).emit("submit:status", this.submitStatus(room));
      this.checkAllDone(room);
    }
  }

  submitStatus(room) {
    return this.activePlayers(room).map(p => ({ idx: p.idx, name: p.name, ready: p.ready }));
  }

  checkAllDone(room) {
    const active = this.activePlayers(room);
    if (room.phase === "play" && active.length && active.every(p => p.ready)) {
      this.clearTimer(room);
      setTimeout(() => this.collect(room), 400);
    }
  }

  collect(room) {
    if (room.phase !== "play") return;
    room.phase = "score";
    this.clearTimer(room);
    this.io.to(room.code).emit("round:collect");
    setTimeout(async () => {
      if (!this.rooms.has(room.code) || room.phase !== "score") return;
      await this.autoJudgeRoom(room);                  // تحكيم آلي (إن مُفعّل) قبل أول نتيجة
      if (!this.rooms.has(room.code) || room.phase !== "score") return;
      this.computeAndSendScore(room, true);
    }, COLLECT_GRACE_MS);
  }

  // تحكيم آلي للجولة: يضع علامة أولية على الإجابات المرفوضة (المضيف يستطيع عكسها)
  async autoJudgeRoom(room) {
    if (!judgeEnabled) return;
    const active = this.activePlayers(room);
    const entries = active.map(p => ({ key: p.clientId, vals: p.answers || {} }));
    this.io.to(room.code).emit("round:judging");
    let verdicts = {};
    try { verdicts = await judgeRound(room.letter, room.config.cats, entries); } catch (e) { verdicts = {}; }
    if (!this.rooms.has(room.code) || room.phase !== "score") return;
    room.autoJudge = verdicts || {};
    // املأ scoreInvalid للمرفوض آلياً (مرّة واحدة؛ المضيف يعكس بزر التجاوز)
    Object.keys(room.autoJudge).forEach(key => {
      Object.keys(room.autoJudge[key]).forEach(cat => {
        if (room.autoJudge[key][cat].valid === false) {
          (room.scoreInvalid[key] || (room.scoreInvalid[key] = {}))[cat] = true;
        }
      });
    });
  }

  invalidate(socket, { key, cat }) {
    const room = this.roomOfHost(socket);
    if (!room || room.phase !== "score") return;
    room.scoreInvalid[key] = room.scoreInvalid[key] || {};
    room.scoreInvalid[key][cat] = !room.scoreInvalid[key][cat];
    this.computeAndSendScore(room, false);
  }

  computeAndSendScore(room, firstRender) {
    const active = this.activePlayers(room);
    const entries = active.map(p => ({
      key: p.clientId, name: p.name,
      vals: applyInvalid(p.answers || {}, room.scoreInvalid[p.clientId]),
    }));
    const speedSecByKey = {};
    if (room.playStartedAt && room.config.time > 0) {
      active.forEach(p => {
        if (p.doneAt) speedSecByKey[p.clientId] = Math.max(0, (p.doneAt - room.playStartedAt) / 1000);
      });
    }
    const res = scoreRound(entries, room.config.cats, room.letter, {
      speedSecByKey,
      roundTime: room.config.time,
    });
    room.roundTotals = res.totals;

    // ترتيب مؤقّت بناءً على المجموع + نقاط الجولة
    const ranked = active
      .map(p => ({ p, total: p.score + (res.totals[p.clientId] || 0) }))
      .sort((a, b) => b.total - a.total);

    // المضيف يستلم التفصيل الكامل
    this.io.to(room.hostSocketId).emit("round:score:host", {
      round: room.round, letter: room.letter, cats: room.config.cats,
      breakdown: res.breakdown, totals: res.totals, speedBonus: res.speedBonus,
      invalid: room.scoreInvalid, autoJudge: room.autoJudge, firstRender,
      players: active.map(p => ({ key: p.clientId, name: p.name, idx: p.idx, rawVals: p.answers || {} })),
    });

    // كل لاعب يستلم نتيجته فقط
    active.forEach(p => {
      const rank = ranked.findIndex(x => x.p.clientId === p.clientId) + 1;
      const total = p.score + (res.totals[p.clientId] || 0);
      this.io.to(p.socketId).emit("round:score:player", {
        pts: res.totals[p.clientId] || 0,
        speed: res.speedBonus[p.clientId] || 0,
        total,
        rank,
      });
    });
  }

  nextRound(socket) {
    const room = this.roomOfHost(socket);
    if (!room) return;
    this.activePlayers(room).forEach(p => { p.score += (room.roundTotals[p.clientId] || 0); });
    room.round++;
    if (room.round >= room.config.rounds) this.showResults(room);
    else this.startRound(room);
  }

  showResults(room) {
    room.phase = "results";
    const ranked = this.activePlayers(room).slice().sort((a, b) => b.score - a.score);
    const ranking = ranked.map(p => ({ name: p.name, score: p.score, idx: p.idx }));
    this.io.to(room.code).emit("game:results", { ranking, winner: ranking[0]?.name });

    // حفظ النتائج في Supabase (اختياري + غير حاجب؛ لا يؤثّر على المباراة عند الفشل)
    const top = ranked[0]?.score || 0;
    recordMatch(
      { code: room.code, rounds: room.config.rounds },
      ranked.map((p, i) => ({
        auth: p.auth || null,
        name: p.name,
        score: p.score,
        placement: i + 1,
        isWinner: top > 0 && p.score === top,
      }))
    );
  }

  playAgain(socket) {
    const room = this.roomOfHost(socket);
    if (!room) return;
    room.players.forEach(p => { p.score = 0; });
    room.round = 0;
    this.startRound(room);
  }

  // ---------- disconnect ----------
  handleDisconnect(socket) {
    const ref = this.socketIndex.get(socket.id);
    this.socketIndex.delete(socket.id);
    if (!ref) return;
    const room = this.rooms.get(ref.code);
    if (!room) return;

    if (ref.role === "host" && room.hostSocketId === socket.id) {
      // امهل المضيف للعودة، ثم احذف الغرفة
      this.io.to(room.code).emit("host:gone", { graceMs: HOST_GRACE_MS });
      room.hostTimeout = setTimeout(() => {
        this.clearTimer(room);
        this.io.to(room.code).emit("room:closed");
        this.rooms.delete(room.code);
      }, HOST_GRACE_MS);
    } else if (ref.role === "player") {
      const player = room.players.get(ref.clientId);
      if (player) { player.connected = false; }
      this.broadcastLobby(room);
      if (room.phase === "play") this.checkAllDone(room);
      if (room.phase === "score") this.io.to(room.hostSocketId).emit("submit:status", this.submitStatus(room));
    }
  }

  // ---------- helpers ----------
  roomOfHost(socket) {
    const ref = this.socketIndex.get(socket.id);
    if (!ref || ref.role !== "host") return null;
    const room = this.rooms.get(ref.code);
    return room && room.hostSocketId === socket.id ? room : null;
  }
}

function normalizeConfig(config = {}) {
  const cats = Array.isArray(config.cats) && config.cats.length >= 2
    ? config.cats.slice(0, 12) : ["person", "animal", "plant", "object", "country"];
  const rounds = Math.max(1, Math.min(10, parseInt(config.rounds, 10) || 3));
  const time = [0, 45, 60, 90].includes(config.time) ? config.time : 60;
  return { cats, rounds, time };
}

function applyInvalid(vals, invalid) {
  if (!invalid) return { ...vals };
  const out = { ...vals };
  Object.keys(invalid).forEach(k => { if (invalid[k]) out[k] = ""; });
  return out;
}
