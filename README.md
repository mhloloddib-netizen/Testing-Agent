# 💬 Pulse Chat

A real-time, multi-room chat app built with **Node.js + Express + WebSocket (`ws`)** and a
dependency-free vanilla-JS frontend.

## Features

- ⚡ **Real-time messaging** over WebSockets (no polling)
- 🚪 **Multiple rooms** — join any room by name, share it via URL hash (`/#design`)
- 👥 **Live presence** — online user list that updates on join/leave
- ✍️ **Typing indicators** ("Ali is typing…")
- 🕓 **Room history** — last 100 messages replayed to anyone who joins (in-memory)
- 🔄 **Auto-reconnect** with exponential backoff + server heartbeat to drop dead sockets
- 🎨 Modern dark UI, per-user avatar colors, mobile responsive
- 🔒 Input sanitizing + text-only rendering (no XSS via messages)

## Run it

```bash
npm install
npm start          # http://localhost:3000
```

Dev mode with auto-restart:

```bash
npm run dev
```

Open the page in two browser tabs (or two devices on your network) to see messages sync live.

## Deploy

Deploy as a **Web Service** (not a Static Site) on any Node host. The repo includes a
[`render.yaml`](./render.yaml) blueprint for [Render](https://render.com):

| Setting       | Value         |
| ------------- | ------------- |
| Runtime       | Node          |
| Build command | `npm install` |
| Start command | `npm start`   |
| Health check  | `/api/health` |

The server already reads `process.env.PORT` and binds `0.0.0.0`, and the client auto-upgrades
to `wss://` on HTTPS — no code changes needed.

📘 বাংলায় ধাপে ধাপে গাইড: **[DEPLOY-RENDER.bn.md](./DEPLOY-RENDER.bn.md)**

## Project layout

```
server/index.js    Express static server + WebSocket hub (rooms, presence, history)
public/index.html  Login screen + chat shell
public/styles.css  Theme and responsive layout
public/app.js      WebSocket client, rendering, typing, reconnect
```

## Configuration

| Env var | Default   | Description          |
| ------- | --------- | -------------------- |
| `PORT`  | `3000`    | HTTP port            |
| `HOST`  | `0.0.0.0` | Bind address         |

## WebSocket protocol

Client → server:

```jsonc
{ "type": "join",    "user": "Ali", "room": "general" }
{ "type": "message", "text": "hello!" }
{ "type": "typing",  "active": true }
```

Server → client:

```jsonc
{ "type": "welcome", "id", "user", "room", "color", "history": [...] }
{ "type": "message", "id", "user", "userId", "color", "text", "ts" }
{ "type": "system",  "text": "Ali joined the room", "ts" }
{ "type": "users",   "users": [{ "id", "name", "color" }] }
{ "type": "typing",  "userId", "user", "active" }
```

There is also a `GET /api/health` endpoint returning room/user/message counts.

## Notes

State is intentionally **in-memory** — restarting the server clears all rooms and history.
Swap the `rooms` Map in `server/index.js` for Redis or a database if you need persistence.
