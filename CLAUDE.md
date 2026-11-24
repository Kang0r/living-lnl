# 살아있는 생활관 — LnL 통합 웹

> 이 파일은 Claude Code가 작업할 때 먼저 읽는 프로젝트 설명서입니다. 저장소 최상위 폴더에 두세요.
> `( )`로 표시된 값은 아직 정해지지 않은 자리입니다. 정해지면 이 파일을 먼저 고친 뒤 작업하세요.

## 1. 프로젝트 한 줄 요약

서울대 관악학생생활관 LnL 학생자율세미나 021(바이브코딩: AI와 함께 만드는 웹/미디어아트)의 기말 결과물이다.
LnL 생활관을 미디어아트로 그린 **메인 화면** 안에 조원들이 만든 웹앱 9개를 **'방'** 으로 연결한다.
방에서 사람들이 무언가를 하면 그 기록이 메인 화면 생활관의 **창문 불빛**이 된다.

- 기말학술제 발표·배포: **2026-12-08**
- 통합 리허설: 2026-12-01
- 사용자: LnL 생활관 주민(대부분 휴대폰으로 접속), 학술제 관객

## 2. 이 저장소가 맡는 범위

이 저장소는 **메인 웹**만 담는다. 방 앱 9개는 각자 따로 배포돼 있고, 메인에서 링크로 연결한다.

| 이 저장소에 있는 것 | 이 저장소에 없는 것 |
|---|---|
| 메인 생활관 장면 (`index.html`) | 방 앱 9개의 코드 (각 조원 저장소) |
| 공통 파일 `shared/design.css`, `shared/lnl.js` — 방 앱들이 절대 주소로 불러감 | |
| 관객 참여 모드 `/live`, `/live/screen` | |
| API 키가 필요한 서버 함수 `/api` (Vercel 함수) | |

**주의:** `shared/` 파일은 외부의 방 앱 9개가 불러간다. 함수 이름이나 CSS 변수 이름을 바꾸면 9개 앱이 한꺼번에 깨진다. 기존 이름은 바꾸지 말고 새로 추가만 할 것.

## 3. 기술 스택과 규칙

