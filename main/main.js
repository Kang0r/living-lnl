// 메인 생활관 화면 — 장면·불빛·방을 한데 묶는다
import * as scene from './scene.js';
import * as lights from './lights.js';
import { mountRooms, layoutRooms, roomAt, openRoom } from './rooms.js';
import { createStage } from './stage.js';
import { playIntro } from './intro.js';

const LNL = window.LNL;
const $ = (id) => document.getElementById(id);

scene.loadColors();
const canvas = $('scene');
const stage = createStage(canvas, { onResize: layoutRooms });
mountRooms($('room-tags'), $('room-panel'), { onHover: (id) => { scene.state.hover = id; } });
stage.start();

// 시각·하늘 단계·날씨
function paintClock() {
  const n = LNL.kstNow();
  $('clock').textContent = `${String(n.hour).padStart(2, '0')}:${String(n.minute).padStart(2, '0')}`;
  $('phase').textContent = scene.phaseName(scene.skyHour());
}
paintClock();
setInterval(paintClock, 20e3);
LNL.weather().then((w) => {
  scene.setWeather(w.kind);
  $('weather').textContent = w.label + (w.temp === null ? '' : ` ${w.temp}°`);
});

// 창문 불빛·입자 시작
lights.startLights({
  meta: { page: 'main' },
  demoCrowd: 12,
  demoEvents: true,
  onStats: ({ total, people }) => {
    $('stat-people').textContent = people;
    $('stat-records').textContent = total;
  },
});
if (LNL.isDemo) $('demo-badge').hidden = false;

// 커서·터치: 입자가 살짝 모이고, 방을 누르면 들어간다
let touchTimer = 0;
canvas.addEventListener('pointermove', (e) => {
  lights.setPointer(e.clientX, e.clientY, true);
  if (e.pointerType === 'mouse') {
    const room = roomAt(e.clientX, e.clientY);
    scene.state.hover = room;
    canvas.style.cursor = room ? 'pointer' : '';
  }
});
canvas.addEventListener('pointerdown', (e) => {
  clearTimeout(touchTimer);
  lights.setPointer(e.clientX, e.clientY, true);
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse') touchTimer = setTimeout(() => lights.setPointer(0, 0, false), 1200);
});
canvas.addEventListener('pointerleave', () => {
  lights.setPointer(0, 0, false);
  scene.state.hover = null;
});
canvas.addEventListener('click', (e) => {
  const room = roomAt(e.clientX, e.clientY);
  if (room) openRoom(room);
});

// 휴대폰을 기울이면 입자가 그쪽으로 흐른다 (iOS는 버튼으로 권한 요청)
LNL.tilt(({ x, y }) => lights.setTilt(x, y), $('tilt-btn'));

playIntro();
