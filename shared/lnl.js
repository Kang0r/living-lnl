/* 살아있는 생활관 — 공통 스크립트
   방 앱 9개가 <script src="https://(통합 사이트 주소)/shared/lnl.js">로 불러간다.
   ES 모듈이 아닌 일반 스크립트이며 window.LNL에 붙는다.
   LNL.header / LNL.emit / LNL.go 의 이름과 인자는 절대 바꾸지 않는다. 새 기능은 추가만 한다. */
(function () {
  'use strict';
  if (window.LNL && window.LNL.__loaded) return;

  // ── 설정 ──────────────────────────────────────────────
  // ( Supabase 프로젝트 URL ), ( anon 공개 키 ) — 정해지면 여기에 넣는다.
  // 둘 중 하나라도 비어 있으면 '데모 모드'로 동작한다 (같은 브라우저 탭끼리만 신호가 오간다).
  var SUPABASE_URL = '';
  var SUPABASE_ANON_KEY = '';
  var SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

  var ROOMS = {
    cafeteria: '식당',
    meetup: '밥약 광장',
    study: '스터디룸',
    recycle: '분리수거장',
    wall: '기록의 벽',
    lounge: '라운지'
  };
  var WEATHER_LABEL = { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈' };

  var script = document.currentScript;
  // 이 파일이 있는 사이트의 최상위 주소 (shared/의 한 단계 위)
  var BASE = script && script.src ? new URL('../', script.src).href : location.origin + '/';
  var isDemo = !(SUPABASE_URL && SUPABASE_ANON_KEY);
  var reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ── 저장소 (사생활 보호 모드 등에서 막힐 수 있으므로 항상 try/catch) ──
  function storageGet(kind, key) {
    try { return window[kind].getItem(key); } catch (e) { return null; }
  }
  function storageSet(kind, key, value) {
    try { window[kind].setItem(key, value); } catch (e) { /* 무시 */ }
  }

  function randomId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  // ── Supabase 클라이언트 (필요할 때 한 번만 불러온다) ──
  var clientPromise = null;
  function client() {
    if (isDemo) return Promise.resolve(null);
    if (!clientPromise) {
      clientPromise = import(SUPABASE_ESM).then(function (m) {
        return m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      }).catch(function () { return null; });
    }
    return clientPromise;
  }

  // ── 데모 모드용 탭 간 신호 ──
  var bus = null;
  var busHandlers = [];
  try { bus = new BroadcastChannel('lnl-demo'); } catch (e) { bus = null; }
  if (bus) bus.onmessage = function (e) { busHandlers.forEach(function (h) { h(e.data); }); };
  function busSend(msg, toSelf) {
    if (bus) bus.postMessage(msg);
    if (toSelf) busHandlers.forEach(function (h) { h(msg); });
  }

  // ── 시간 (Asia/Seoul) ──
  function kstNow() {
    var d = new Date(Date.now() + 9 * 3600e3);
    return {
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      dateKey: d.toISOString().slice(0, 10)
    };
  }
  function kstMidnightISO() {
    var d = new Date(Date.now() + 9 * 3600e3);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 9 * 3600e3).toISOString();
  }
  function clockText() {
    var n = kstNow();
    return String(n.hour).padStart(2, '0') + ':' + String(n.minute).padStart(2, '0');
  }

  // ── 날씨 (Open-Meteo, 키 불필요. 실패하면 맑음) ──
  function weatherKind(code) {
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
    if (code >= 2) return 'cloudy';
    return 'clear';
  }
  var weatherPromise = null;
  function weather() {
    if (weatherPromise) return weatherPromise;
    // 확인용: 주소 뒤에 ?weather=rain 처럼 붙이면 그 날씨로 보인다
    var forced = new URLSearchParams(location.search).get('weather');
    if (WEATHER_LABEL[forced]) {
      return (weatherPromise = Promise.resolve({ kind: forced, label: WEATHER_LABEL[forced], temp: null }));
    }
    try {
      var cached = JSON.parse(storageGet('sessionStorage', 'lnl-weather') || 'null');
      if (cached && Date.now() - cached.at < 15 * 60e3) return (weatherPromise = Promise.resolve(cached.w));
    } catch (e) { /* 무시 */ }
    weatherPromise = fetch('https://api.open-meteo.com/v1/forecast?latitude=37.46&longitude=126.95&current=temperature_2m,weather_code&timezone=Asia%2FSeoul')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        var kind = weatherKind(d.current.weather_code);
        var w = { kind: kind, label: WEATHER_LABEL[kind], temp: Math.round(d.current.temperature_2m) };
        storageSet('sessionStorage', 'lnl-weather', JSON.stringify({ at: Date.now(), w: w }));
        return w;
      })
      .catch(function () { return { kind: 'clear', label: WEATHER_LABEL.clear, temp: null }; });
    return weatherPromise;
  }

  function ensureCss() {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].href.indexOf('shared/design.css') !== -1) return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = BASE + 'shared/design.css';
    document.head.appendChild(link);
  }

  function roomIdFrom(value) {
    if (ROOMS[value]) return value;
    for (var id in ROOMS) if (ROOMS[id] === value) return id;
    return null;
  }

  // ══ LNL.header(roomName) ══════════════════════════════
  // 페이지 맨 위에 [생활관으로] · 방 이름 · 현재 시각과 날씨 상단바를 넣는다.
  function header(roomName) {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', function () { header(roomName); });
      return null;
    }
    ensureCss();
    var id = roomIdFrom(document.body.getAttribute('data-room')) || roomIdFrom(roomName);
    var name = roomName && !ROOMS[roomName] ? String(roomName) : (ROOMS[id] || '생활관');

    var old = document.querySelector('.lnl-header');
    if (old) old.remove();

    var bar = document.createElement('header');
    bar.className = 'lnl-header';
    if (id) bar.style.setProperty('--lnl-room', 'var(--room-' + id + ')');

    var home = document.createElement('a');
    home.className = 'lnl-header__home';
    home.href = BASE;
    home.textContent = '생활관으로';
    home.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      go(BASE);
    });

    var title = document.createElement('span');
    title.className = 'lnl-header__room';
    title.textContent = name;

    var meta = document.createElement('span');
    meta.className = 'lnl-header__meta';
    var weatherText = '';
    function paint() { meta.textContent = clockText() + (weatherText ? ' · ' + weatherText : ''); }
    paint();
    setInterval(paint, 20e3);
    weather().then(function (w) {
      weatherText = w.label + (w.temp === null ? '' : ' ' + w.temp + '°');
      paint();
    });

    bar.appendChild(home);
    bar.appendChild(title);
    bar.appendChild(meta);
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  // ══ LNL.emit(room, action) ════════════════════════════
  // events 테이블에 한 줄 기록한다. 실패해도 앱을 막지 않는다 (조용히 무시, false 반환).
  function emit(room, action) {
    if (!ROOMS[room]) {
      if (window.console) console.warn('[LNL] 알 수 없는 방 id:', room);
      return Promise.resolve(false);
    }
    var row = { room: room, action: String(action || 'visit').toLowerCase().slice(0, 40) };
    if (isDemo) {
      busSend({ kind: 'event', row: { room: row.room, action: row.action, created_at: new Date().toISOString() } }, true);
      return Promise.resolve(true);
    }
    return client().then(function (c) {
      if (!c) return false;
      return c.from('events').insert(row).then(function (r) { return !r.error; });
    }).catch(function () { return false; });
  }

  // ══ LNL.go(url) ═══════════════════════════════════════
  // 금박 모자이크가 0.3초 동안 화면을 덮은 뒤 url로 이동한다.
  var going = false;
  function go(url) {
    if (going) return;
    going = true;
    var moved = false;
    function move() {
      if (moved) return;
      moved = true;
      location.href = url;
    }
    if (reduceMotion) { move(); return; }
    mosaic('cover', move);
    setTimeout(move, 1200); // 애니메이션이 멈춰도 이동은 꼭 한다
  }

  // 금박 모자이크: 사각 타일 위에 원·작은 사각 문양. mode = 'cover' | 'reveal'
  function mosaic(mode, done) {
    var veil = document.createElement('canvas');
    veil.className = 'lnl-veil';
    veil.setAttribute('aria-hidden', 'true');
    (document.body || document.documentElement).appendChild(veil);

    var w = window.innerWidth;
    var h = window.innerHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    veil.width = Math.round(w * dpr);
    veil.height = Math.round(h * dpr);
    var ctx = veil.getContext('2d');
    ctx.scale(dpr, dpr);

    var cs = getComputedStyle(document.documentElement);
    var gold = cs.getPropertyValue('--gold').trim() || '#C9A24A';
    var goldLight = cs.getPropertyValue('--gold-light').trim() || '#F2D58A';
    var night = cs.getPropertyValue('--night').trim() || '#141A2E';

    var size = Math.max(28, Math.round(Math.min(w, h) / 10));
    var cols = Math.ceil(w / size);
    var rows = Math.ceil(h / size);
    var tiles = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        // 왼쪽 위에서 오른쪽 아래로 물결처럼 퍼지되, 조금씩 어긋나게
        var wave = (x / cols + y / rows) / 2;
        tiles.push({ x: x * size, y: y * size, d: wave * 0.09 + Math.random() * 0.03, mark: Math.random() });
      }
    }
    var DUR = 0.18;
    var start = performance.now();

    function frame(now) {
      var t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      var finished = true;
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var p = Math.min(1, Math.max(0, (t - tile.d) / DUR));
        if (p < 1) finished = false;
        if (mode === 'reveal') p = 1 - p;
        if (p <= 0) continue;
        var s = size * p;
        var cx = tile.x + size / 2;
        var cy = tile.y + size / 2;
        ctx.fillStyle = gold;
        ctx.fillRect(cx - s / 2 - 0.5, cy - s / 2 - 0.5, s + 1, s + 1);
        if (p > 0.6) {
          ctx.globalAlpha = (p - 0.6) / 0.4;
          if (tile.mark < 0.4) {
            ctx.fillStyle = goldLight;
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile.mark < 0.6) {
            ctx.fillStyle = goldLight;
            ctx.fillRect(cx - s * 0.15, cy - s * 0.15, s * 0.3, s * 0.3);
          }
          ctx.globalAlpha *= 0.18;
          ctx.strokeStyle = night;
          ctx.strokeRect(tile.x + 0.5, tile.y + 0.5, size - 1, size - 1);
          ctx.globalAlpha = 1;
        }
      }
      if (!finished) { requestAnimationFrame(frame); return; }
      if (mode === 'reveal') veil.remove();
      if (done) done();
    }
    requestAnimationFrame(frame);
    return veil;
  }

  // 생활관에서 방으로 들어왔거나, 방에서 생활관으로 돌아왔을 때 모자이크를 걷는다
  function revealOnArrival() {
    if (reduceMotion || !document.referrer) return;
    var from;
    try { from = new URL(document.referrer).origin; } catch (e) { return; }
    var baseOrigin = new URL(BASE).origin;
    var enteringRoom = from === baseOrigin && location.origin !== baseOrigin;
    var returningHome = location.origin === baseOrigin && from !== baseOrigin;
    if (enteringRoom || returningHome) mosaic('reveal');
  }
  // 뒤로 가기로 돌아왔을 때 덮개가 남아 있지 않게
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    going = false;
    var veils = document.querySelectorAll('.lnl-veil');
    for (var i = 0; i < veils.length; i++) veils[i].remove();
  });

  // ── 버튼을 누른 자리의 작은 금빛 퍼짐 (.lnl-btn 또는 data-lnl-ripple 요소) ──
  document.addEventListener('pointerdown', function (e) {
    if (reduceMotion || !e.target || !e.target.closest) return;
    if (!e.target.closest('.lnl-btn, [data-lnl-ripple]')) return;
    var dot = document.createElement('span');
    dot.className = 'lnl-ripple';
    dot.style.left = e.clientX + 'px';
    dot.style.top = e.clientY + 'px';
    document.body.appendChild(dot);
    setTimeout(function () { dot.remove(); }, 600);
  }, { capture: true, passive: true });

  // ══ 아래는 메인 장면·관객 참여 모드용 추가 API ══════════

  // 오늘(KST 0시 이후) 방별 기록 수. 데모 모드이거나 실패하면 null
  function todayCounts() {
    return client().then(function (c) {
      if (!c) return null;
      var since = kstMidnightISO();
      return Promise.all(Object.keys(ROOMS).map(function (room) {
        return c.from('events').select('id', { count: 'exact', head: true })
          .eq('room', room).gte('created_at', since)
          .then(function (r) { return [room, r.error ? 0 : (r.count || 0)]; });
      })).then(function (pairs) {
        var out = {};
        pairs.forEach(function (p) { out[p[0]] = p[1]; });
        return out;
      });
    }).catch(function () { return null; });
  }

  // 새 기록이 들어올 때마다 cb(row) — Supabase Realtime (데모: 같은 브라우저의 emit)
  var eventHandlers = null;
  function onEvent(cb) {
    if (!eventHandlers) {
      eventHandlers = [];
      var fire = function (row) { eventHandlers.forEach(function (h) { h(row); }); };
      if (isDemo) {
        busHandlers.push(function (m) { if (m && m.kind === 'event') fire(m.row); });
      } else {
        client().then(function (c) {
          if (!c) return;
          c.channel('lnl-events')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, function (p) { fire(p.new); })
            .subscribe();
        });
      }
    }
    eventHandlers.push(cb);
  }

  // Broadcast 채널. live('lnl-live').on('light', cb) / .send('light', {...}) — 보낸 사람 자신은 받지 않는다
  var liveChannels = {};
  function live(name) {
    name = name || 'lnl-live';
    if (liveChannels[name]) return liveChannels[name];
    var handlers = {};
    var queue = [];
    var ch = null;
    var ready = false;
    function dispatch(event, payload) {
      (handlers[event] || []).forEach(function (h) { h(payload || {}, event); });
    }
    var api = {
      on: function (event, cb) {
        (handlers[event] = handlers[event] || []).push(cb);
        return api;
      },
      send: function (event, payload) {
        if (isDemo) { busSend({ kind: 'live', name: name, event: event, payload: payload }, false); return; }
        if (ready) ch.send({ type: 'broadcast', event: event, payload: payload });
        else queue.push([event, payload]);
      }
    };
    if (isDemo) {
      busHandlers.push(function (m) { if (m && m.kind === 'live' && m.name === name) dispatch(m.event, m.payload); });
    } else {
      client().then(function (c) {
        if (!c) return;
        ch = c.channel(name, { config: { broadcast: { self: false } } });
        ch.on('broadcast', { event: '*' }, function (msg) { dispatch(msg.event, msg.payload); });
        ch.subscribe(function (status) {
          if (status !== 'SUBSCRIBED') return;
          ready = true;
          queue.splice(0).forEach(function (q) { ch.send({ type: 'broadcast', event: q[0], payload: q[1] }); });
        });
      });
    }
    return (liveChannels[name] = api);
  }

  // 접속자 Presence (채널 lnl-presence). cb(list, myId) — list = [{ id, meta }]
  function presence(meta, cb) {
    var id = randomId();
    meta = meta || {};
    if (isDemo) {
      var peers = {};
      var beat = function () { busSend({ kind: 'presence', id: id, meta: meta, at: Date.now() }, true); };
      busHandlers.push(function (m) {
        if (!m || m.kind !== 'presence') return;
        if (m.leave) delete peers[m.id];
        else peers[m.id] = { meta: m.meta, at: m.at };
      });
      var report = function () {
        var now = Date.now();
        var list = [];
        for (var k in peers) {
          if (now - peers[k].at > 7000) delete peers[k];
          else list.push({ id: k, meta: peers[k].meta });
        }
        cb(list, id);
      };
      beat();
      setTimeout(report, 0);
      setInterval(function () { beat(); report(); }, 2500);
      window.addEventListener('pagehide', function () { busSend({ kind: 'presence', id: id, leave: true }, false); });
      return { id: id };
    }
    client().then(function (c) {
      if (!c) { cb([{ id: id, meta: meta }], id); return; }
      var ch = c.channel('lnl-presence', { config: { presence: { key: id } } });
      ch.on('presence', { event: 'sync' }, function () {
        var state = ch.presenceState();
        cb(Object.keys(state).map(function (k) { return { id: k, meta: state[k][0] || {} }; }), id);
      });
      ch.subscribe(function (status) { if (status === 'SUBSCRIBED') ch.track(meta); });
    });
    return { id: id };
  }

  // 휴대폰 기울기. cb({ x, y }) — 각각 -1 ~ 1. iOS는 button을 눌러야 권한을 요청한다.
  function tilt(cb, button) {
    function listen() {
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma === null || e.beta === null) return;
        var x = Math.max(-1, Math.min(1, e.gamma / 30));
        var y = Math.max(-1, Math.min(1, (e.beta - 40) / 30));
        cb({ x: x, y: y });
      });
    }
    var D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      if (!button) return;
      button.hidden = false;
      button.addEventListener('click', function () {
        D.requestPermission().then(function (res) {
          if (res === 'granted') { listen(); button.hidden = true; }
        }).catch(function () { /* 거절하면 기울기 없이 쓴다 */ });
      });
    } else if (D) {
      listen();
    }
  }

  window.LNL = {
    __loaded: true,
    // 방 앱 공통 API — 이름과 인자를 바꾸지 말 것
    header: header,
    emit: emit,
    go: go,
    // 추가 API
    base: BASE,
    isDemo: isDemo,
    reduceMotion: reduceMotion,
    rooms: ROOMS,
    client: client,
    kstNow: kstNow,
    kstMidnightISO: kstMidnightISO,
    weather: weather,
    todayCounts: todayCounts,
    onEvent: onEvent,
    live: live,
    presence: presence,
    tilt: tilt,
    mosaic: mosaic,
    storageGet: storageGet,
    storageSet: storageSet
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revealOnArrival);
  else revealOnArrival();
})();