- **빌드 도구 없음.** 순수 HTML / CSS / JavaScript(ES 모듈). npm 빌드, React, 번들러를 쓰지 않는다.
- 외부 라이브러리는 CDN에서 **버전을 고정해** 불러온다.
  - 예: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm`
- 배포: GitHub 저장소 → **Vercel** (main에 합치면 실제 사이트에 자동 배포, PR마다 미리보기 링크 생성)
- 데이터: **Supabase** 프로젝트 1개
- 메인 장면 그래픽: `<canvas>` 2D 또는 SVG. WebGL은 꼭 필요할 때만 쓴다.
- **모바일 우선:** 폭 360px 휴대폰에서 먼저 확인하고, PC에서는 가운데 정렬한다.
- 성능: 저사양 휴대폰에서도 30fps 이상. 입자는 최대 200개. 화면이 안 보일 때(`document.hidden`)는 애니메이션을 멈춘다.
- 접근성: `prefers-reduced-motion`이면 입자 움직임과 전환 효과를 줄인다.

## 4. 폴더 구조

```
/index.html              메인 생활관 장면
/main/scene.js           건물·하늘·날씨 그리기 (윤예영)
/main/lights.js          창문 불빛·빛 입자 (백경동)
/main/rooms.js           방 목록과 링크, 클릭 영역
/main/dorms.js           호실 번호 해석·호실 불빛 저장과 동기화
/main/stage.js           캔버스 준비·그리기 반복 (메인·발표 화면 공용)
/main/main.js            메인 화면 진입 스크립트 (장면·불빛·방 연결)
/main/main.css           메인·발표 화면 스타일
/main/intro.js           첫 방문 인트로 (선택)
/shared/design.css       색·글꼴·공통 스타일 (방 앱들도 사용)
/shared/lnl.js           LNL.header(), LNL.emit(), LNL.go() (방 앱들도 사용)
/live/index.html         관객 휴대폰 화면 (김규호)
/live/screen/index.html  발표 화면 (김규호)
/api/                    API 키가 필요한 Vercel 함수
/assets/                 이미지·소리
/supabase/schema.sql     테이블·RLS·Realtime 설정 SQL (총괄)
/examples/room.html      방 앱 연결 예시
```

각자 맡은 파일만 고친다. `shared/` 수정은 총괄(강현서(전기))만 한다.

## 5. 메인 화면 사양

### 5-1. 생활관 건물
- 그림 스타일은 **픽셀 아트**이다. (작은 논리 해상도에 그린 뒤 정수배로 키운다)
- LnL 생활관 **919C동(왼쪽)과 919D동(오른쪽)** 두 동을 나란히 그린다. 두 동 모두 1~9층이다.
  - 층마다 방 4개가 나란히 있다. C동은 15·16·17·18호, D동은 19·20·21·22호.
  - 호실 번호 = 층 + 호수. 예: 315 = 919C동 3층 15호, 919 = 919D동 9층 19호. 코드 안의 key는 `'C315'`.
  - 옥상에 '919C'·'919D' 간판, 건물 옆에 층 번호를 둔다.
- 두 동 아래를 잇는 **저층부**에 공용 공간 6곳(식당·밥약 광장·스터디룸 | 입구 | 라운지·기록의 벽·분리수거장)이 있고, 이곳이 방 앱으로 들어가는 곳이다.
  - 저층부 칸이나 화면 아래 공용 공간 버튼을 누르면 앱 선택 패널이 뜨고, 고른 앱은 새 탭에서 열린다.
- 창문 좌표는 `main/scene.js`에서 `WINDOWS` 배열로 내보낸다. `lights.js`가 이 좌표를 쓴다.
  - 형식: `{ room: 'cafeteria', x, y, w, h }` — 호실 창문은 `room: 'dorm'`에 `key, dorm, floor, num`이 더 붙는다.

### 5-2. 시간과 날씨
- 실제 시각(Asia/Seoul)에 따라 하늘이 4단계로 바뀐다.
  - 새벽 05–07시
  - 낮 07–17시
  - 노을 17–19시
  - 밤 19–05시
- 단계가 바뀔 때는 색이 부드럽게 넘어가게 한다.
- 날씨는 Open-Meteo API를 쓴다. 키가 필요 없다. 관악캠퍼스 근처 좌표 위도 37.46, 경도 126.95로 현재 날씨를 받는다.
  - 맑음 / 흐림 / 비 / 눈 효과를 덧입힌다.
  - API가 실패하면 맑음으로 둔다.

### 5-3. 창문 불빛
- **호실 불빛:** 관객이 '내 방 불 켜기'에 자기 호실 번호를 넣으면 그 호실 창문이 금빛으로 반짝이며 켜진다.
  - 메인 화면(아래 버튼 또는 호실 창문을 눌러서)과 `/live` 휴대폰 화면 모두에서 입력할 수 있다.
  - `dorm_lights` 테이블에 남기고 Realtime으로 모든 화면에 퍼진다. 오늘(KST 0시 이후) 것만 켠다.
  - 내가 켠 방은 내 기기에서 금빛 테두리로 표시한다 (`localStorage`, 하루 단위).
- **공용 공간 불빛:** Supabase `events` 테이블에서 **오늘(KST 0시 이후)** 기록 수를 방별로 센다.
- 공용 공간마다 창문 N개(지금 2개)가 있다. 켜지는 개수 = `min(N, ceil(오늘 기록 수 / K))`. K는 ( 기본 3 ).
- 불빛 색은 그 방의 색(`--room-*`)과 `--gold-light`를 섞는다.
- 새 기록이 들어오면 Supabase Realtime으로 받아서 해당 방 창문 하나를 반짝이며 켠다.

### 5-4. 빛 입자
- 지금 접속한 사람 수만큼 금빛 입자(`--gold-light`)가 건물 주위를 떠다닌다. 최대 200개.
- 접속자 수는 Realtime Presence 채널 `lnl-presence`로 센다.
- 입자는 직선이 아니라 **소용돌이 궤적**으로 움직인다. 클림트의 소용돌이 문양이 모티프다.
- 커서·터치 위치로 입자가 살짝 모이고, 휴대폰을 기울이면(`deviceorientation`) 그쪽으로 흐른다.
  - iOS는 버튼을 눌렀을 때 권한을 요청한다.

### 5-5. 인트로 (선택)
- 첫 방문 때만 LnL 홈페이지 요소가 흩어지며 'LnL' 글자가 되고, 이어서 생활관으로 확대된다.
- 건너뛰기 버튼을 둔다.
- 다시 보지 않도록 `localStorage`에 기록한다. 읽기·쓰기는 try/catch로 감싼다.

## 6. 방 목록

`main/rooms.js`에서 아래 데이터를 한 곳에 관리한다. 주소가 바뀌면 여기만 고친다.

| 방 id | 방 이름 | 앱 | 담당 | 주소 |
|---|---|---|---|---|
| cafeteria | 식당 | 오늘 뭐먹지? | 조민경 | https://joemg1011.github.io/mysnu-meal-recommender/ |
| meetup | 밥약 광장 | 끼리 | 김동진 | https://ssdongjin.github.io/kkiri/ |
| meetup | 밥약 광장 | 모아 | 이수민 | https://chomio.github.io/moa-decision-helper/ |
| meetup | 밥약 광장 | midpoint-meet | 이수민 | https://midpoint-meet.snu-chatgpt-5678.chatgpt.site |
| study | 스터디룸 | 틈 · 스터디 플래너 | 서재엽 | https://sjy5627476-create.github.io/teum-study-planner/ |
| study | 스터디룸 | 비교과지니 | 강현서(첨융) | https://kelvin2008-a11y.github.io/bgg-gini/ |
| recycle | 분리수거장 | 분리수거 도우미 | 김한결 | https://poetic-sherbet-abd6cb.netlify.app/ |
| wall | 기록의 벽 | 오늘의 조각 | 이지민 | https://pieces-of-today.vercel.app/ |
| lounge | 라운지 | My Mix | 김성민 | https://my-mix-player.snu-chatgpt-5678.chatgpt.site/ |

- 어느 방이든(앱이 하나뿐인 방도) 방을 누르면 앱을 고르는 작은 패널을 띄운다.
- 메인 화면에서 방 앱은 **새 탭**에서 연다 (`<a target="_blank" rel="noopener">`). 메인 생활관은 원래 탭에 그대로 남는다.
- `LNL.go(url)`(금박 전환 후 같은 탭에서 이동)은 방 앱의 [생활관으로] 버튼 등에서 쓴다.

## 7. 디자인 규칙

### 색 (`shared/design.css`의 CSS 변수)

| 변수 | 값 | 쓰임 |
|---|---|---|
| `--night` | #141A2E | 메인 장면 바탕, 밤하늘 |
| `--paper` | #F6F1E6 | 방 페이지 바탕 |
| `--ink` | #22201C | 본문 글자 |
| `--gold` | #C9A24A | 버튼, 강조, 전환 모자이크 |
| `--gold-light` | #F2D58A | 창문 불빛, 빛 입자 |
| `--room-cafeteria` | #E07A5F | 식당 |
| `--room-meetup` | #F2A65A | 밥약 광장 |
| `--room-study` | #5B8DEF | 스터디룸 |
| `--room-recycle` | #6BAA75 | 분리수거장 |
| `--room-wall` | #B07BD9 | 기록의 벽 |
| `--room-lounge` | #4FB3BF | 라운지 |

- 새 색을 만들지 말고 위 변수만 쓴다.
- 글꼴: 메인 생활관·관객 참여 화면은 픽셀 글꼴 **갈무리**(본문 Galmuri11, 제목 Galmuri14 — `--lnl-font-pixel`, `--lnl-font-pixel-title`).
  방 앱 공통(`--lnl-font-body`, `--lnl-font-title`)은 본문 Pretendard, 제목 Noto Serif KR 그대로 둔다.
- 모서리 8px, 그림자는 아주 옅게
- 장식 문양은 두 가지만 쓴다: 사각·원 **모자이크**, **소용돌이** 곡선
- 콘셉트: 빛의 시어터 《클림트, 골드 인 모션》처럼 어두운 바탕 위로 금빛이 흐르고 금박 문양이 움직이며 장면이 바뀐다.

### 움직임
- 방 이동 전환: 금박 모자이크 타일이 0.3초 동안 화면을 덮고, 0.3초 동안 걷힌다.
- 버튼을 누르면 누른 자리에서 작은 금빛 퍼짐이 일어난다.

### 쓰지 않는 것
- 네온 색, 보라·파랑 그라데이션 같은 AI 기본 스타일
- 이모지 아이콘
- 영어 위주 문구 (화면 글은 한국어)

## 8. `shared/lnl.js` API

방 앱들이 이 함수들을 쓰므로 **이름과 인자를 바꾸지 않는다.**

```js
LNL.header(roomName)
// 페이지 맨 위에 공통 상단바를 넣는다:
// [생활관으로] 버튼 · 방 이름 · 현재 시각과 날씨
// 방 색은 data-room 속성 또는 roomName으로 정한다.

