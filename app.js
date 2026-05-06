/* 통합 매출 대시보드 - 클라이언트 로직
 *
 * 구조
 *  - data/today.json   : 오늘 채널별 실시간 매출 (GitHub Actions가 자주 갱신)
 *  - data/daily.json   : 최근 30일 일별 채널 매출
 *  - data/monthly.json : 최근 12개월 월별 채널 매출
 *  - data/yearly.json  : 최근 5년 연별 채널 매출
 *
 * 새로고침 버튼은 Cache-Buster를 붙여 JSON을 다시 읽어옵니다.
 */

const CHANNELS = [
  { key: 'cafe24',     name: '카페24',     color: getCss('--c-cafe24',     '#ff7a59') },
  { key: 'shopby',     name: '샵바이',     color: getCss('--c-shopby',     '#5b8def') },
  { key: 'musinsa',    name: '무신사',     color: getCss('--c-musinsa',    '#111111') },
  { key: 'ably',       name: '에이블리',   color: getCss('--c-ably',       '#ff5f8d') },
  { key: 'smartstore', name: '스마트스토어', color: getCss('--c-smartstore', '#03c75a') },
  { key: 'coupang',    name: '쿠팡',       color: getCss('--c-coupang',    '#f23341') },
  { key: 'kakaostyle', name: '카카오스타일', color: getCss('--c-kakaostyle', '#ffd400') },
];

let trendChart = null;
let shareChart = null;
let cache = { today: null, daily: null, monthly: null, yearly: null };
let activeRange = 'daily';

function getCss(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}

const krw = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('ko-KR');
function fmtKRW(n) { return krw.format(Math.round(n || 0)); }
function fmtNum(n) { return num.format(Math.round(n || 0)); }

async function fetchJSON(path) {
  const url = `${path}?t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function loadAll() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('is-loading');
  btn.disabled = true;
  try {
    const [today, daily, monthly, yearly] = await Promise.all([
      fetchJSON('data/today.json'),
      fetchJSON('data/daily.json'),
      fetchJSON('data/monthly.json'),
      fetchJSON('data/yearly.json'),
    ]);
    cache = { today, daily, monthly, yearly };
    renderToday(today);
    renderRange(activeRange);
    const stamp = today.updatedAt
      ? new Date(today.updatedAt).toLocaleString('ko-KR')
      : new Date().toLocaleString('ko-KR');
    document.getElementById('last-updated').textContent = `최종 업데이트 ${stamp}`;
  } catch (err) {
    console.error(err);
    document.getElementById('last-updated').textContent = '데이터를 불러오지 못했습니다.';
  } finally {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
}

/* ───────────── 금일 매출 현황 ───────────── */
function renderToday(today) {
  const dateStr = today.date
    ? new Date(today.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    : new Date().toLocaleDateString('ko-KR');
  document.getElementById('today-date').textContent = dateStr;

  const channels = today.channels || {};
  const total = CHANNELS.reduce((s, c) => s + (channels[c.key]?.amount || 0), 0);
  const orders = CHANNELS.reduce((s, c) => s + (channels[c.key]?.orders || 0), 0);
  const avg = orders ? total / orders : 0;
  document.getElementById('kpi-total').textContent = fmtKRW(total);
  document.getElementById('kpi-total-sub').textContent = `주문 ${fmtNum(orders)}건 · 평균 ${fmtKRW(avg)}`;

  // 전일 대비
  const yest = (cache.daily?.series?.slice(-1)?.[0]?.total) ?? today.yesterdayTotal ?? 0;
  let diffText = '—', diffClass = '';
  if (yest) {
    const diff = total - yest;
    const pct = (diff / yest) * 100;
    diffText = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`;
    diffClass = diff >= 0 ? 'up' : 'down';
  }
  const vs = document.getElementById('kpi-vs-yesterday');
  vs.textContent = diffText;
  vs.className = 'kpi-value ' + diffClass;
  document.getElementById('kpi-vs-yesterday-sub').textContent = `어제 ${fmtKRW(yest)}`;

  // 목표
  const goal = today.dailyGoal || 0;
  const pct = goal ? (total / goal) * 100 : 0;
  document.getElementById('kpi-goal').textContent = goal ? `${pct.toFixed(0)}%` : '—';
  document.getElementById('kpi-goal-sub').textContent = goal ? `목표 ${fmtKRW(goal)}` : '목표 미설정';

  // 채널 카드
  const wrap = document.getElementById('channel-cards');
  wrap.innerHTML = '';
  CHANNELS.forEach(c => {
    const d = channels[c.key] || { amount: 0, orders: 0, status: 'ok' };
    const card = document.createElement('article');
    card.className = 'ch-card';
    card.style.setProperty('--c', c.color);
    const statusLabel = d.status === 'error' ? '연동오류'
      : d.status === 'warn' ? '지연' : '정상';
    card.innerHTML = `
      <div class="ch-name"><span class="swatch" style="background:${c.color}"></span>${c.name}</div>
      <div class="ch-amount">${fmtKRW(d.amount || 0)}</div>
      <div class="ch-meta">
        <span>주문 ${fmtNum(d.orders || 0)}</span>
        <span class="ch-status ${d.status || 'ok'}">${statusLabel}</span>
      </div>
    `;
    wrap.appendChild(card);
  });
}

