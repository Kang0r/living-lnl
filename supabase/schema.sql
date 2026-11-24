-- 살아있는 생활관 — Supabase 초안 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 한 번 실행한다. (총괄만)
-- anon(로그인 없는 방문자)은 events·pieces에 추가와 읽기만 할 수 있다. 수정·삭제 정책은 만들지 않는다.

-- 모든 방 앱의 기록 → 메인 창문 불빛
create table if not exists public.events (
  id bigint generated always as identity primary key,
  room text not null check (room in ('cafeteria', 'meetup', 'study', 'recycle', 'wall', 'lounge')),
  action text not null check (char_length(action) between 1 and 40),
  created_at timestamptz not null default now()
);
create index if not exists events_room_created_idx on public.events (room, created_at desc);

-- 기록의 벽·관객 참여 '한 줄 남기기'
create table if not exists public.pieces (
  id bigint generated always as identity primary key,
  mood text check (char_length(mood) <= 10),
  weather text check (weather in ('clear', 'cloudy', 'rain', 'snow')),
  text text not null check (char_length(text) between 1 and 60),
  created_at timestamptz not null default now()
);

-- 919C·919D동 호실 불빛 (관객이 입력한 호실, 오늘 것만 화면에 켠다)
-- C동: 층(1~9) + 15~18호, D동: 층(1~9) + 19~22호. 이름 등 다른 정보는 저장하지 않는다.
create table if not exists public.dorm_lights (
  id bigint generated always as identity primary key,
  dorm text not null check (dorm in ('C', 'D')),
  room_no int not null check (
    room_no / 100 between 1 and 9 and (
      (dorm = 'C' and room_no % 100 between 15 and 18) or
      (dorm = 'D' and room_no % 100 between 19 and 22)
    )
  ),
  created_at timestamptz not null default now()
);
create index if not exists dorm_lights_created_idx on public.dorm_lights (created_at desc);

-- 밥약 광장 (끼리 앱과 열 이름을 맞춰 확정할 것)
create table if not exists public.meetups (
  id bigint generated always as identity primary key,
  menu text,
  place text,
  time timestamptz,
  max_people int check (max_people between 2 and 20),
  joined int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.pieces enable row level security;
alter table public.meetups enable row level security;
alter table public.dorm_lights enable row level security;

drop policy if exists "events 읽기" on public.events;
drop policy if exists "events 추가" on public.events;
create policy "events 읽기" on public.events for select to anon using (true);
create policy "events 추가" on public.events for insert to anon with check (true);

drop policy if exists "pieces 읽기" on public.pieces;
drop policy if exists "pieces 추가" on public.pieces;
create policy "pieces 읽기" on public.pieces for select to anon using (true);
create policy "pieces 추가" on public.pieces for insert to anon with check (true);

drop policy if exists "dorm_lights 읽기" on public.dorm_lights;
drop policy if exists "dorm_lights 추가" on public.dorm_lights;
create policy "dorm_lights 읽기" on public.dorm_lights for select to anon using (true);
create policy "dorm_lights 추가" on public.dorm_lights for insert to anon with check (true);

-- meetups: 읽기·추가만 우선 허용. '참여(joined + 1)'는 끼리 앱 담당과 상의해 함수(RPC)로 만든다.
drop policy if exists "meetups 읽기" on public.meetups;
drop policy if exists "meetups 추가" on public.meetups;
create policy "meetups 읽기" on public.meetups for select to anon using (true);
create policy "meetups 추가" on public.meetups for insert to anon with check (true);

-- 새 기록을 Realtime으로 받기 (메인 창문 반짝임, 호실 불빛, 기록의 벽)
alter publication supabase_realtime add table public.events, public.pieces, public.dorm_lights;
