// 생활관 건물·하늘·날씨 그리기 (담당: 윤예영)
// 픽셀 아트: 작은 논리 해상도(view.W × view.H)에 그린 뒤 view.px배로 키워 보여 준다.
// 확인용 주소 옵션: ?hour=18.5 (그 시각의 하늘), ?weather=rain|snow|cloudy|clear

// ── 색: shared/design.css 변수만 쓴다. 명암은 변수끼리 섞어서 만든다 ──
const FALLBACK = {
  night: '#141A2E', paper: '#F6F1E6', ink: '#22201C', gold: '#C9A24A', 'gold-light': '#F2D58A',
  'room-cafeteria': '#E07A5F', 'room-meetup': '#F2A65A', 'room-study': '#5B8DEF',
  'room-recycle': '#6BAA75', 'room-wall': '#B07BD9', 'room-lounge': '#4FB3BF',
};
export const colors = { room: {} };

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
export function css(c, alpha = 1) {
  return alpha >= 1
    ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
}

export function loadColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name) => hexToRgb(cs.getPropertyValue('--' + name).trim() || FALLBACK[name]);
  colors.night = get('night');
  colors.paper = get('paper');
  colors.ink = get('ink');
  colors.gold = get('gold');
  colors.goldLight = get('gold-light');
  for (const id of ['cafeteria', 'meetup', 'study', 'recycle', 'wall', 'lounge']) {
    colors.room[id] = get('room-' + id);
  }
  buildPalettes();
}

// ── 건물 설계 (건물 왼쪽 위 기준 논리 픽셀) ──
// 본관 폭 80 + 틈 3 + 분리수거장 별채 16 = 99
export const BUILDING = { w: 99, h: 70 };
const FLOOR_TOP = 12;
const FLOOR_H = 11;
const UPPER_FLOORS = ['wall', 'lounge', 'study', 'meetup']; // 위층부터

// 창문 좌표. lights.js가 이 좌표로 불을 켠다. 형식: { room, x, y, w, h }
export const WINDOWS = [];
UPPER_FLOORS.forEach((room, f) => {
  const top = FLOOR_TOP + f * FLOOR_H;
  for (let i = 0; i < 6; i++) WINDOWS.push({ room, x: 6 + i * 12, y: top + 3, w: 8, h: 6 });
});
for (const x of [4, 14, 24, 48, 58, 68]) WINDOWS.push({ room: 'cafeteria', x, y: 60, w: 8, h: 7 });
for (const x of [86, 93]) WINDOWS.push({ room: 'recycle', x, y: 62, w: 4, h: 4 });

// 눌리는 영역 (rooms.js가 쓴다)
export const ZONES = [
  ...UPPER_FLOORS.map((room, f) => ({ room, x: 0, y: FLOOR_TOP + f * FLOOR_H, w: 80, h: FLOOR_H })),
  { room: 'cafeteria', x: 0, y: 56, w: 80, h: 14 },
  { room: 'recycle', x: 82, y: 56, w: 18, h: 14 },
];

// ── 화면 배치 ──
export const view = { px: 3, W: 120, H: 240, bx: 10, by: 130, groundY: 200, cssW: 360, cssH: 720 };

export function resize(cssW, cssH) {
  const px = Math.max(2, Math.floor(Math.min(cssW / (BUILDING.w + 16), cssH / (BUILDING.h + 60))));
  view.px = px;
  view.cssW = cssW;
  view.cssH = cssH;
  view.W = Math.ceil(cssW / px);
  view.H = Math.ceil(cssH / px);
  view.groundY = view.H - Math.max(16, Math.floor(view.H * 0.14));
  view.bx = Math.floor((view.W - BUILDING.w) / 2);
  view.by = view.groundY - BUILDING.h;
  skyKey = '';
  makeStars();
  makeWeatherBits();
}

// 건물 논리 좌표 → 화면(CSS px) 좌표
export function toScreen(x, y) {
  return [(view.bx + x) * view.px, (view.by + y) * view.px];
}

// ── 장면 상태 (다른 모듈이 읽고 쓴다) ──
export const state = {
  weather: 'clear', // clear | cloudy | rain | snow
  hover: null,      // 마우스가 올라간 방 id
  glow: 0,          // 전체 점등 정도 0~1 (lights.js가 정한다)
  day: 0,           // 낮 밝기 0~1
  stars: 1,         // 별 보이는 정도 0~1
  hour: 0,
  win: { off: [0, 0, 0] }, // 꺼진 창문 색
};

