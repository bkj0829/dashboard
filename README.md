# 통합 매출 대시보드 (Sales Dashboard)

카페24 · 샵바이 · 무신사 · 에이블리 · 스마트스토어 · 쿠팡 · 카카오스타일 7개 채널의 매출을
**GitHub Actions로 자동 수집** → **GitHub Pages(반응형 PWA)** 로 보여주는 무료 솔루션입니다.

- **금일 매출 현황**: 채널별 실시간 카드 + 합계/전일대비/목표달성률
- **누적 매출**: 일별(30일) · 월별(12개월) · 연별(5년) 차트 + 표
- **모바일/PC 반응형 + PWA**(홈화면 추가 가능)
- **새로고침 버튼** & 풀-투-리프레시(모바일 스와이프)

> API 키는 절대 브라우저로 노출되지 않습니다. GitHub Actions(서버 환경)에서만 사용되어
> 결과 JSON만 `data/` 폴더에 커밋됩니다.

---

## 1. 빠른 시작

```bash
# 저장소 만들기 (예시)
gh repo create sales-dashboard --public --source=. --remote=origin --push
```

또는 GitHub 웹에서 새 저장소를 만든 뒤 이 폴더 내용을 그대로 푸시합니다.

### 1-1. GitHub Pages 활성화
1. 저장소 → **Settings → Pages**
2. **Source**를 *GitHub Actions* 로 설정
3. main 브랜치에 푸시하면 `pages.yml` 워크플로우가 배포합니다.

### 1-2. Secrets 등록
저장소 → **Settings → Secrets and variables → Actions → New repository secret**

| 이름 | 채널 | 비고 |
|---|---|---|
| `CAFE24_MALL_ID` | 카페24 | 쇼핑몰 ID |
| `CAFE24_CLIENT_ID` | 카페24 | 개발자센터 앱 |
| `CAFE24_CLIENT_SECRET` | 카페24 | |
| `CAFE24_REFRESH_TOKEN` | 카페24 | 최초 OAuth 후 발급 |
| `SMARTSTORE_CLIENT_ID` | 네이버 커머스 API | 애플리케이션 ID |
| `SMARTSTORE_CLIENT_SECRET` | 네이버 커머스 API | |
| `COUPANG_VENDOR_ID` | 쿠팡 윙 | 예: A00012345 |
| `COUPANG_ACCESS_KEY` | 쿠팡 윙 | |
| `COUPANG_SECRET_KEY` | 쿠팡 윙 | |
| `MUSINSA_PARTNER_ID` | 무신사 | 파트너 ID |
| `MUSINSA_API_KEY` | 무신사 | |
| `ABLY_API_KEY` | 에이블리 | |
| `SHOPBY_MALL_ID` | 샵바이 | |
| `SHOPBY_CLIENT_ID` | 샵바이 | |
| `SHOPBY_CLIENT_SECRET` | 샵바이 | |
| `KAKAOSTYLE_API_KEY` | 카카오스타일 | |

선택 변수(**Variables 탭**에서):
- `DAILY_GOAL_KRW` — 일 매출 목표 금액 (예: `12000000`)

> 한 채널의 키가 없으면 해당 채널만 *연동오류* 상태로 표시되고 나머지는 정상 동작합니다.

---

## 2. 자동 수집 스케줄

`.github/workflows/collect-sales.yml`

- 매 **15분**마다 → 실시간 수집 (`npm run collect` → `data/today.json` 갱신)
- 매일 **23:55 KST** → 일/월/연 집계 (`npm run aggregate` → `daily/monthly/yearly.json`)
- **수동 실행**: Actions 탭 → *Collect Sales* → *Run workflow*
  - `mode: collect | aggregate | all` 선택 가능

> 비용 관리: 무료 GitHub Actions 한도 안에서 충분히 운영됩니다.
> 주기를 더 자주(예: 5분)로 줄이려면 cron을 `*/5 * * * *` 로 수정하세요.

---

## 3. 로컬 개발

