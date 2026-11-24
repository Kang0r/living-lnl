# 살아있는 생활관 — LnL 통합 웹 (초안)

관악학생생활관 LnL 학생자율세미나 021 기말 결과물의 **메인 웹**입니다.
픽셀 아트로 그린 LnL **919C동·919D동**(각 1~9층, 층마다 방 4개)에 관객이 자기 호실을 넣으면 그 방에 **불이 켜지고**,
두 동 아래 저층부의 공용 공간 6곳에서 조원들이 만든 방 앱 9개로 들어갑니다.

- 미리보기 (GitHub Pages): https://kang0r.github.io/living-lnl/
- 관객 참여: [`/live/`](https://kang0r.github.io/living-lnl/live/) · 발표 화면: [`/live/screen/`](https://kang0r.github.io/living-lnl/live/screen/)
- 작업 규칙과 사양은 [`CLAUDE.md`](CLAUDE.md)를 먼저 읽어 주세요.

> 지금은 Supabase 연결 전이라 **데모 모드**로 동작합니다. 기록과 접속자가 가짜로 만들어지고,
> 관객 참여 신호는 같은 브라우저의 탭끼리만 오갑니다.

## 화면 구성

| 주소 | 내용 |
|---|---|
| `/` | 메인 생활관. 919C·919D동과 저층부 공용 공간, 내 방 불 켜기, 시각(KST)별 하늘, 관악캠퍼스 날씨, 접속자 수만큼의 금빛 입자 |
| `/live/` | 관객 휴대폰: 내 방 불 켜기 · 내 빛이 생활관으로 날아감 · 불 켜기 · 한 줄 남기기(60자) · 응원 · 기울이기 |
| `/live/screen/` | 발표 화면: 큰 생활관 + QR 코드 + '전체 점등' 단계 조작 |
| `/examples/room.html` | 방 앱에 공통 상단바·기록을 붙이는 예시 |

## 내 컴퓨터에서 실행

빌드 도구가 없으므로 아무 정적 서버로 열면 됩니다. (ES 모듈이라 파일을 더블클릭해서 열면 동작하지 않아요)

```bash
python -m http.server 8000
# 브라우저에서 http://localhost:8000
```

### 확인용 주소 옵션

| 옵션 | 예 | 효과 |
|---|---|---|
| `?hour=` | `?hour=18` | 그 시각의 하늘로 보기 (0–24, 소수 가능) |
| `?weather=` | `?weather=rain` | `clear` `cloudy` `rain` `snow` 중 하나로 보기 |
| `?intro=1` | | 첫 방문 인트로 다시 보기 |

### 확인해 볼 것

- '내 방 불 켜기'에 `315`를 넣으면 919C동 3층 15호 창문이 반짝이며 켜지고, 내 기기에서는 금빛 테두리가 생긴다.
  `919`는 919D동 9층 19호, `323`처럼 없는 호수는 안내 문구가 뜬다. 호실 창문을 직접 눌러도 번호가 채워진다.
- 한 브라우저에서 `/live/screen/`과 `/live/`를 열고 관객 탭에서 호실을 넣으면 발표 화면의 그 방이 켜진다.
- 브라우저 콘솔에서 `LNL.emit('cafeteria', 'test')`를 세 번 실행하면 저층부 식당 창문이 하나 켜진다. (공용 공간마다 창문 2개, 창문 하나 = 기록 3개)
- 마우스를 움직이거나 화면을 누르면 금빛 입자가 그쪽으로 살짝 모인다.
- 건물 문 아래 [들어가기]를 누르면 금박 전환 후 공용 공간 6곳을 고르는 로비가 뜬다. (`#lobby` 주소로도 바로 열림)
- 로비 카드나 저층부 공용 공간을 누르면 앱 고르기 패널이 뜨고, 앱을 고르면 새 탭에서 열린다. (메인 화면은 원래 탭에 남는다)
- 한 브라우저에서 `/live/screen/`과 `/live/`를 탭 두 개로 열고 '불 켜기'를 누르면 발표 화면 창문이 반짝인다.
  발표 화면에서 스페이스로 '전체 점등 단계'를 켠 뒤 관객 탭에서 '불 켜기'를 누르면 건물 전체가 금빛으로 점등된다.
- 폭 360px 휴대폰 화면에서 [들어가기]·[내 방 불 켜기] 버튼과 건물이 겹치지 않는다.

## 방 앱에 연결하기 (각 조원)

방 앱의 `<head>`에 두 줄을 넣고, 기록을 남길 곳에서 `LNL.emit`을 부릅니다.

```html
<link rel="stylesheet" href="https://(통합 사이트 주소)/shared/design.css">
<script src="https://(통합 사이트 주소)/shared/lnl.js"></script>
<script>
  LNL.header('식당');                        // 맨 위 공통 상단바
  LNL.emit('cafeteria', 'view_menu');        // 기록 → 메인 창문 불빛 (실패해도 앱은 멈추지 않음)
  // LNL.go('https://...')                   // 금박 전환 후 이동
</script>
```

방 id: `cafeteria` 식당 · `meetup` 밥약 광장 · `study` 스터디룸 · `recycle` 분리수거장 · `wall` 기록의 벽 · `lounge` 라운지

## Supabase 연결 (총괄)

1. Supabase 프로젝트를 만들고 **SQL Editor**에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행한다.
   (events·pieces·dorm_lights·meetups 테이블, RLS, Realtime 설정)
2. [`shared/lnl.js`](shared/lnl.js) 맨 위의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`에 프로젝트 URL과 **anon 키**를 넣는다.
   service_role 키는 절대 넣지 않는다.
3. 두 값이 채워지면 데모 모드가 꺼지고 실제 기록·Presence(`lnl-presence`)·Broadcast(`lnl-live`)를 쓴다.

## 배포 (Vercel)

1. Vercel에서 이 GitHub 저장소를 Import 한다. (Framework: Other, 빌드 명령 없음)
2. main에 합쳐지면 실제 사이트에 자동 배포되고, PR마다 미리보기 링크가 생긴다.
3. AI·식단 등 API 키는 Vercel 환경 변수에 넣고 `/api` 함수에서만 쓴다. 예: [`api/health.js`](api/health.js)

## 아직 정해지지 않은 것

- 통합 사이트 주소 (Vercel 도메인) — 정해지면 방 앱 연결 코드의 `(통합 사이트 주소)`를 바꾼다.
- Supabase 프로젝트 URL·anon 키
- 인트로의 'LnL 홈페이지 요소'는 지금 금박 조각으로 대신했다. 실제 홈페이지 캡처 이미지를 쓸지 정하기.
- `meetups` 테이블 열과 '참여' 방식 (끼리 앱 담당과 상의)

## 협업 규칙 요약

- main에 직접 푸시하지 않는다. `scene/sky`, `lights/particles`, `live/phone`처럼 (`main/…` 이름은 git이 만들 수 없어 쓰지 않는다) 브랜치를 만들어 PR을 올린다.
- 각자 맡은 파일만 고친다. `shared/`는 총괄만 고치고, 기존 함수·CSS 변수 이름은 바꾸지 않는다.
- 화면 문구·주석·커밋 메시지는 한국어로 쓴다.