// ── 시간: 실제 시각(Asia/Seoul) 4단계 ──
export function skyHour() {
  const q = new URLSearchParams(location.search).get('hour');
  if (q !== null && q !== '' && !isNaN(+q)) return ((+q % 24) + 24) % 24;
  const d = new Date(Date.now() + 9 * 3600e3);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}
export function phaseName(h) {
  if (h >= 5 && h < 7) return '새벽';
  if (h >= 7 && h < 17) return '낮';
  if (h >= 17 && h < 19) return '노을';
  return '밤';
}

let PAL = null;
function buildPalettes() {
  const c = colors;
  PAL = {
    night: { top: c.night, bottom: mix(c.night, c.room.study, 0.22), day: 0, stars: 1 },
    dawn: { top: mix(c.night, c.room.study, 0.3), bottom: mix(c.goldLight, c.room.cafeteria, 0.35), day: 0.45, stars: 0.35 },
    day: { top: mix(c.room.study, c.paper, 0.32), bottom: mix(c.paper, c.room.lounge, 0.22), day: 1, stars: 0 },
    sunset: { top: mix(c.night, c.room.cafeteria, 0.4), bottom: mix(c.gold, c.room.cafeteria, 0.45), day: 0.5, stars: 0.15 },
  };
}
// 경계 시각 앞뒤 30분 동안 부드럽게 넘어간다
const KEYS = [
  [0, 'night'], [4.5, 'night'], [5.5, 'dawn'], [6.5, 'dawn'], [7.5, 'day'],
  [16.5, 'day'], [17.5, 'sunset'], [18.5, 'sunset'], [19.5, 'night'], [24, 'night'],
];
function skyAt(h) {
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const [h0, a] = KEYS[i];
  const [h1, b] = KEYS[i + 1];
  const t = h1 === h0 ? 0 : (h - h0) / (h1 - h0);
  const s = t * t * (3 - 2 * t);
  const A = PAL[a];
  const B = PAL[b];
  return {
    top: mix(A.top, B.top, s),
    bottom: mix(A.bottom, B.bottom, s),
    day: A.day + (B.day - A.day) * s,
    stars: A.stars + (B.stars - A.stars) * s,
  };
}
// 날씨에 따라 하늘을 흐리게
function weatherTint(sky) {
  const grey = mix(colors.paper, colors.ink, 0.45);
  const amount = { clear: 0, cloudy: 0.32, rain: 0.45, snow: 0.22 }[state.weather] || 0;
  if (!amount) return sky;
  const target = state.weather === 'snow' ? mix(colors.paper, grey, 0.4) : grey;
  return {
    ...sky,
    top: mix(sky.top, target, amount * (0.4 + 0.6 * sky.day)),
    bottom: mix(sky.bottom, target, amount * (0.4 + 0.6 * sky.day)),
    stars: sky.stars * (1 - amount * 1.8),
  };
}