/* ───────────── 누적 추이 ───────────── */
function renderRange(range) {
  activeRange = range;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.range === range));
  document.getElementById('share-range-label').textContent = ({ daily: '일별', monthly: '월별', yearly: '연별' })[range];
  const data = cache[range];
  if (!data) return;
  drawTrend(data);
  drawShare(data);
  drawTable(data, range);
}

function buildDatasets(series) {
  return CHANNELS.map(c => ({
    label: c.name,
    data: series.map(p => p.channels?.[c.key] || 0),
    backgroundColor: c.color,
    borderColor: c.color,
    borderWidth: 0,
    stack: 'total',
  }));
}

function drawTrend(data) {
  const ctx = document.getElementById('trend-chart').getContext('2d');
  const labels = data.series.map(p => p.label);
  const datasets = buildDatasets(data.series);

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#cfd6ee', boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtKRW(ctx.parsed.y)}`,
            footer: (items) => '합계: ' + fmtKRW(items.reduce((s, i) => s + i.parsed.y, 0)),
          },
        },
      },
      scales: {
        x: { stacked: true, ticks: { color: '#8a96b8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: {
          stacked: true,
          ticks: {
            color: '#8a96b8',
            callback: (v) => v >= 1e8 ? (v/1e8).toFixed(1)+'억'
                          : v >= 1e4 ? (v/1e4).toFixed(0)+'만'
                          : num.format(v),
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });
}

function drawShare(data) {
  const ctx = document.getElementById('share-chart').getContext('2d');
  const totals = CHANNELS.map(c => data.series.reduce((s, p) => s + (p.channels?.[c.key] || 0), 0));
  const grandTotal = totals.reduce((a, b) => a + b, 0) || 1;

  if (shareChart) shareChart.destroy();
  shareChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: CHANNELS.map(c => c.name),
      datasets: [{
        data: totals,
        backgroundColor: CHANNELS.map(c => c.color),
        borderColor: '#0b1220', borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtKRW(ctx.parsed)} (${(ctx.parsed/grandTotal*100).toFixed(1)}%)` } },
      },
    },
  });

  const legend = document.getElementById('share-legend');
  legend.innerHTML = '';
  CHANNELS.forEach((c, i) => {
    const li = document.createElement('li');
    const pct = (totals[i] / grandTotal * 100).toFixed(1);
    li.innerHTML = `
      <span class="l-name"><span class="swatch" style="background:${c.color}"></span>${c.name}</span>
      <span><strong>${fmtKRW(totals[i])}</strong> <span class="l-pct">(${pct}%)</span></span>
    `;
    legend.appendChild(li);
  });
}

function drawTable(data, range) {
  const head = document.getElementById('data-table-head');
  const body = document.getElementById('data-table-body');
  head.innerHTML = '';
  body.innerHTML = '';

  const rangeLabel = { daily: '일자', monthly: '월', yearly: '연도' }[range];
  const cols = [rangeLabel, ...CHANNELS.map(c => c.name), '합계'];
  cols.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    head.appendChild(th);
  });

  // 최신이 위로
  [...data.series].reverse().forEach(p => {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.textContent = p.label;
    tr.appendChild(tdLabel);
    let total = 0;
    CHANNELS.forEach(c => {
      const v = p.channels?.[c.key] || 0;
      total += v;
      const td = document.createElement('td');
      td.textContent = v ? fmtNum(v) : '—';
      tr.appendChild(td);
    });
    const tdTotal = document.createElement('td');
    tdTotal.className = 'total-cell';
    tdTotal.textContent = fmtNum(total);
    tr.appendChild(tdTotal);
    body.appendChild(tr);
  });
}

/* 이벤트 */
document.getElementById('refresh-btn').addEventListener('click', loadAll);
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => renderRange(t.dataset.range));
});

/* 모바일 풀-투-리프레시 (간이) */
let touchY = 0;
document.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', e => {
  const dy = e.changedTouches[0].clientY - touchY;
  if (window.scrollY === 0 && dy > 80) loadAll();
}, { passive: true });

loadAll();
