# 통합 매출 대시보드 — 상세 사용 설명서

이 문서는 **코딩을 모르는 분도 따라 할 수 있도록** 채널별 API 발급부터 배포·운영까지 전 과정을 안내합니다.

> ✅ 한 번만 세팅해 두면 GitHub가 자동으로 데이터를 모아주고,
> PC·휴대폰 어디서든 브라우저로 매출 현황을 보실 수 있습니다.

---

## 0. 큰 그림 (5분 요약)

```
[7개 판매 채널 API]                [GitHub Actions]            [GitHub Pages]
   카페24, 스마트스토어,    →   매 15분마다 자동 수집     →   여러분의 휴대폰/PC에서
   쿠팡, 샵바이, 무신사,        결과를 data/*.json 저장        새로고침 누르면 보임
   에이블리, 카카오스타일
```

GitHub 무료 계정에서 **추가 비용 0원**으로 운영됩니다.

---

## 1. GitHub 계정·저장소 준비 (10분)

### 1-1. GitHub 가입
1. <https://github.com/signup> 에서 무료 가입
2. 이메일 인증 완료

### 1-2. 새 저장소(Repository) 만들기
1. 우측 상단 **+ → New repository**
2. Repository name: `sales-dashboard` (자유)
3. **Public** 또는 **Private** 선택 (둘 다 무료, Private 추천)
4. **Create repository** 클릭

### 1-3. 우리가 만든 파일을 저장소에 올리기
가장 쉬운 방법은 **드래그&드롭**입니다.

1. 새로 만든 저장소 페이지에서 **uploading an existing file** 링크 클릭
2. 바탕화면 → `매출보고` → `sales-dashboard` 폴더 안의 **모든 파일/폴더**를 드래그해서 올림
   - `.github` 폴더 안의 워크플로우 파일이 빠지지 않도록 주의 (숨김 폴더처럼 보일 수 있음)
3. 아래쪽 *Commit changes* → 초록색 버튼 클릭

