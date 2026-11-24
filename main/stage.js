// 캔버스 준비와 그리기 반복. 메인 화면(index.html)과 발표 화면(live/screen)이 같이 쓴다.
// 작은 캔버스(픽셀 아트)에 장면을 그린 뒤 크게 늘리고, 그 위에 빛 입자를 매끄럽게 그린다.
import * as scene from './scene.js';
import * as lights from './lights.js';

export function createStage(canvas, { onResize } = {}) {
  const ctx = canvas.getContext('2d');
  const low = document.createElement('canvas');
  const g = low.getContext('2d');
  let dpr = 1;
  let raf = 0;
  let last = 0;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    scene.resize(w, h);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    low.width = scene.view.W;
    low.height = scene.view.H;
    if (onResize) onResize();
  }

  function frame(ms) {
    raf = requestAnimationFrame(frame);
    const t = ms / 1000;
    const dt = last ? Math.min(0.1, t - last) : 1 / 60;
    last = t;

    scene.drawBack(g, t, dt);
    lights.drawWindows(g);
    scene.drawFront(g, t, dt);

    const { W, H, px } = scene.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, W * px * dpr, H * px * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lights.drawParticles(ctx, t, dt);
  }

  function start() {
    if (raf || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // 화면이 안 보이면 멈춘다
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  resize();
  return { start, stop, resize };
}
