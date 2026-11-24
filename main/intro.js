// 첫 방문 인트로 (선택 기능, 초안)
// 흩어진 금박 조각들이 모여 'LnL' 글자가 되고, 글자가 커지며 생활관 장면이 드러난다.
// 다시 보려면 주소 뒤에 ?intro=1 을 붙인다.
const SEEN_KEY = 'lnl-intro-seen';

const GLYPHS = [
  ['x..', 'x..', 'x..', 'x..', 'xxx'],
  ['...', 'xx.', 'x.x', 'x.x', 'x.x'],
  ['x..', 'x..', 'x..', 'x..', 'xxx'],
];

export function playIntro() {
  const LNL = window.LNL;
  const forced = new URLSearchParams(location.search).has('intro');
  if (!forced && (LNL.reduceMotion || LNL.storageGet('localStorage', SEEN_KEY))) return;
  LNL.storageSet('localStorage', SEEN_KEY, '1');

  const wrap = document.createElement('div');
  wrap.className = 'intro';
  const canvas = document.createElement('canvas');
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'lnl-btn lnl-btn--ghost intro__skip';
  skip.textContent = '건너뛰기';
  wrap.append(canvas, skip);
  document.body.appendChild(wrap);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement);
  const gold = cs.getPropertyValue('--gold').trim();
  const goldLight = cs.getPropertyValue('--gold-light').trim();
  const night = cs.getPropertyValue('--night').trim();

  // 글자 칸 (3×5 글자 3개, 사이 1칸 = 11×5)
  const cell = Math.floor(Math.min(w / 15, h / 12, 44));
  const ox = (w - cell * 11) / 2;
  const oy = (h - cell * 5) / 2;
  const tiles = [];
  GLYPHS.forEach((rows, gi) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== 'x') return;
    tiles.push({ tx: ox + (gi * 4 + x) * cell, ty: oy + y * cell });
  })));
  // 글자가 되지 않고 흩어져 사라지는 조각들 (홈페이지 요소가 부서지는 느낌)
  for (let i = 0; i < 40; i++) tiles.push({ tx: null, ty: null });
  for (const t of tiles) {
    t.sx = Math.random() * w;
    t.sy = Math.random() * h;
    t.rot = (Math.random() - 0.5) * 3;
    t.d = Math.random() * 0.4;
    t.mark = Math.random();
  }

  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const start = performance.now();
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    wrap.classList.add('intro--out');
    setTimeout(() => wrap.remove(), 400);
  }
  skip.addEventListener('click', finish);

  function frame(ms) {
    if (done) return;
    const t = (ms - start) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, w, h);

    // 1.8초 뒤부터 글자가 커지며 사라진다
    const zoom = t > 1.8 ? ease(Math.min(1, (t - 1.8) / 0.7)) : 0;
    ctx.translate(w / 2, h / 2);
    ctx.scale(1 + zoom * 7, 1 + zoom * 7);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = 1 - zoom;

    for (const tile of tiles) {
      const p = ease(Math.max(0, Math.min(1, (t - tile.d) / 1.1)));
      let x;
      let y;
      let a = 1;
      if (tile.tx === null) {
        // 흩어지는 조각: 바깥으로 밀려나며 희미해진다
        x = tile.sx + (tile.sx - w / 2) * p * 0.6;
        y = tile.sy + (tile.sy - h / 2) * p * 0.6;
        a = 1 - p;
      } else {
        x = tile.sx + (tile.tx - tile.sx) * p;
        y = tile.sy + (tile.ty - tile.sy) * p;
      }
      const s = cell * (tile.tx === null ? 0.5 : 0.92);
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate(x + s / 2, y + s / 2);
      ctx.rotate(tile.rot * (1 - p));
      ctx.fillStyle = gold;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      if (tile.mark < 0.35) {
        ctx.fillStyle = goldLight;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (t > 2.5) { finish(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
