// 919C·919D동 호실 불빛 — 관객이 자기 호실을 입력하면 그 방 창문에 불이 켜진다.
// 호실 번호 = 층(1~9) + 호수. C동 15~18호, D동 19~22호. 예: 315 → 919C동 3층 15호 ('C315')
// Supabase가 연결되면 dorm_lights 테이블에 오늘 켠 호실을 남기고, 모든 화면이 Realtime으로 받는다.
// 데모 모드에서는 같은 브라우저 탭끼리 Broadcast로 주고받는다.
import { setDorm, clearDorms, dormKeys } from './lights.js';

const LNL = window.LNL;
const MINE_KEY = 'lnl-my-dorms';

// 입력 글자 → { dorm, floor, num, no, key, label } 또는 { error }
export function parseDorm(text) {
  const s = String(text || '')
    .toUpperCase()
    .replace(/\s|-|동|호|층/g, '')
    .replace(/^919(?=[CD])/, '');
  const m = s.match(/^([CD])?(\d)(\d{2})$/);
  if (!m) return { error: '층과 호수를 붙여 세 자리로 써 주세요 (예: 315)' };
  const floor = Number(m[2]);
  const num = Number(m[3]);
  const dorm = num >= 15 && num <= 18 ? 'C' : num >= 19 && num <= 22 ? 'D' : null;
  if (floor < 1 || floor > 9) return { error: '층은 1층부터 9층까지 있어요' };
  if (!dorm) return { error: '호수는 C동 15~18호, D동 19~22호만 있어요' };
  if (m[1] && m[1] !== dorm) return { error: `${num}호는 919${dorm}동에 있어요` };
  const no = floor * 100 + num;
  return { dorm, floor, num, no, key: `${dorm}${no}`, label: `919${dorm}동 ${no}호` };
}

function readMine() {
  try {
    const v = JSON.parse(LNL.storageGet('localStorage', MINE_KEY) || 'null');
    return v && v.date === LNL.kstNow().dateKey && Array.isArray(v.keys) ? v.keys : [];
  } catch (e) {
    return [];
  }
}
const mine = new Set();
function saveMine() {
  LNL.storageSet('localStorage', MINE_KEY, JSON.stringify({ date: LNL.kstNow().dateKey, keys: [...mine] }));
}
const validKey = (key) => typeof key === 'string' && parseDorm(key).key === key;

// 오늘 켜진 호실을 불러오고, 새로 켜지는 호실을 받는다.
// demo: 데모 모드일 때 가짜 호실 불빛을 몇 개 켜 두고 가끔 하나씩 더 켠다 (메인 화면용)
export function startDorms({ demo = false } = {}) {
  readMine().forEach((k) => mine.add(k));
  let dateKey = LNL.kstNow().dateKey;
  let client = null;

  async function load() {
    clearDorms();
    client = await LNL.client();
    if (client) {
      const { data } = await client
        .from('dorm_lights')
        .select('dorm, room_no')
        .gte('created_at', LNL.kstMidnightISO())
        .limit(2000);
      (data || []).forEach((r) => {
        const key = `${r.dorm}${r.room_no}`;
        setDorm(key, { mine: mine.has(key) });
      });
      return;
    }
    mine.forEach((k) => setDorm(k, { mine: true }));
    if (demo) {
      const all = dormKeys();
      for (let i = 0; i < 14; i++) setDorm(all[Math.floor(Math.random() * all.length)]);
    }
  }

  load().then(() => {
    if (client) {
      client.channel('lnl-dorms')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dorm_lights' }, (p) => {
          const key = `${p.new.dorm}${p.new.room_no}`;
          setDorm(key, { flash: true, mine: mine.has(key) });
        })
        .subscribe();
    }
  });

  if (LNL.isDemo) {
    LNL.live('lnl-live').on('dorm', ({ key }) => { if (validKey(key)) setDorm(key, { flash: true }); });
    if (demo) {
      const tick = () => {
        if (!document.hidden) {
          const all = dormKeys();
          setDorm(all[Math.floor(Math.random() * all.length)], { flash: true });
        }
        setTimeout(tick, 9000 + Math.random() * 9000);
      };
      setTimeout(tick, 5000);
    }
  }

  // 자정(KST)이 지나면 오늘 불빛을 새로 시작한다
  setInterval(() => {
    const k = LNL.kstNow().dateKey;
    if (k === dateKey) return;
    dateKey = k;
    mine.clear();
    load();
  }, 60e3);
}

// 내 호실에 불 켜기. 성공하면 true
export async function lightDorm(d) {
  mine.add(d.key);
  saveMine();
  setDorm(d.key, { flash: true, mine: true });
  const client = await LNL.client();
  if (client) {
    const { error } = await client.from('dorm_lights').insert({ dorm: d.dorm, room_no: d.no });
    return !error;
  }
  LNL.live('lnl-live').send('dorm', { key: d.key });
  return true;
}

// 호실 입력 폼 연결 (메인 화면 패널, 관객 휴대폰 화면이 같이 쓴다)
// onDone(d): 불을 켠 뒤 호출. 입력 중에는 preview에 '919C동 315호' 또는 안내 문구를 보여 준다.
export function bindDormForm({ form, input, preview, onDone }) {
  const show = () => {
    const v = input.value.trim();
    if (v.length < 3) { preview.textContent = ''; preview.dataset.state = ''; return; }
    const d = parseDorm(v);
    preview.textContent = d.error || `${d.label}에 불을 켭니다`;
    preview.dataset.state = d.error ? 'error' : 'ok';
  };
  input.addEventListener('input', show);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = parseDorm(input.value);
    if (d.error) {
      preview.textContent = d.error;
      preview.dataset.state = 'error';
      input.focus();
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    const ok = await lightDorm(d);
    if (submit) setTimeout(() => { submit.disabled = false; }, 1500);
    if (!ok) {
      preview.textContent = '잠시 뒤 다시 시도해 주세요';
      preview.dataset.state = 'error';
      return;
    }
    input.value = '';
    show();
    if (onDone) onDone(d);
  });
}
