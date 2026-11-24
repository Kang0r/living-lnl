// 창문 불빛·빛 입자 (담당: 백경동)
// - 창문: 오늘(KST 0시 이후) 방별 기록 수 → 켜지는 창문 개수 = min(N, ceil(기록 수 / K))
// - 입자: 지금 접속한 사람 수만큼 금빛 입자가 소용돌이 궤적으로 떠다닌다 (최대 200개)
import { WINDOWS, BUILDING, view, colors, mix, css, state as scene } from './scene.js';

export const K = 3; // 기록 K개마다 창문 하나 (CLAUDE.md 5-3)
const MAX_PARTICLES = 200;
const ROOM_IDS = ['cafeteria', 'meetup', 'study', 'recycle', 'wall', 'lounge'];
const LNL = window.LNL;
const calm = LNL.reduceMotion;

// ── 창문 ──────────────────────────────────────────────
const counts = Object.fromEntries(ROOM_IDS.map((r) => [r, 0]));
const rank = new Array(WINDOWS.length); // 방 안에서 몇 번째로 켜지는 창문인지
const roomSize = {};
const flashAt = new Array(WINDOWS.length).fill(-99);

// 방마다 창문 켜지는 순서를 '고정된 무작위'로 섞는다 (새로고침해도 같은 자리부터 켜진다)
for (const r of ROOM_IDS) {
  const idx = [];
  WINDOWS.forEach((w, i) => { if (w.room === r) idx.push(i); });
  let seed = 7 + r.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 0) % 100000;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  idx.forEach((wi, k) => { rank[wi] = k; });
  roomSize[r] = idx.length;
}

export function litCount(room) {
  return Math.min(roomSize[room], Math.ceil(counts[room] / K));
}

let climaxTarget = 0;
let glow = 0;
export function setClimax(on) {
  climaxTarget = on ? 1 : 0;
  if (on) {
    WINDOWS.forEach((w, i) => { flashAt[i] = now() + Math.random() * 0.8; });
    for (let i = 0; i < 6; i++) {
      const w = WINDOWS[Math.floor(Math.random() * WINDOWS.length)];
      burstAt(w.x + w.w / 2, w.y + w.h / 2, 14);
    }
  }
}

const now = () => performance.now() / 1000;

// 새 기록 한 건 → 해당 방 창문 하나를 반짝이며 켠다
export function addEvent(room) {
  if (!(room in counts)) return;
  const before = litCount(room);
  counts[room]++;
  const after = litCount(room);
  let target = -1;
  if (after > before) target = WINDOWS.findIndex((w, i) => w.room === room && rank[i] === after - 1);
  else target = pickWindow(room, true);
  if (target >= 0) flashWindow(target);
  emitStats();
}

// 기록 없이 창문만 반짝이게 (관객 '불 켜기')
export function flashRandom(room) {
  const r = room || ROOM_IDS[Math.floor(Math.random() * ROOM_IDS.length)];
  const i = pickWindow(r, false);
  if (i >= 0) flashWindow(i);
}

function pickWindow(room, litOnly) {
  const pool = [];
  WINDOWS.forEach((w, i) => {
    if (w.room === room && (!litOnly || rank[i] < litCount(room))) pool.push(i);
  });
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1;
}

function flashWindow(i) {
  flashAt[i] = now();
  const w = WINDOWS[i];
  if (!calm) burstAt(w.x + w.w / 2, w.y + w.h / 2, 8);
}

export function drawWindows(g) {
  const t = now();
  const { bx, by } = view;
  glow += (climaxTarget - glow) * 0.04;
  if (Math.abs(climaxTarget - glow) < 0.002) glow = climaxTarget;
  scene.glow = glow;
  const night = 1 - scene.day;
  const off = scene.win.off;

  // 1) 밤에는 켜진 창문 주위로 은은한 번짐
  if (night > 0.3 || glow > 0) {
    WINDOWS.forEach((w, i) => {
      const lit = rank[i] < litCount(w.room);
      if (!lit && glow <= 0) return;
      const c = glow > 0 && !lit ? colors.goldLight : mix(colors.room[w.room], colors.goldLight, 0.55);
      g.fillStyle = css(c, 0.16 * Math.max(night, glow) * (lit ? 1 : glow));
      g.fillRect(bx + w.x - 2, by + w.y - 2, w.w + 4, w.h + 4);
    });
  }

  // 2) 창문 유리
  WINDOWS.forEach((w, i) => {
    const lit = rank[i] < litCount(w.room);
    const f = Math.max(0, 1 - (t - flashAt[i]) / 1.4);
    let c;
    if (lit) {
      const litColor = mix(colors.room[w.room], colors.goldLight, 0.55);
      c = mix(off, litColor, 0.7 + 0.3 * night);
    } else {
      c = off;
    }
    if (f > 0) c = mix(c, colors.goldLight, f * (0.5 + 0.5 * Math.abs(Math.sin((t - flashAt[i]) * 9))));
    if (glow > 0) c = mix(c, colors.goldLight, glow * 0.85);

    const x = bx + w.x;
    const y = by + w.y;
    g.fillStyle = css(c);
    g.fillRect(x, y, w.w, w.h);
    if (lit || glow > 0.5) {
      // 커튼과 창턱 그늘
      g.fillStyle = css(mix(c, colors.room[w.room], 0.35));
      g.fillRect(x, y, Math.max(1, Math.floor(w.w / 4)), w.h);
      g.fillStyle = css(mix(c, colors.ink, 0.15));
      g.fillRect(x, y + w.h - 1, w.w, 1);
    } else if (scene.day > 0.4) {
      // 낮에 꺼진 유리의 반사광
      g.fillStyle = css(colors.paper, 0.45 * scene.day);
      g.fillRect(x + 1, y + 1, 2, 1);
      g.fillRect(x + 1, y + 2, 1, 1);
    }
  });
}