LNL.emit(room, action)
// events 테이블에 한 줄 기록한다. 실패해도 앱 동작을 막지 않는다 (조용히 무시).
// room: 'cafeteria' | 'meetup' | 'study' | 'recycle' | 'wall' | 'lounge'
// action: 짧은 영문 소문자 (예: 'view_menu', 'join', 'start_timer', 'search', 'post_piece', 'play')

LNL.go(url)
// 금박 전환 효과 후 url로 이동한다.
```

- `lnl.js`는 외부 사이트에서 `<script src="https://(통합 사이트 주소)/shared/lnl.js">`로 불러가므로 **ES 모듈이 아닌 일반 스크립트**로 만들고 `window.LNL`에 붙인다.
- Supabase 클라이언트는 `lnl.js` 안에서 동적 `import()`로 불러온다.

## 9. Supabase

- URL: ( Supabase 프로젝트 URL )
- anon 키: ( anon 공개 키 ) — 공개해도 되는 키다. `lnl.js`에 넣는다.
- service_role 키는 **절대 코드에 넣지 않는다.**

| 테이블 | 열 | 쓰는 곳 |
|---|---|---|
| dorm_lights | id, dorm('C'·'D'), room_no(예: 315), created_at | 호실 불빛 (메인·관객 참여 모드) |
| events | id, room, action, created_at | 모든 방 앱이 기록 → 메인 창문 불빛 |
| pieces | id, mood, weather, text, created_at | 기록의 벽, 관객 참여 모드 |
| meetups | id, menu, place, time, max_people, joined, created_at | 밥약 광장 |

| Realtime 채널 | 용도 |
|---|---|
| `lnl-presence` | 접속자 수 (Presence) |
| `lnl-live` | 관객 '불 켜기'·'응원' 신호 (Broadcast) |

- RLS(행 수준 보안)를 켠다. anon은 `events`·`pieces`·`dorm_lights`에 **추가와 읽기만** 할 수 있고, 수정·삭제는 막는다.
- 테이블과 채널을 새로 만들거나 바꿔야 하면 총괄에게 요청한다.

## 10. 관객 참여 모드

- `/live/screen` (발표용 큰 화면)
  - 큰 생활관 장면과 `/live` 접속용 QR 코드를 띄운다.
- `/live` (관객 휴대폰)
  - 접속하면 내 빛 하나가 건물로 날아간다. Presence에 참여한다.
  - **내 방 불 켜기**: 호실 번호를 넣으면 발표 화면의 그 호실 창문이 켜진다.
  - 버튼 세 개: **불 켜기**, **한 줄 남기기**(pieces에 기록), **응원**
  - 휴대폰을 기울이면 내 빛이 움직인다.
- **클라이맥스:** 발표자가 `/live/screen`에서 '전체 점등' 단계를 켠 상태에서 관객 모두가 '불 켜기'를 누르면, 건물 전체가 금빛으로 점등된다.
- 목표: 휴대폰 15대 이상이 동시에 접속해도 끊기지 않을 것

## 11. 개인정보와 보안

- 로그인 없이 익명으로 쓴다. 이름·학번·연락처를 입력받지 않는다.
- 호실 번호는 관객이 스스로 넣을 때만 저장하고, 누가 넣었는지는 남기지 않는다.
- API 키(AI, 식단 등)는 Vercel 환경 변수에 두고 `/api` 함수에서만 쓴다. 프런트엔드 코드에 키를 넣지 않는다.
- 사용자가 남긴 글(`pieces.text`)은 화면에 넣을 때 `textContent`로 넣는다. `innerHTML`은 쓰지 않는다.
- 한 줄 남기기는 최대 60자로 제한한다.

## 12. 협업 방식

- main에 직접 푸시하지 않는다. 브랜치를 만들어 작업하고 PR을 올린다.
  - 브랜치 이름 예: `scene/sky`, `lights/particles`, `live/phone`, `shared/header`
  - `main/…`으로 시작하는 이름은 `main` 브랜치와 겹쳐 git이 만들 수 없으니 쓰지 않는다.
- 작업 시작 전에 항상 main 최신 내용을 받는다.
- PR에는 무엇을 바꿨는지와 Vercel 미리보기 링크를 적는다. 병합은 총괄이 한다.
- 버그는 GitHub Issues에 올린다. 고치는 PR에 `Fixes #번호`를 적는다.

