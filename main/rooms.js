// 방 목록과 링크, 클릭 영역 — 방 앱 주소가 바뀌면 이 파일의 ROOMS만 고친다.
import { ZONES, view } from './scene.js';

export const ROOMS = [
  {
    id: 'cafeteria',
    name: '식당',
    apps: [
      { title: '오늘 뭐먹지?', owner: '조민경', url: 'https://joemg1011.github.io/mysnu-meal-recommender/' },
    ],
  },
  {
    id: 'meetup',
    name: '밥약 광장',
    apps: [
      { title: '끼리', owner: '김동진', url: 'https://ssdongjin.github.io/kkiri/' },
      { title: '모아', owner: '이수민', url: 'https://chomio.github.io/moa-decision-helper/' },
      { title: 'midpoint-meet', owner: '이수민', url: 'https://midpoint-meet.snu-chatgpt-5678.chatgpt.site' },
    ],
  },
  {
    id: 'study',
    name: '스터디룸',
    apps: [
      { title: '틈 · 스터디 플래너', owner: '서재엽', url: 'https://sjy5627476-create.github.io/teum-study-planner/' },
      { title: '비교과지니', owner: '강현서(첨융)', url: 'https://kelvin2008-a11y.github.io/bgg-gini/' },
    ],
  },
  {
    id: 'recycle',
    name: '분리수거장',
    apps: [
      { title: '분리수거 도우미', owner: '김한결', url: 'https://poetic-sherbet-abd6cb.netlify.app/' },
    ],
  },
  {
    id: 'wall',
    name: '기록의 벽',
    apps: [
      { title: '오늘의 조각', owner: '이지민', url: 'https://pieces-of-today.vercel.app/' },
    ],
  },
  {
    id: 'lounge',
    name: '라운지',
    apps: [
      { title: 'My Mix', owner: '김성민', url: 'https://my-mix-player.snu-chatgpt-5678.chatgpt.site/' },
    ],
  },
];

const byId = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
let tagLayer = null;
let panel = null;
const tags = new Map();

// 화면(CSS px) 좌표에 있는 방 id
export function roomAt(x, y) {
  const lx = x / view.px - view.bx;
  const ly = y / view.px - view.by;
  const z = ZONES.find((z) => lx >= z.x && lx < z.x + z.w && ly >= z.y && ly < z.y + z.h);
  return z ? z.room : null;
}

// 방 이름표(키보드로도 누를 수 있는 버튼)와 앱 고르기 패널을 붙인다
export function mountRooms(layer, dialog, { onHover } = {}) {
  tagLayer = layer;
  panel = dialog;
  for (const room of ROOMS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'room-tag';
    btn.style.setProperty('--room', `var(--room-${room.id})`);
    btn.textContent = room.name;
    btn.setAttribute('aria-label', `${room.name} — ${room.apps.map((a) => a.title).join(', ')}`);
    btn.addEventListener('click', () => openRoom(room.id));
    btn.addEventListener('pointerenter', () => onHover && onHover(room.id));
    btn.addEventListener('pointerleave', () => onHover && onHover(null));
    btn.addEventListener('focus', () => onHover && onHover(room.id));
    btn.addEventListener('blur', () => onHover && onHover(null));
    layer.appendChild(btn);
    tags.set(room.id, btn);
  }
  if (panel) {
    panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
  }
  layoutRooms();
}

// 화면 크기가 바뀌면 이름표 위치를 다시 잡는다
// 넓은 화면: 건물 바깥에 층 높이 가운데로 / 좁은 휴대폰: 건물 안 층 경계선 위에 작게
export function layoutRooms() {
  if (!tagLayer) return;
  const { px, bx, by } = view;
  const outside = bx * px >= 110;
  for (const z of ZONES) {
    const btn = tags.get(z.room);
    if (!btn) continue;
    let x;
    let y;
    let shift;
    if (outside) {
      const right = z.x > 40;
      x = right ? (bx + z.x + z.w + 2) * px : (bx + z.x - 2) * px;
      y = (by + z.y + z.h / 2) * px;
      shift = right ? 'translateY(-50%)' : 'translate(-100%, -50%)';
    } else {
      x = (bx + z.x + 1) * px;
      y = (by + z.y) * px;
      shift = 'translateY(-50%)';
    }
    // 건물 왼쪽에 붙는 이름표는 방 색 띠를 건물 쪽(오른쪽)에 둔다
    btn.classList.toggle('room-tag--flip', outside && z.x <= 40);
    btn.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) ${shift}`;
  }
}

export function openRoom(id) {
  const room = byId[id];
  if (!room) return;
  if (room.apps.length === 1 || !panel) {
    window.LNL.go(room.apps[0].url);
    return;
  }
  panel.replaceChildren();
  panel.style.setProperty('--room', `var(--room-${room.id})`);

  const head = document.createElement('div');
  head.className = 'room-panel__head';
  const title = document.createElement('h2');
  title.className = 'room-panel__title';
  title.textContent = room.name;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'room-panel__close';
  close.textContent = '닫기';
  close.addEventListener('click', closePanel);
  head.append(title, close);

  const hint = document.createElement('p');
  hint.className = 'room-panel__hint';
  hint.textContent = '들어갈 앱을 고르세요';

  const list = document.createElement('ul');
  list.className = 'room-panel__list';
  for (const app of room.apps) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'room-panel__app';
    btn.setAttribute('data-lnl-ripple', '');
    const name = document.createElement('strong');
    name.textContent = app.title;
    const owner = document.createElement('span');
    owner.textContent = app.owner;
    btn.append(name, owner);
    btn.addEventListener('click', () => {
      closePanel();
      window.LNL.go(app.url);
    });
    li.appendChild(btn);
    list.appendChild(li);
  }
  panel.append(head, hint, list);
  if (typeof panel.showModal === 'function') panel.showModal();
  else panel.setAttribute('open', '');
}

function closePanel() {
  if (!panel) return;
  if (typeof panel.close === 'function') panel.close();
  else panel.removeAttribute('open');
}