// ── 빛 입자 ───────────────────────────────────────────
// 소용돌이 중심들 (건물 기준 논리 좌표). 클림트의 소용돌이 문양처럼 서로 반대로 돈다.
const VORTEX = [
  { x: -12, y: 22, r: 13 },
  { x: BUILDING.w + 6, y: 26, r: 14 },
  { x: 40, y: -16, r: 18 },
  { x: 12, y: -4, r: 10 },
  { x: 74, y: 0, r: 11 },
  { x: 40, y: 32, r: 24 },
];
const parts = new Map();
const sparks = [];
const pointer = { x: 0, y: 0, on: false };
const tilt = { x: 0, y: 0 };
let myId = null;

export function setPointer(x, y, on) {
  pointer.x = x;
  pointer.y = y;
  pointer.on = on;
}
export function setTilt(x, y) {
  tilt.x = x;
  tilt.y = y;
}
// 관객 휴대폰의 기울기 → 그 사람 입자만 그쪽으로
export function moveGuest(id, x, y) {
  const p = parts.get(id);
  if (!p) return;
  p.gxT = Math.max(-1, Math.min(1, x || 0));
  p.gyT = Math.max(-1, Math.min(1, y || 0));
}

function newParticle(id) {
  const v = Math.floor(Math.random() * VORTEX.length);
  return {
    id,
    v,
    theta: Math.random() * Math.PI * 2,
    rr: 0.35 + Math.random() * 0.65,
    phase: Math.random() * Math.PI * 2,
    hop: 6 + Math.random() * 10,
    x: view.cssW / 2 + (Math.random() - 0.5) * 60,
    y: view.cssH + 20,
    gx: 0, gy: 0, gxT: 0, gyT: 0,
    alpha: 0,
    dying: false,
    trail: [],
  };
}

export function syncPresence(list) {
  const keep = new Set();
  for (const item of list.slice(0, MAX_PARTICLES)) {
    keep.add(item.id);
    if (!parts.has(item.id)) parts.set(item.id, newParticle(item.id));
    else parts.get(item.id).dying = false;
  }
  for (const [id, p] of parts) if (!keep.has(id)) p.dying = true;
}

function burstAt(lx, ly, n) {
  const [x, y] = [(view.bx + lx) * view.px, (view.by + ly) * view.px];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 30 + Math.random() * 70;
    sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 1 });
  }
  if (sparks.length > 400) sparks.splice(0, sparks.length - 400);
}
// 화면 좌표(CSS px)에서 터뜨리기 (응원 등)
export function burst(x, y, n = 16) {
  burstAt(x / view.px - view.bx, y / view.px - view.by, n);
}