// ── 하늘: 4×4 바이어 디더링으로 계단진 그라데이션 ──
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const skyCanvas = document.createElement('canvas');
const skyCtx = skyCanvas.getContext('2d');
let skyKey = '';
function renderSky(sky) {
  const { W, groundY } = view;
  const key = `${W}x${groundY}|${Math.round(state.hour * 60)}|${state.weather}`;
  if (key === skyKey) return;
  skyKey = key;
  skyCanvas.width = W;
  skyCanvas.height = groundY;
  const bands = 9;
  const band = [];
  for (let i = 0; i <= bands; i++) band.push(mix(sky.top, sky.bottom, i / bands));
  const img = skyCtx.createImageData(W, groundY);
  const d = img.data;
  for (let y = 0; y < groundY; y++) {
    const t = y / Math.max(1, groundY - 1);
    for (let x = 0; x < W; x++) {
      const q = Math.min(bands, Math.floor(t * bands + BAYER[(y & 3) * 4 + (x & 3)] / 16));
      const c = band[q];
      const o = (y * W + x) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  skyCtx.putImageData(img, 0, 0);
}

// ── 별·구름·비·눈 ──
let stars = [];
function makeStars() {
  stars = [];
  const n = Math.round((view.W * view.groundY) / 450);
  for (let i = 0; i < n; i++) {
    stars.push({ x: Math.floor(Math.random() * view.W), y: Math.floor(Math.random() * view.groundY * 0.7), p: Math.random() * 6.28, s: 0.5 + Math.random() * 1.5 });
  }
}
let clouds = [];
let drops = [];
function makeCloud(x) {
  const w = 14 + Math.floor(Math.random() * 14);
  return {
    x: x ?? Math.random() * view.W,
    y: 4 + Math.random() * view.groundY * 0.4,
    w,
    bump: 2 + Math.floor(Math.random() * (w - 10)),
    v: 0.6 + Math.random() * 1.2,
  };
}
export function makeWeatherBits() {
  const n = { clear: 2, cloudy: 6, rain: 7, snow: 5 }[state.weather] ?? 2;
  clouds = Array.from({ length: n }, () => makeCloud());
  const m = state.weather === 'rain' ? 90 : state.weather === 'snow' ? 70 : 0;
  drops = Array.from({ length: m }, () => ({
    x: Math.random() * view.W,
    y: Math.random() * view.H,
    v: state.weather === 'rain' ? 70 + Math.random() * 50 : 6 + Math.random() * 8,
    p: Math.random() * 6.28,
  }));
}
export function setWeather(kind) {
  state.weather = kind;
  skyKey = '';
  makeWeatherBits();
}

function disc(g, cx, cy, r, color) {
  g.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y) + 0.3);
    g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

function drawSunMoon(g, h, sky) {
  const { W, groundY } = view;
  const arc = (frac) => [
    Math.round(W * 0.12 + frac * W * 0.76),
    Math.round(groundY * 0.24 + (1 - Math.sin(frac * Math.PI)) * groundY * 0.34),
  ];
  const dim = state.weather === 'clear' ? 1 : 0.45;
  if (h >= 5.5 && h <= 19.5) {
    const [x, y] = arc((h - 5.5) / 14);
    g.globalAlpha = dim;
    disc(g, x, y, 5, css(mix(colors.goldLight, colors.paper, 0.2), 0.35));
    disc(g, x, y, 3, css(colors.goldLight));
    g.globalAlpha = 1;
  }
  if (h >= 18 || h <= 6.5) {
    const frac = h >= 18 ? (h - 18) / 12.5 : (h + 6) / 12.5;
    const [x, y] = arc(frac);
    g.globalAlpha = dim * (1 - sky.day * 0.7);
    disc(g, x, y, 3, css(colors.paper));
    g.fillStyle = css(mix(colors.paper, colors.ink, 0.2));
    g.fillRect(x - 1, y - 1, 1, 1);
    g.fillRect(x + 1, y + 1, 1, 1);
    g.globalAlpha = 1;
  }
}

function drawClouds(g, dt, sky) {
  const base = state.weather === 'clear'
    ? mix(colors.paper, colors.night, 0.82 - sky.day * 0.82)
    : mix(mix(colors.paper, colors.ink, 0.35), colors.night, 0.6 - sky.day * 0.5);
  const shade = mix(base, colors.ink, 0.15);
  g.globalAlpha = state.weather === 'clear' ? 0.55 + sky.day * 0.35 : 0.9;
  for (const c of clouds) {
    c.x += c.v * dt;
    if (c.x > view.W + 2) Object.assign(c, makeCloud(-c.w - 2));
    const x = Math.round(c.x);
    const y = Math.round(c.y);
    g.fillStyle = css(base);
    g.fillRect(x, y + 2, c.w, 3);
    g.fillRect(x + 2, y + 1, c.w - 5, 1);
    g.fillRect(x + c.bump, y - 1, 6, 3);
    g.fillStyle = css(shade);
    g.fillRect(x + 1, y + 5, c.w - 2, 1);
  }
  g.globalAlpha = 1;
}

function drawPrecip(g, t, dt) {
  if (!drops.length) return;
  const rain = state.weather === 'rain';
  g.fillStyle = rain ? css(mix(colors.room.study, colors.paper, 0.55), 0.7) : css(colors.paper, 0.9);
  for (const d of drops) {
    d.y += d.v * dt;
    if (rain) d.x -= d.v * 0.25 * dt;
    else d.x += Math.sin(t * 1.3 + d.p) * 4 * dt;
    if (d.y > view.H) { d.y = -3; d.x = Math.random() * (view.W + 20); }
    if (d.x < -2) d.x += view.W + 4;
    if (d.x > view.W + 2) d.x -= view.W + 4;
    const x = Math.round(d.x);
    const y = Math.round(d.y);
    if (rain) { g.fillRect(x, y, 1, 2); g.fillRect(x - 1, y + 2, 1, 1); } else g.fillRect(x, y, 1, 1);
  }
}

// ── 건물 색 (낮 밝기·전체 점등에 따라) ──
let bcKey = '';
let BC = null;
function buildingColors(day, glow) {
  const key = `${Math.round(day * 40)}|${Math.round(glow * 20)}|${state.weather === 'snow'}`;
  if (key === bcKey) return BC;
  bcKey = key;
  const c = colors;
  const wall = mix(mix(c.night, c.paper, 0.2), mix(c.paper, c.ink, 0.16), day);
  const g = (col, k = 0.3) => mix(col, c.gold, glow * k);
  BC = {
    wall: css(g(wall)),
    wallShade: css(g(mix(wall, c.ink, 0.22))),
    base: css(g(mix(wall, c.ink, 0.12))),
    outline: css(mix(mix(c.ink, c.night, 0.4), c.goldLight, glow)),
    roof: css(g(mix(wall, c.ink, 0.38))),
    frame: css(mix(mix(c.ink, c.night, 0.3), c.gold, glow * 0.8)),
    sill: css(mix(wall, c.paper, 0.3)),
    door: css(mix(mix(c.gold, c.ink, 0.55), c.goldLight, (1 - day) * 0.35)),
    lamp: css(mix(mix(c.paper, c.ink, 0.4), c.goldLight, 1 - day)),
    signBg: css(mix(c.night, c.ink, 0.3)),
    signText: css(mix(c.gold, c.goldLight, 1 - day)),
    annex: css(g(mix(wall, c.room.recycle, 0.25))),
    annexRoof: css(mix(c.room.recycle, c.night, 0.25 + (1 - day) * 0.35)),
    grass: css(mix(mix(c.room.recycle, c.paper, state.weather === 'snow' ? 0.75 : 0.08), c.night, 0.78 - day * 0.78)),
    grassDark: css(mix(mix(c.room.recycle, c.ink, 0.3), c.night, 0.7 - day * 0.6)),
    path: css(mix(mix(c.paper, c.ink, 0.28), c.night, 0.7 - day * 0.65)),
    tree: css(mix(mix(c.room.recycle, c.ink, 0.35), c.night, 0.72 - day * 0.6)),
    treeLight: css(mix(c.room.recycle, c.night, 0.7 - day * 0.65)),
    trunk: css(mix(mix(c.gold, c.ink, 0.65), c.night, 0.5 - day * 0.45)),
  };
  state.win.off = mix(mix(c.night, c.ink, 0.25), mix(c.room.study, c.paper, 0.5), day);
  return BC;
}

// 간판 'LnL' 픽셀 글자 (3×5)
const GLYPH = {
  L: ['x..', 'x..', 'x..', 'x..', 'xxx'],
  n: ['...', 'xx.', 'x.x', 'x.x', 'x.x'],
};
function drawGlyph(g, ch, x, y) {
  GLYPH[ch].forEach((row, j) => {
    for (let i = 0; i < 3; i++) if (row[i] === 'x') g.fillRect(x + i, y + j, 1, 1);
  });
}

function drawBuilding(g, b) {
  const { bx, by } = view;
  const R = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(bx + x, by + y, w, h); };

  // 옥상 간판
  R(34, 7, 1, 3, b.outline);
  R(45, 7, 1, 3, b.outline);
  R(32, 0, 16, 7, b.outline);
  R(33, 1, 14, 5, b.signBg);
  g.fillStyle = b.signText;
  drawGlyph(g, 'L', bx + 35, by + 1);
  drawGlyph(g, 'n', bx + 39, by + 1);
  drawGlyph(g, 'L', bx + 43, by + 1);

  // 지붕 난간과 벽
  R(-1, 9, 82, 1, b.outline);
  R(-1, 10, 82, 2, b.roof);
  R(0, 12, 80, 58, b.wall);
  R(76, 12, 4, 58, b.wallShade);
  R(39, 12, 2, 44, b.wallShade);
  for (let f = 1; f <= 4; f++) R(0, FLOOR_TOP + f * FLOOR_H - 1, 80, 1, b.wallShade);
  R(0, 56, 80, 14, b.base);
  R(-1, 12, 1, 58, b.outline);
  R(80, 12, 1, 58, b.outline);

  // 분리수거장 별채
  R(82, 56, 18, 2, b.annexRoof);
  R(83, 58, 16, 12, b.annex);
  R(83, 58, 16, 1, b.annexRoof);
  R(82, 58, 1, 12, b.outline);
  R(99, 58, 1, 12, b.outline);

  // 창틀과 창턱
  for (const w of WINDOWS) {
    R(w.x - 1, w.y - 1, w.w + 2, w.h + 2, b.frame);
    R(w.x - 1, w.y + w.h + 1, w.w + 2, 1, b.sill);
  }

  // 입구·벽등·계단
  R(33, 57, 14, 1, b.roof);
  R(35, 58, 10, 12, b.outline);
  R(36, 59, 8, 11, b.door);
  R(40, 59, 1, 11, b.outline);
  R(33, 60, 1, 2, b.lamp);
  R(46, 60, 1, 2, b.lamp);
  R(34, 69, 12, 1, b.sill);
}

