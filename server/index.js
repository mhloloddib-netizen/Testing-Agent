'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const HISTORY_LIMIT = 100;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * rooms: Map<roomName, { history: Message[], clients: Set<ws> }>
 */
const rooms = new Map();

function getRoom(name) {
  if (!rooms.has(name)) {
    rooms.set(name, { history: [], clients: new Set() });
  }
  return rooms.get(name);
}

function nowId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sanitize(str, max) {
  return String(str == null ? '' : str)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(roomName, payload, { except } = {}) {
  const room = rooms.get(roomName);
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const client of room.clients) {
    if (client !== except && client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

function userList(roomName) {
  const room = rooms.get(roomName);
  if (!room) return [];
  return [...room.clients]
    .filter((c) => c.user)
    .map((c) => ({ id: c.id, name: c.user, color: c.color }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function pushHistory(roomName, message) {
  const room = getRoom(roomName);
  room.history.push(message);
  if (room.history.length > HISTORY_LIMIT) {
    room.history.splice(0, room.history.length - HISTORY_LIMIT);
  }
}

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360} 70% 62%)`;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    rooms: [...rooms.entries()].map(([name, r]) => ({
      name,
      users: r.clients.size,
      messages: r.history.length,
    })),
  });
});

wss.on('connection', (ws) => {
  ws.id = nowId();
  ws.isAlive = true;
  ws.user = null;
  ws.room = null;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'join': {
        const name = sanitize(msg.user, 24) || 'Anonymous';
        const roomName = (sanitize(msg.room, 24) || 'general').toLowerCase();

        if (ws.room) leaveRoom(ws);

        ws.user = name;
        ws.room = roomName;
        ws.color = colorFor(name);

        const room = getRoom(roomName);
        room.clients.add(ws);

        send(ws, {
          type: 'welcome',
          id: ws.id,
          user: name,
          room: roomName,
          color: ws.color,
          history: room.history,
        });

        const notice = {
          type: 'system',
          id: nowId(),
          room: roomName,
          text: `${name} joined the room`,
          ts: Date.now(),
        };
        pushHistory(roomName, notice);
        broadcast(roomName, notice, { except: ws });
        broadcast(roomName, { type: 'users', room: roomName, users: userList(roomName) });
        break;
      }

      case 'message': {
        if (!ws.room || !ws.user) return;
        const text = sanitize(msg.text, 2000);
        if (!text) return;
        const message = {
          type: 'message',
          id: nowId(),
          room: ws.room,
          userId: ws.id,
          user: ws.user,
          color: ws.color,
          text,
          ts: Date.now(),
        };
        pushHistory(ws.room, message);
        broadcast(ws.room, message);
        break;
      }

      case 'typing': {
        if (!ws.room || !ws.user) return;
        broadcast(
          ws.room,
          { type: 'typing', userId: ws.id, user: ws.user, active: !!msg.active },
          { except: ws }
        );
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => leaveRoom(ws));
  ws.on('error', () => leaveRoom(ws));
});

function leaveRoom(ws) {
  const roomName = ws.room;
  if (!roomName) return;
  const room = rooms.get(roomName);
  ws.room = null;
  if (!room) return;

  room.clients.delete(ws);

  if (ws.user) {
    const notice = {
      type: 'system',
      id: nowId(),
      room: roomName,
      text: `${ws.user} left the room`,
      ts: Date.now(),
    };
    pushHistory(roomName, notice);
    broadcast(roomName, notice);
    broadcast(roomName, { type: 'users', room: roomName, users: userList(roomName) });
  }

  if (room.clients.size === 0 && room.history.length === 0) {
    rooms.delete(roomName);
  }
}

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, HOST, () => {
  console.log(`Chat server running on http://${HOST}:${PORT}`);
});
