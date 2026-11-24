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
let panel = null;

// 화면(CSS px) 좌표에 있는 공용 공간 id (두 동 아래 저층부)
export function roomAt(x, y) {
  const lx = x / view.px - view.bx;
  const ly = y / view.px - view.by;
  const z = ZONES.find((z) => lx >= z.x && lx < z.x + z.w && ly >= z.y && ly < z.y + z.h);
  return z ? z.room : null;
}

// 로비 화면의 공용 공간 카드 6장과 앱 고르기 패널을 붙인다.
// 카드 순서는 저층부 왼쪽부터 오른쪽 순서와 같다. 카드를 누르면 그 방의 앱 고르기 패널이 뜬다.
export function mountLobby(list, dialog, { onHover } = {}) {
  panel = dialog;
  for (const z of ZONES) {
    const room = byId[z.room];
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lobby-room';
    btn.style.setProperty('--room', `var(--room-${room.id})`);
    btn.setAttribute('data-lnl-ripple', '');

    const icon = document.createElement('span');
    icon.className = 'lobby-room__icon';
    icon.setAttribute('aria-hidden', 'true');
    const name = document.createElement('strong');
    name.className = 'lobby-room__name';
    name.textContent = room.name;
    const apps = document.createElement('span');
    apps.className = 'lobby-room__apps';
    apps.textContent = room.apps.map((a) => a.title).join(' · ');

    btn.append(icon, name, apps);
    btn.addEventListener('click', () => openRoom(room.id));
    btn.addEventListener('pointerenter', () => onHover && onHover(room.id));
    btn.addEventListener('pointerleave', () => onHover && onHover(null));
    li.appendChild(btn);
    list.appendChild(li);
  }
  if (panel) {
    panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
  }
}

// 방을 누르면 앱 개수와 상관없이 항상 고르기 패널을 띄운다. 앱은 새 탭에서 열린다.
export function openRoom(id) {
  const room = byId[id];
  if (!room) return;
  if (!panel) {
    window.open(room.apps[0].url, '_blank', 'noopener');
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
    li.className = 'room-panel__item';
    // 새 탭 열기는 팝업 차단을 피하려고 진짜 링크(<a target="_blank">)로 만든다
    const link = document.createElement('a');
    link.className = 'room-panel__app';
    link.href = app.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('data-lnl-ripple', '');
    link.textContent = app.title;
    link.addEventListener('click', closePanel);

    // [만든이] 버튼을 누르면 그 자리에 만든 사람 이름이 나온다 (다시 누르면 접힘)
    const maker = document.createElement('button');
    maker.type = 'button';
    maker.className = 'room-panel__maker';
    maker.textContent = '만든이';
    maker.setAttribute('aria-expanded', 'false');
    maker.setAttribute('aria-label', `${app.title} 만든이 보기`);
    maker.addEventListener('click', () => {
      const open = maker.getAttribute('aria-expanded') !== 'true';
      maker.setAttribute('aria-expanded', String(open));
      maker.textContent = open ? app.owner : '만든이';
    });

    li.append(link, maker);
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
