/**
 * 네이버 스마트스토어 (커머스 API) 매출 수집기
 *
 * 인증: OAuth2 client_credentials (전자서명 방식)
 *  - POST https://api.commerce.naver.com/external/v1/oauth2/token
 *  - body: client_id, timestamp, client_secret_sign, grant_type=client_credentials, type=SELF
 *  - client_secret_sign = bcrypt(client_id + "_" + timestamp, client_secret) 후 base64
 *
 * 결제완료 주문 목록: POST /external/v1/pay-order/seller/product-orders/query
 *  - lastChangedFrom/To (ISO8601, KST 권장)
 *  - 응답의 productOrders[].totalPaymentAmount 합계
 *
 * 환경변수: SMARTSTORE_CLIENT_ID, SMARTSTORE_CLIENT_SECRET
 *
 * 주의: bcrypt는 외부 의존성이 필요합니다 — package.json 에 "bcryptjs"를 추가하세요.
 */
import bcrypt from 'bcryptjs';

const BASE = 'https://api.commerce.naver.com/external';

async function getAccessToken({ clientId, clientSecret }) {
  const timestamp = Date.now();
  const password = `${clientId}_${timestamp}`;
  const hashed = bcrypt.hashSync(password, clientSecret);
  const sign = Buffer.from(hashed, 'utf8').toString('base64');

  const body = new URLSearchParams({
    client_id: clientId,
    timestamp: String(timestamp),
    client_secret_sign: sign,
    grant_type: 'client_credentials',
    type: 'SELF',
  });

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`smartstore token: ${res.status} ${await res.text()}`);
  return res.json(); // { access_token, expires_in, ... }
}

export async function collectSmartstore({ startISO, endISO }) {
  const env = process.env;
  if (!env.SMARTSTORE_CLIENT_ID || !env.SMARTSTORE_CLIENT_SECRET) {
    throw new Error('스마트스토어 환경변수 누락 (SMARTSTORE_CLIENT_ID/SECRET)');
  }
  const tok = await getAccessToken({
    clientId: env.SMARTSTORE_CLIENT_ID,
    clientSecret: env.SMARTSTORE_CLIENT_SECRET,
  });

  // 결제완료 상태(PAYED)만 합산
  const res = await fetch(`${BASE}/v1/pay-order/seller/product-orders/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lastChangedFrom: startISO,
      lastChangedTo: endISO,
      lastChangedType: 'PAYED',
    }),
  });
  if (!res.ok) throw new Error(`smartstore orders: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const list = json.data?.contents || json.contents || [];

  let amount = 0, orders = 0;
  list.forEach(item => {
    const po = item.productOrder || item;
    amount += Number(po.totalPaymentAmount || po.totalProductAmount || 0);
    orders += 1;
  });
  return { amount, orders };
}
