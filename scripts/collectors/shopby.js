/**
 * 샵바이 (Shopby / NHN godo) 매출 수집기
 *
 * 인증: OAuth2 client_credentials → access_token
 *   POST https://oapi.e-ncp.com/oauth2/token
 *
 * 주문 조회: GET /pro/orders?startYmd=YYYY-MM-DD&endYmd=YYYY-MM-DD&orderStatusType=PAY_DONE
 *   - 응답의 lastPayAmt 합계
 *
 * 환경변수: SHOPBY_MALL_ID, SHOPBY_CLIENT_ID, SHOPBY_CLIENT_SECRET
 */
const BASE = 'https://oapi.e-ncp.com';

async function getAccessToken({ clientId, clientSecret, mallId }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      mallId,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`shopby token: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function collectShopby({ dateKST }) {
  const env = process.env;
  if (!env.SHOPBY_MALL_ID || !env.SHOPBY_CLIENT_ID || !env.SHOPBY_CLIENT_SECRET) {
    throw new Error('샵바이 환경변수 누락');
  }
  const tok = await getAccessToken({
    clientId: env.SHOPBY_CLIENT_ID,
    clientSecret: env.SHOPBY_CLIENT_SECRET,
    mallId: env.SHOPBY_MALL_ID,
  });

  const url = `${BASE}/pro/orders?startYmd=${dateKST}&endYmd=${dateKST}&orderStatusType=PAY_DONE&pageSize=200`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tok.accessToken || tok.access_token}`,
      mallId: env.SHOPBY_MALL_ID,
    },
  });
  if (!res.ok) throw new Error(`shopby orders: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const items = json.items || json.orders || [];

  let amount = 0, orders = 0;
  items.forEach(o => {
    amount += Number(o.lastPayAmt ?? o.payAmt ?? o.totalPayAmt ?? 0);
    orders += 1;
  });
  return { amount, orders };
}
