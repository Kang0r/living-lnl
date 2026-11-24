// 메인 생활관 화면 — 919C·919D동 장면, 호실 불빛, 공용 공간(방 앱)을 한데 묶는다
import * as scene from './scene.js';
import * as lights from './lights.js';
import { mountLobby, roomAt, openRoom } from './rooms.js';
import { startDorms, bindDormForm } from './dorms.js';
import { createStage } from './stage.js';
import { playIntro } from './intro.js';

const LNL = window.LNL;
const $ = (id) => document.getElementById(id);

scene.loadColors();
const canvas = $('scene');
const stage = createStage(canvas, { onResize: placeEnter });
mountLobby($('lobby-rooms'), $('room-panel'), { onHover: (id) => { scene.state.hover = id; } });
stage.start();

// ── 들어가기 버튼: 건물 가운데 문(저층부 x 41~47) 바로 아래 땅에 붙인다 ──
function placeEnter() {
  const { px, bx, by } = scene.view;
  const x = (bx + 44) * px;
  const y = (by + scene.BUILDING.h) * px + 10;
  $('enter-btn').style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translateX(-50%)`;
}
placeEnter();

// ── 로비(공용 공간 6곳 고르기) — 주소 끝 #lobby 로도 바로 열린다. 뒤로 가기로 닫힌다 ──
const lobby = $('lobby');
function showLobby(on) {
  lobby.hidden = !on;
  document.body.classList.toggle('in-lobby', on);
  if (on) lobby.querySelector('.lobby-room').focus({ preventScroll: true });
  else $('enter-btn').focus({ preventScroll: true });
}
// 금박 모자이크로 덮고 → 화면을 바꾸고 → 걷어 낸다
function withMosaic(change) {
  if (LNL.reduceMotion) { change(); return; }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    change();
    veil.remove();
    LNL.mosaic('reveal');
  };
  const veil = LNL.mosaic('cover', finish);
  setTimeout(finish, 800); // 애니메이션이 멈춰도 화면은 꼭 바뀐다
}
function syncLobby() {
  const want = location.hash === '#lobby';
  if (want !== !lobby.hidden) withMosaic(() => showLobby(want));
}
$('enter-btn').addEventListener('click', () => { location.hash = 'lobby'; });
$('lobby-back').addEventListener('click', () => {
  if (history.state && history.state.lnlLobby) history.back();
  else history.replaceState(null, '', location.pathname + location.search);
  syncLobby();
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#lobby') history.replaceState({ lnlLobby: true }, '');
  syncLobby();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lobby.hidden && !document.querySelector('dialog[open]')) $('lobby-back').click();
});
if (location.hash === '#lobby') showLobby(true);

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

// 공용 공간 불빛·입자·호실 불빛 시작
lights.startLights({
  meta: { page: 'main' },
  demoCrowd: 12,
  demoEvents: true,
  onStats: ({ total, dorms, people }) => {
    $('stat-people').textContent = people;
    $('stat-dorms').textContent = dorms;
    $('stat-records').textContent = total;
  },
});
startDorms({ demo: true });
if (LNL.isDemo) $('demo-badge').hidden = false;

// ── 내 방 불 켜기 패널 ──
const dormPanel = $('dorm-panel');
const dormInput = $('dorm-input');
function openDormPanel(prefill = '') {
  dormInput.value = prefill;
  dormInput.dispatchEvent(new Event('input'));
  if (typeof dormPanel.showModal === 'function') dormPanel.showModal();
  else dormPanel.setAttribute('open', '');
  dormInput.focus();
}
function closeDormPanel() {
  if (typeof dormPanel.close === 'function') dormPanel.close();
  else dormPanel.removeAttribute('open');
}
$('dorm-btn').addEventListener('click', () => openDormPanel());
$('dorm-close').addEventListener('click', closeDormPanel);
dormPanel.addEventListener('click', (e) => { if (e.target === dormPanel) closeDormPanel(); });
bindDormForm({
  form: $('dorm-form'),
  input: dormInput,
  preview: $('dorm-preview'),
  onDone: (d) => {
    closeDormPanel();
    toast(`${d.label}에 불이 켜졌어요`);
  },
});

let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

// ── 커서·터치: 입자가 살짝 모이고, 호실 창문이나 공용 공간을 누를 수 있다 ──
const tip = $('dorm-tip');
let touchTimer = 0;
canvas.addEventListener('pointermove', (e) => {
  lights.setPointer(e.clientX, e.clientY, true);
  if (e.pointerType !== 'mouse') return;
  const room = roomAt(e.clientX, e.clientY);
  const win = room ? null : scene.dormWindowAt(e.clientX, e.clientY);
  scene.state.hover = room;
  scene.state.hoverKey = win ? win.key : null;
  canvas.style.cursor = room || win ? 'pointer' : '';
  if (win) {
    tip.textContent = `919${win.dorm}동 ${win.floor * 100 + win.num}호`;
    tip.style.transform = `translate(${e.clientX + 12}px, ${e.clientY - 28}px)`;
    tip.hidden = false;
  } else {
    tip.hidden = true;
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
  scene.state.hoverKey = null;
  tip.hidden = true;
});
canvas.addEventListener('click', (e) => {
  const room = roomAt(e.clientX, e.clientY);
  if (room) { openRoom(room); return; }
  // 호실 창문을 누르면 그 호실 번호가 채워진 채로 패널이 열린다
  const win = scene.dormWindowAt(e.clientX, e.clientY);
  if (win) openDormPanel(String(win.floor * 100 + win.num));
});

// 휴대폰을 기울이면 입자가 그쪽으로 흐른다 (iOS는 버튼으로 권한 요청)
LNL.tilt(({ x, y }) => lights.setTilt(x, y), $('tilt-btn'));

playIntro();
