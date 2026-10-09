const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'hot-potato-island', rooms: rooms.size }));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, maxPayload: 4096 });
const rooms = new Map();
const MAX_PLAYERS = 8;
const safeText = (v, max = 18) => String(v || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function roomList(room) { return [...room.players.values()].map(p => ({ id:p.id, name:p.name, color:p.color, x:p.x, y:p.y, z:p.z, yaw:p.yaw, alive:p.alive })); }
function leave(ws) {
  if (!ws.roomCode) return;
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  room.players.delete(ws.playerId);
  for (const peer of room.players.values()) send(peer.ws, { type:'left', id:ws.playerId, players:roomList(room) });
  if (!room.players.size) rooms.delete(ws.roomCode);
  ws.roomCode = null; ws.playerId = null;
}
wss.on('connection', ws => {
  ws.playerId = crypto.randomUUID();
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'join') {
      leave(ws);
      const code = safeText(msg.room, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!/^[A-Z0-9]{4,8}$/.test(code)) return send(ws, { type:'error', message:'Código de sala inválido (4 a 8 letras/números).' });
      let room = rooms.get(code);
      if (!room) { room = { players: new Map() }; rooms.set(code, room); }
      if (room.players.size >= MAX_PLAYERS) return send(ws, { type:'error', message:'Sala cheia (máximo 8 jogadores).' });
      const player = { id:ws.playerId, ws, name:safeText(msg.name, 18) || 'Jogador', color:Math.floor(Math.random()*0xffffff), x:(Math.random()-.5)*8, y:0, z:(Math.random()-.5)*8, yaw:0, alive:true };
      room.players.set(player.id, player); ws.roomCode = code;
      send(ws, { type:'joined', id:player.id, room:code, players:roomList(room) });
      for (const peer of room.players.values()) if (peer.id !== player.id) send(peer.ws, { type:'players', players:roomList(room) });
      return;
    }
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode); if (!room) return;
    const p = room.players.get(ws.playerId); if (!p) return;
    if (msg.type === 'state') {
      const n = v => Number.isFinite(v) ? Math.max(-35, Math.min(35, v)) : 0;
      p.x=n(msg.x); p.y=Math.max(0, Math.min(8, n(msg.y))); p.z=n(msg.z); p.yaw=n(msg.yaw); p.alive=msg.alive !== false;
      for (const peer of room.players.values()) if (peer.id !== p.id) send(peer.ws, { type:'state', player:{ id:p.id, name:p.name, color:p.color, x:p.x, y:p.y, z:p.z, yaw:p.yaw, alive:p.alive } });
    } else if (msg.type === 'chat') {
      const text = safeText(msg.text, 100); if (!text) return;
      for (const peer of room.players.values()) send(peer.ws, { type:'chat', id:p.id, name:p.name, text });
    }
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});
const heartbeat = setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 30000);
server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log(`Hot Potato Island running on port ${process.env.PORT || 3000}`));
process.on('SIGTERM', () => { clearInterval(heartbeat); server.close(() => process.exit(0)); });
