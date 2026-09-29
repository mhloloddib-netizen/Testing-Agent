/* Pulse Chat — browser client */
(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    login: $('login'),
    loginForm: $('login-form'),
    name: $('name'),
    room: $('room'),
    app: $('app'),
    sidebar: $('sidebar'),
    menuBtn: $('menu-btn'),
    roomLabel: $('room-label'),
    roomLabel2: $('room-label-2'),
    users: $('users'),
    userCount: $('user-count'),
    me: $('me'),
    leave: $('leave'),
    status: $('status'),
    messages: $('messages'),
    typing: $('typing'),
    composer: $('composer'),
    input: $('input'),
  };

  const state = {
    ws: null,
    me: null,
    room: null,
    typers: new Map(),
    reconnectTries: 0,
    manualClose: false,
    typingSent: false,
    typingTimer: null,
  };

  /* ---------- helpers ---------- */
  const time = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const initials = (name) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  function setStatus(text, cls) {
    els.status.className = 'status' + (cls ? ' ' + cls : '');
    els.status.innerHTML = `<span class="dot"></span> ${text}`;
  }

  function atBottom() {
    const m = els.messages;
    return m.scrollHeight - m.scrollTop - m.clientHeight < 120;
  }

  function scrollDown(force) {
    if (force || atBottom()) {
      requestAnimationFrame(() => {
        els.messages.scrollTop = els.messages.scrollHeight;
      });
    }
  }

  /* ---------- rendering ---------- */
  function renderSystem(msg) {
    const el = document.createElement('div');
    el.className = 'system';
    el.textContent = msg.text;
    els.messages.appendChild(el);
  }

  function renderMessage(msg) {
    const mine = state.me && msg.userId === state.me.id;

    const row = document.createElement('div');
    row.className = 'row' + (mine ? ' me' : '');

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.background = msg.color || '#6366f1';
    avatar.textContent = initials(msg.user);

    const body = document.createElement('div');

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<strong>${mine ? 'You' : escapeHtml(msg.user)}</strong><span>${time(
      msg.ts
    )}</span>`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = msg.text;

    body.append(meta, bubble);
    row.append(avatar, body);
    els.messages.appendChild(row);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function render(msg) {
    if (msg.type === 'system') renderSystem(msg);
    else renderMessage(msg);
  }

  function renderUsers(users) {
    els.users.innerHTML = '';
    els.userCount.textContent = users.length;
    for (const u of users) {
      const li = document.createElement('li');
      const av = document.createElement('div');
      av.className = 'avatar';
      av.style.background = u.color;
      av.textContent = initials(u.name);
      const span = document.createElement('span');
      span.textContent = u.name + (state.me && u.id === state.me.id ? ' (you)' : '');
      li.append(av, span);
      els.users.appendChild(li);
    }
  }

  function renderTyping() {
    const names = [...state.typers.values()];
    if (!names.length) {
      els.typing.textContent = '';
    } else if (names.length === 1) {
      els.typing.textContent = `${names[0]} is typing…`;
    } else if (names.length === 2) {
      els.typing.textContent = `${names[0]} and ${names[1]} are typing…`;
    } else {
      els.typing.textContent = 'Several people are typing…';
    }
  }

  /* ---------- websocket ---------- */
  function connect(user, room) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    state.ws = ws;
    setStatus('connecting…');

    ws.addEventListener('open', () => {
      state.reconnectTries = 0;
      ws.send(JSON.stringify({ type: 'join', user, room }));
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'welcome':
          state.me = { id: msg.id, name: msg.user, color: msg.color };
          state.room = msg.room;
          setStatus('connected', 'online');
          els.roomLabel.textContent = msg.room;
          els.roomLabel2.textContent = msg.room;
          els.me.innerHTML = `Signed in as <strong style="color:${msg.color}">${escapeHtml(
            msg.user
          )}</strong>`;
          els.messages.innerHTML = '';
          msg.history.forEach(render);
          scrollDown(true);
          break;

        case 'users':
          renderUsers(msg.users);
          break;

        case 'typing':
          if (msg.active) state.typers.set(msg.userId, msg.user);
          else state.typers.delete(msg.userId);
          renderTyping();
          break;

        case 'system':
        case 'message': {
          const stick = atBottom();
          render(msg);
          if (msg.type === 'message') state.typers.delete(msg.userId);
          renderTyping();
          scrollDown(stick);
          break;
        }
      }
    });

    ws.addEventListener('close', () => {
      if (state.manualClose) return;
      setStatus('reconnecting…', 'offline');
      state.reconnectTries += 1;
      const delay = Math.min(1000 * 2 ** (state.reconnectTries - 1), 10000);
      setTimeout(() => connect(user, room), delay);
    });

    ws.addEventListener('error', () => ws.close());
  }

  function sendTyping(active) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    if (active === state.typingSent) return;
    state.typingSent = active;
    state.ws.send(JSON.stringify({ type: 'typing', active }));
  }

  /* ---------- events ---------- */
  els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = els.name.value.trim() || 'Anonymous';
    const room = (els.room.value.trim() || 'general').toLowerCase();
    localStorage.setItem('pulse.name', user);
    localStorage.setItem('pulse.room', room);
    history.replaceState(null, '', '#' + encodeURIComponent(room));
    els.login.classList.add('hidden');
    els.app.classList.remove('hidden');
    els.input.focus();
    state.manualClose = false;
    connect(user, room);
  });

  els.composer.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify({ type: 'message', text }));
    els.input.value = '';
    els.input.style.height = 'auto';
    sendTyping(false);
    clearTimeout(state.typingTimer);
    scrollDown(true);
  });

  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      els.composer.requestSubmit();
    }
  });

  els.input.addEventListener('input', () => {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 140) + 'px';

    if (els.input.value.trim()) {
      sendTyping(true);
      clearTimeout(state.typingTimer);
      state.typingTimer = setTimeout(() => sendTyping(false), 1800);
    } else {
      sendTyping(false);
    }
  });

  els.menuBtn.addEventListener('click', () => els.sidebar.classList.toggle('open'));
  els.messages.addEventListener('click', () => els.sidebar.classList.remove('open'));

  els.leave.addEventListener('click', () => {
    state.manualClose = true;
    if (state.ws) state.ws.close();
    state.typers.clear();
    renderTyping();
    els.messages.innerHTML = '';
    els.app.classList.add('hidden');
    els.login.classList.remove('hidden');
    els.sidebar.classList.remove('open');
  });

  /* ---------- boot ---------- */
  els.name.value = localStorage.getItem('pulse.name') || '';
  const hashRoom = decodeURIComponent(location.hash.slice(1));
  els.room.value = hashRoom || localStorage.getItem('pulse.room') || 'general';
  els.name.focus();
})();