export function drawParticles(ctx, t, dt) {
  const px = view.px;
  const size = Math.max(2, Math.round(px * 0.8));
  ctx.save();
  ctx.globalCompositeOperation = scene.day < 0.6 ? 'lighter' : 'source-over';
  const core = css(colors.goldLight);
  const halo = css(colors.gold);

  for (const [id, p] of parts) {
    p.alpha += ((p.dying ? 0 : 1) - p.alpha) * Math.min(1, dt * 2);
    if (p.dying && p.alpha < 0.02) { parts.delete(id); continue; }

    const vt = VORTEX[p.v];
    const dir = p.v % 2 ? -1 : 1;
    let tx;
    let ty;
    if (calm) {
      // 움직임 줄이기: 제자리에서 천천히 숨쉬듯
      tx = (view.bx + vt.x) * px + Math.cos(p.theta) * vt.r * p.rr * px;
      ty = (view.by + vt.y) * px + Math.sin(p.theta) * vt.r * p.rr * px * 0.72;
    } else {
      p.theta += dt * dir * (0.5 + 0.45 / (0.3 + p.rr));
      // 반지름이 천천히 커졌다 작아지며 나선을 그린다
      const R = vt.r * p.rr * (0.7 + 0.3 * Math.sin(t * 0.35 + p.phase)) * px;
      tx = (view.bx + vt.x) * px + Math.cos(p.theta) * R;
      ty = (view.by + vt.y) * px + Math.sin(p.theta) * R * 0.72;
      p.hop -= dt;
      if (p.hop < 0) { p.v = Math.floor(Math.random() * VORTEX.length); p.hop = 8 + Math.random() * 10; }
    }
    p.gx += (p.gxT - p.gx) * Math.min(1, dt * 3);
    p.gy += (p.gyT - p.gy) * Math.min(1, dt * 3);
    tx += (tilt.x + p.gx) * 18 * px;
    ty += (tilt.y + p.gy) * 18 * px;
    if (pointer.on) {
      const dx = pointer.x - tx;
      const dy = pointer.y - ty;
      const k = 0.45 * Math.exp(-Math.hypot(dx, dy) / 180);
      tx += dx * k;
      ty += dy * k;
    }
    const ease = 1 - Math.exp(-dt * (calm ? 1 : 2.2));
    p.x += (tx - p.x) * ease;
    p.y += (ty - p.y) * ease;

    if (!calm) {
      p.trail.push(p.x, p.y);
      if (p.trail.length > 12) p.trail.splice(0, 2);
      for (let i = 0; i < p.trail.length - 2; i += 2) {
        ctx.globalAlpha = p.alpha * 0.08 * (i / p.trail.length);
        ctx.fillStyle = core;
        ctx.fillRect(Math.round(p.trail[i] - size / 2), Math.round(p.trail[i + 1] - size / 2), size, size);
      }
    }
    const mine = id === myId;
    const s = mine ? size + 2 : size;
    ctx.globalAlpha = p.alpha * 0.22;
    ctx.fillStyle = halo;
    ctx.fillRect(Math.round(p.x - s * 1.5), Math.round(p.y - s * 1.5), s * 3, s * 3);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = core;
    ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt * 1.3;
    if (s.life <= 0) { sparks.splice(i, 1); continue; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 60 * dt;
    ctx.globalAlpha = s.life;
    ctx.fillStyle = s.life > 0.5 ? core : halo;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), Math.max(2, px - 1), Math.max(2, px - 1));
  }
  ctx.restore();
}

// ── 데이터 연결 ───────────────────────────────────────
let statsCb = null;
let presenceList = [];
function emitStats() {
  if (!statsCb) return;
  const total = ROOM_IDS.reduce((a, r) => a + counts[r], 0);
  statsCb({ counts: { ...counts }, total, people: presenceList.length, list: presenceList });
}

// options.meta: Presence에 실을 정보 (예: { page: 'main' })
// options.demoCrowd: 데모 모드에서 화면을 채울 가짜 접속자 수
export function startLights({ meta = { page: 'main' }, demoCrowd = 0, demoEvents = false, onStats } = {}) {
  statsCb = onStats || null;
  let dateKey = LNL.kstNow().dateKey;

  const load = () => LNL.todayCounts().then((c) => {
    ROOM_IDS.forEach((r) => { counts[r] = c ? c[r] || 0 : 0; });
    if (!c && LNL.isDemo && demoEvents) {
      ROOM_IDS.forEach((r) => { counts[r] = Math.floor(Math.random() * 13); });
    }
    emitStats();
  });
  load();
  LNL.onEvent((row) => addEvent(row && row.room));

  // 자정(KST)이 지나면 다시 센다
  setInterval(() => {
    const k = LNL.kstNow().dateKey;
    if (k !== dateKey) { dateKey = k; load(); }
  }, 60e3);

  if (LNL.isDemo && demoEvents) {
    const tick = () => {
      if (!document.hidden) addEvent(ROOM_IDS[Math.floor(Math.random() * ROOM_IDS.length)]);
      setTimeout(tick, 2500 + Math.random() * 4000);
    };
    setTimeout(tick, 2000);
  }

  const fake = Array.from({ length: LNL.isDemo ? demoCrowd : 0 }, (_, i) => ({ id: 'demo-' + i, meta: { page: 'demo' } }));
  const me = LNL.presence(meta, (list, id) => {
    myId = id;
    presenceList = list.concat(fake);
    syncPresence(presenceList);
    emitStats();
  });
  myId = me.id;
  return me;
}