function drawGround(g, b) {
  const { W, H, groundY, bx } = view;
  g.fillStyle = b.grass;
  g.fillRect(0, groundY, W, H - groundY);
  g.fillStyle = b.grassDark;
  for (let x = (bx % 5 + 5) % 5; x < W; x += 5) g.fillRect(x, groundY, 1, 1);
  // 입구에서 내려오는 길
  g.fillStyle = b.path;
  for (let y = 0; y < H - groundY; y++) {
    const half = 6 + Math.floor(y * 0.7);
    g.fillRect(bx + 40 - half, groundY + y, half * 2, 1);
  }
  // 나무
  const tree = (x, small) => {
    const y = groundY;
    const trunk = small ? 4 : 5;
    const crown = small ? 6 : 8;
    g.fillStyle = b.trunk;
    g.fillRect(x, y - trunk, 2, trunk);
    g.fillStyle = b.tree;
    g.fillRect(x - 4, y - trunk - crown, 10, crown);
    g.fillRect(x - 2, y - trunk - crown - 2, 6, 2);
    g.fillStyle = b.treeLight;
    g.fillRect(x - 2, y - trunk - crown + 1, 3, 2);
  };
  tree(bx - 7, false);
  if (bx + BUILDING.w + 11 < W) tree(bx + BUILDING.w + 6, true);
}