### 담당

| 사람 | 맡은 부분 |
|---|---|
| 강현서(전기) | 총괄, `shared/`, `rooms.js`, Supabase, 병합·배포 |
| 서정우 | 금박 전환 효과(`LNL.go`), 디자인 검수 |
| 윤예영 | `main/scene.js` 건물·하늘·날씨 |
| 백경동 | `main/lights.js` 창문 불빛·빛 입자 |
| 김규호 | `/live`, `/live/screen` 관객 참여 모드 |
| 김율건 | 사용자 테스트, Issues 관리, 발표 자료 |

## 13. Claude Code 작업 원칙

- 요청받은 파일과 기능만 고친다. 관련 없는 파일을 정리하거나 다시 짜지 않는다.
- `shared/`의 기존 함수·변수 이름은 바꾸지 않는다. 방 앱 9개가 쓰고 있다.
- 새 기능은 작은 단계로 나누어 만든다. 단계마다 무엇을 확인하면 되는지 알려 준다.
- 숫자나 동작을 확인할 수 있는 방법을 같이 제시한다. 예: "콘솔에서 `LNL.emit('cafeteria','test')`를 실행하면 식당 창문이 하나 켜진다"
- 휴대폰 화면(360px)에서 깨지지 않는지 항상 고려한다.
- 화면 문구, 주석, 커밋 메시지는 한국어로 쓴다.
- 확정되지 않은 값(`( )` 표시)이 필요하면 추측하지 말고 먼저 물어본다.