> 💡 더 간단하게: [GitHub Desktop](https://desktop.github.com/) 설치 후
> *File → Add Local Repository* 로 `sales-dashboard` 폴더를 선택하고 *Publish* 누르면 끝.

---

## 2. 채널별 API 발급 (각 30분~1일)

> ⚠️ 채널마다 발급 방식과 소요 시간이 다릅니다.
> 모든 채널을 한 번에 받을 필요는 없고, **받은 채널부터 등록**하면 됩니다.
> 못 받은 채널은 대시보드에 *연동오류* 라고만 표시됩니다.

### 2-1. 카페24 (가장 쉬움 · 즉시 발급)

**필요 정보 4개**: `CAFE24_MALL_ID`, `CAFE24_CLIENT_ID`, `CAFE24_CLIENT_SECRET`, `CAFE24_REFRESH_TOKEN`

1. <https://developers.cafe24.com> 접속 → 카페24 ID로 로그인
2. **앱 만들기 → "Private App"** (자기 쇼핑몰만 쓰는 앱)
3. 앱 이름 자유 입력 (예: "매출 대시보드")
4. **권한(Scope)**: `mall.read_application`, `mall.read_order`, `mall.read_product` 체크
5. 생성하면 화면에 **Client ID, Client Secret** 이 보임 → 메모
6. **Mall ID**: 본인 쇼핑몰 주소 `xxxx.cafe24.com` 의 `xxxx` 부분

**Refresh Token 발급** (한 번만 하면 됨):

브라우저 주소창에 아래 URL 입력 (괄호 안 4개 값을 본인 것으로 교체):
```
https://(MallID).cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=(ClientID)&state=test&redirect_uri=https://(MallID).cafe24.com&scope=mall.read_order,mall.read_product
```
→ 카페24 로그인 → *동의* → 주소창에 `?code=xxxxxx` 가 붙은 채 리디렉션됨 → **code 값 복사**

이제 [reqbin.com](https://reqbin.com) 같은 무료 사이트에서 **POST** 요청:
- URL: `https://(MallID).cafe24api.com/api/v2/oauth/token`
- Headers:
  - `Authorization: Basic (Base64로 ClientID:ClientSecret 인코딩)`
  - `Content-Type: application/x-www-form-urlencoded`
- Body: `grant_type=authorization_code&code=(받은코드)&redirect_uri=https://(MallID).cafe24.com`

응답에 `refresh_token` 필드가 보입니다 → 메모. (이후로는 자동 갱신되어 영구 사용)

> 위 절차가 어렵다면 카페24 개발자센터의 *"OAuth 인증 테스트 도구"* 메뉴에서 클릭만으로 발급 가능합니다.

---

### 2-2. 스마트스토어 — 네이버 커머스 API (반자동 · 1일 이내 승인)

**필요 정보 2개**: `SMARTSTORE_CLIENT_ID`, `SMARTSTORE_CLIENT_SECRET`

1. <https://apicenter.commerce.naver.com> 접속 → 네이버 셀러 ID로 로그인
2. **신규 앱 등록**
3. 앱 이름·설명 입력
4. **사용 API**에서 *판매자 주문 조회* (`pay-order/seller/product-orders/query`) 체크
5. 약관 동의 → 신청
6. **승인 완료 메일 도착** 후 다시 접속하면 **애플리케이션 ID(=Client ID)** 와 **Client Secret** 발급
7. ⚠️ Client Secret은 한 번만 보이니 즉시 복사·메모

> 승인은 보통 영업일 기준 반나절~1일 소요됩니다.

---

### 2-3. 쿠팡 윙 — Open API (즉시 발급)

**필요 정보 3개**: `COUPANG_VENDOR_ID`, `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`

1. <https://wing.coupang.com> 로그인 (셀러 계정)
2. 좌측 메뉴 **온라인문의 → Open API** 또는 *MY 정보 → Open API* (UI는 변동 가능)
3. **API 인증키 발급** 클릭
4. 화면에 **VendorID** (예: `A00012345`), **Access Key**, **Secret Key** 표시
5. ⚠️ Secret Key는 발급 직후만 보이니 즉시 복사

> 사용량 제한: 1초 5건 / 1일 28만건 (현재 매출 대시보드는 이 한도의 1% 미만 사용)

---

### 2-4. 샵바이 (NHN godo) — OpenAPI (셀러센터에서 즉시)

**필요 정보 3개**: `SHOPBY_MALL_ID`, `SHOPBY_CLIENT_ID`, `SHOPBY_CLIENT_SECRET`

1. <https://admin.shopby.co.kr> 어드민 로그인
2. **외부연동 → API 사용 → OpenAPI** 메뉴
3. **API 사용 신청** → 약관 동의
4. 발급된 **Client ID, Client Secret** 메모
5. **Mall ID**: 어드민 우측 상단 또는 *쇼핑몰 정보* 페이지에서 확인

---

### 2-5. 무신사 (입점 파트너 API · 계약 필요)

**필요 정보 2개**: `MUSINSA_PARTNER_ID`, `MUSINSA_API_KEY`

무신사는 **공개 API가 없어** 입점사 담당 MD/파트너 매니저에게 직접 요청해야 합니다.

1. 무신사 입점 파트너센터에서 담당 매니저 연락처 확인
2. **"매출 자동 수집을 위한 OpenAPI 사용을 신청합니다"** 라고 메일/메신저로 요청
3. 무신사 측 양식에 따라 신청 → 승인 후 **Partner ID + API Key** 수령
4. 매뉴얼 PDF에 적힌 *엔드포인트 URL* 도 함께 받음
   - 매뉴얼의 엔드포인트와 응답 필드명이 우리 코드와 다르면
   - `sales-dashboard/scripts/collectors/musinsa.js` 파일에서 URL/필드명 한 줄만 수정하면 됩니다 (수정 위치는 파일 상단 주석에 표시)

---

### 2-6. 에이블리 (셀러센터 API)

**필요 정보 1개**: `ABLY_API_KEY`

1. <https://ably-seller.kr> 셀러센터 로그인
2. **마이페이지 → API 관리** 또는 *환경설정 → 외부연동*
3. **API Key 발급** 클릭
4. 발급된 키 메모

> 메뉴 위치는 시즌별로 변동 가능합니다. 안 보이면 셀러센터 고객센터에 *"OpenAPI 사용 가능 여부 문의"* 로 1:1 문의.

---

### 2-7. 카카오스타일 (지그재그/포스티 파트너)

**필요 정보 1개**: `KAKAOSTYLE_API_KEY`

1. <https://partners.kakaostyle.com> 파트너센터 로그인
2. **설정 → API 관리**
3. **API Key 발급**
4. 매뉴얼 PDF에 따라 엔드포인트 확인 (필요시 `scripts/collectors/kakaostyle.js` 의 BASE URL 수정)

---

## 3. GitHub Secrets 등록 (15분)

발급받은 키를 GitHub에 *암호화된 비밀변수* 로 저장합니다. 이 값은 절대 외부에 노출되지 않습니다.

1. 본인 저장소 페이지 → 상단 **Settings** 탭
2. 좌측 **Secrets and variables → Actions**
3. 우측 **New repository secret** 버튼

아래 표의 **이름(Name)** 칸에 정확히 입력하고 **값(Secret)** 칸에 발급받은 값을 붙여넣은 뒤 *Add secret*.

| 채널 | Name (그대로 입력) | Value 예시 |
|---|---|---|
| 카페24 | `CAFE24_MALL_ID` | `myshop` (mall id) |
| 카페24 | `CAFE24_CLIENT_ID` | `aBcD...` |
| 카페24 | `CAFE24_CLIENT_SECRET` | `xxxx...` |
| 카페24 | `CAFE24_REFRESH_TOKEN` | `eyJh...` (긴 문자열) |
| 스마트스토어 | `SMARTSTORE_CLIENT_ID` | `12345abcde` |
| 스마트스토어 | `SMARTSTORE_CLIENT_SECRET` | `$2a$04$...` |
| 쿠팡 | `COUPANG_VENDOR_ID` | `A00012345` |
| 쿠팡 | `COUPANG_ACCESS_KEY` | `1234abcd-...` |
| 쿠팡 | `COUPANG_SECRET_KEY` | `abcdef...` |
| 샵바이 | `SHOPBY_MALL_ID` | `myshop` |
| 샵바이 | `SHOPBY_CLIENT_ID` | `xxx` |
| 샵바이 | `SHOPBY_CLIENT_SECRET` | `xxx` |
| 무신사 | `MUSINSA_PARTNER_ID` | `MS-12345` |
| 무신사 | `MUSINSA_API_KEY` | `xxxx` |
| 에이블리 | `ABLY_API_KEY` | `xxxx` |
| 카카오스타일 | `KAKAOSTYLE_API_KEY` | `xxxx` |

**일 매출 목표값 (선택)** — 같은 화면 *Variables* 탭에서:
- Name: `DAILY_GOAL_KRW` / Value: `12000000` (1200만원 등 원하는 숫자)

---

## 4. GitHub Pages(웹사이트) 활성화 (3분)

1. 저장소 → **Settings → Pages**
2. **Source** 드롭다운을 **GitHub Actions** 로 변경
3. 저장. 끝.
4. main 브랜치에 변경이 생기면 자동 배포되며, 페이지 주소는 `https://(아이디).github.io/sales-dashboard/` 형식으로 같은 메뉴 상단에 표시됩니다.

---

## 5. 첫 실행 (5분)

자동 스케줄(15분 간격)을 기다려도 되지만, 즉시 데이터를 채우려면:

1. 저장소 → 상단 **Actions** 탭
2. 좌측 워크플로우 목록에서 **Collect Sales** 선택
3. 우측 **Run workflow** 버튼 → *mode: all* 선택 → *Run workflow*
4. 1~2분 후 녹색 체크가 뜨면 `data/today.json` 등이 갱신됩니다.
5. Pages 주소로 접속 → 우측 상단 **새로고침** 버튼 → 실제 매출이 표시됩니다.

---

## 6. 일상 사용법

### 6-1. 휴대폰에서 보기
- 크롬/사파리로 Pages 주소 접속
- 안드로이드: 메뉴 → *홈 화면에 추가*
- 아이폰: 공유 → *홈 화면에 추가*
- 홈에서 아이콘 누르면 앱처럼 전체화면으로 열립니다(PWA)

### 6-2. 새로고침
- **수동 새로고침**: 우측 상단 ⟳ 버튼 (= JSON 다시 읽기)
- **풀 투 리프레시**: 모바일에서 위로 80px 이상 스와이프
- **실제 데이터 갱신**은 GitHub Actions 주기를 따릅니다(기본 15분)

### 6-3. 데이터 갱신 주기 바꾸기
파일: `.github/workflows/collect-sales.yml`
```yaml
schedule:
  - cron: "*/15 * * * *"   # 15분마다 → "*/5 * * * *" 로 바꾸면 5분마다
```
- ⚠️ 너무 짧게(예: 1분) 설정하면 채널별 API rate-limit에 걸릴 수 있습니다.

### 6-4. 화면 색상/항목 바꾸기
- **채널 색상**: `style.css` 상단 `--c-카페24: #...;` 등 16진수 값 수정
- **목표 금액**: GitHub *Variables → DAILY_GOAL_KRW* 만 바꾸면 자동 반영
- **차트 종류**: `app.js` 의 `drawTrend()` 함수에서 `type: 'bar'` → `'line'` 등으로 변경

---

## 7. 자주 묻는 질문 (FAQ)

**Q. 한 채널에서 키 발급이 안 되면?**
A. 그 채널만 *연동오류* 로 표시되고 나머지는 정상 동작합니다. 전체 합계에서 빠집니다.

**Q. 키가 외부로 새지 않을까요?**
A. 키는 GitHub Secrets(암호화 저장)에서 GitHub Actions(서버 환경)으로만 전달되며, 클라이언트(웹 페이지)에는 절대 들어가지 않습니다. 페이지의 JavaScript는 단지 `data/*.json`(합계 수치)만 읽어옵니다.

**Q. 깃허브 액션 비용은요?**
A. Public 저장소는 무제한 무료, Private도 월 2000분 무료입니다. 15분 주기로 1회 30초 실행 = 월 96분 → 한도의 5% 사용.

**Q. 환불·취소 매출도 반영되나요?**
A. 현재는 결제완료 상태만 합산합니다. 취소/환불 차감을 원하면 collector 파일에서 `status: 'CANCEL'` 등을 별도 합산해 빼주는 로직을 추가하면 됩니다 (필요시 알려주시면 보완해 드립니다).

**Q. 더 잦은 실시간(1분 단위)으로 보고 싶어요.**
A. GitHub Actions 최소 주기는 5분이라서 1분 단위는 별도 무료 백엔드(Cloudflare Workers Cron 등)를 붙여야 합니다. 필요하시면 워커 스크립트로 확장해 드릴 수 있습니다.

**Q. 여러 사람이 같이 보려면?**
A. Pages 주소만 공유하면 누구나 매출을 볼 수 있습니다. 비공개로 하려면 저장소를 Private으로 두고 *GitHub Pages*도 *Private(유료 Team 플랜)* 으로 두거나, Cloudflare Access 등 외부 인증을 앞단에 두면 됩니다.

---

## 8. 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| 페이지가 흰 화면 | Settings → Pages가 *GitHub Actions* 로 설정되었는지 확인. *Actions* 탭에서 *Deploy to GitHub Pages* 가 성공인지 확인 |
| 새로고침해도 0원 | Actions 탭 → *Collect Sales* 실행 결과 로그 확인. 채널별 에러 메시지가 보입니다 |
| 특정 채널만 0원 | 해당 Secret이 정확히 입력됐는지 확인 (앞뒤 공백·줄바꿈 주의) |
| 카페24 401 Unauthorized | refresh_token이 만료된 경우 — 절차 2-1 마지막 단계 다시 수행 |
| 쿠팡 401 | 시간 동기화 문제일 수 있음 — Actions 재실행 |

문제가 지속되면 *Actions 로그 화면*을 캡처해서 보여주시면 정확한 원인을 짚어 드리겠습니다.
