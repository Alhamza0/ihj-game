// ============================ Socket.IO game server ============================
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import { RoomManager } from "./rooms.js";

const PORT = process.env.PORT || 3001;
const ORIGIN = process.env.CLIENT_ORIGIN || "*";

const app = express();
app.use(cors({ origin: ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rm.rooms.size }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: ORIGIN } });
const rm = new RoomManager(io);

io.on("connection", socket => {
  // --- host ---
  socket.on("host:create", config => rm.createRoom(socket, config));
  socket.on("host:rebind", ({ code }) => rm.rebindHost(socket, code));
  socket.on("host:config", config => rm.setConfig(socket, config));
  socket.on("host:start", () => rm.startGame(socket));
  socket.on("host:invalidate", payload => rm.invalidate(socket, payload));
  socket.on("host:next", () => rm.nextRound(socket));
  socket.on("host:again", () => rm.playAgain(socket));

  // --- player ---
  socket.on("player:join", payload => rm.joinRoom(socket, payload));
  socket.on("player:answers", ({ vals }) => rm.savePlayerAnswers(socket, vals, false));
  socket.on("player:done", ({ vals }) => rm.savePlayerAnswers(socket, vals, true));

  socket.on("disconnect", () => rm.handleDisconnect(socket));
});

httpServer.listen(PORT, () => {
  console.log(`🎮 IHJ server listening on :${PORT}`);
});