```bash
npm install
# (선택) 키를 .env 로 임시 입력 후
node --env-file=.env scripts/collect.js
node scripts/aggregate.js

# 정적 서버
npm run serve
# → http://localhost:4173
```

키 없이 UI만 보고 싶다면 그냥 `npm run serve` 만 실행해도 됩니다.
(`data/*.json`에 더미 데이터가 들어 있습니다.)

---

## 4. 폴더 구조

```
sales-dashboard/
├─ index.html / app.js / style.css     ← PWA 대시보드 (정적)
├─ manifest.json / service-worker.js   ← PWA
├─ assets/icon.svg                     ← 아이콘
├─ data/
│  ├─ today.json     ← 오늘 채널별 실시간 매출 (15분마다 갱신)
│  ├─ daily.json     ← 최근 30일 일별
│  ├─ monthly.json   ← 최근 12개월
│  └─ yearly.json    ← 최근 5년
├─ scripts/
│  ├─ collect.js     ← 오케스트레이터 (병렬 수집)
│  ├─ aggregate.js   ← 일/월/연 집계
│  └─ collectors/    ← 채널별 API 호출 모듈
└─ .github/workflows/
   ├─ collect-sales.yml ← 데이터 수집/커밋
   └─ pages.yml         ← Pages 배포
```

---

## 5. 채널별 구현 메모

각 collector는 **공식 문서 패턴**을 따릅니다.
공개 스펙이 명확한 카페24/스마트스토어/쿠팡/샵바이는 그대로 동작하고,
무신사/에이블리/카카오스타일은 파트너 계약별 매뉴얼에 따라
`scripts/collectors/<채널>.js` 의 엔드포인트와 응답 필드명을 한 줄 정도만 맞추면 됩니다.

| 채널 | 인증 | 엔드포인트 (요약) |
|---|---|---|
| 카페24 | OAuth2 (refresh_token) | `GET /api/v2/admin/orders` |
| 스마트스토어 | OAuth2 + bcrypt 서명 | `POST /external/v1/pay-order/seller/product-orders/query` |
| 쿠팡 윙 | HMAC-SHA256 서명 | `GET /v2/providers/openapi/.../ordersheets` |
| 샵바이 | OAuth2 (client_credentials) | `GET /pro/orders` |
| 무신사 | Bearer (파트너 계약) | `GET /partner/v1/sales/daily` |
| 에이블리 | Bearer (셀러센터) | `GET /seller/v1/orders` |
| 카카오스타일 | Bearer (파트너 계약) | `GET /partner/v1/orders` |

> 각 collector 파일 상단 주석에 환경변수와 엔드포인트가 적혀 있습니다.

---

## 6. 새로고침 동작

- 우측 상단 **새로고침** 버튼: `data/*.json`을 캐시 무시 옵션으로 다시 fetch
- 모바일에서 **위로 당겨 새로고침** (스와이프 80px+)
- 서비스 워커는 *데이터는 네트워크 우선*, *앱 셸은 캐시 우선*

데이터 자체의 *실제* 갱신은 GitHub Actions 주기에 따릅니다.
즉시 반영하려면 Actions 탭에서 *Run workflow* 를 누르거나 cron 주기를 줄이세요.

---

## 7. 보안 체크리스트

- [x] API 키는 `Settings → Secrets`에만 저장
- [x] 클라이언트 코드(`app.js`)는 `data/*.json` 만 읽음 — 키 사용 0
- [x] `data/*.json`에는 합계/주문수 등 집계 수치만 (개인정보 미포함)
- [x] HTTPS 자동 (GitHub Pages)

---

## 8. 다음 단계 아이디어

- 카드 결제 vs 현금/포인트 분리, 환불/취소 차감 로직 추가
- 광고비/마진 데이터 결합 → 순이익 카드
- Slack/카카오워크 웹훅 연동: 이상 감지(전일比 -30% 등) 시 알림
- Cloudflare Workers 프록시로 *주기 축소(1분)* 가능