function drawHover(g) {
  const z = ZONES.find((z) => z.room === state.hover);
  if (!z) return;
  const { bx, by } = view;
  g.fillStyle = css(colors.room[z.room]);
  g.fillRect(bx + z.x - 1, by + z.y - 1, z.w + 2, 1);
  g.fillRect(bx + z.x - 1, by + z.y + z.h, z.w + 2, 1);
  g.fillRect(bx + z.x - 1, by + z.y, 1, z.h);
  g.fillRect(bx + z.x + z.w, by + z.y, 1, z.h);
}

// ── 한 프레임 그리기: 뒤쪽(하늘~건물) → [lights.js 창문] → 앞쪽(비·눈·호버) ──
export function drawBack(g, t, dt) {
  state.hour = skyHour();
  const sky = weatherTint(skyAt(state.hour));
  state.day = sky.day;
  state.stars = Math.max(0, sky.stars);
  renderSky(sky);
  g.drawImage(skyCanvas, 0, 0);

  if (state.stars > 0.02) {
    g.fillStyle = css(colors.goldLight);
    for (const s of stars) {
      g.globalAlpha = state.stars * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p)));
      g.fillRect(s.x, s.y, 1, 1);
    }
    g.globalAlpha = 1;
  }
  drawSunMoon(g, state.hour, sky);
  drawClouds(g, dt, sky);

  const b = buildingColors(state.day, state.glow);
  drawGround(g, b);
  drawBuilding(g, b);
}

export function drawFront(g, t, dt) {
  drawPrecip(g, t, dt);
  drawHover(g);
}
