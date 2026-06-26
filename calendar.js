/* ══════════════════════════════════════
   HABITFLOW — calendar.js (mobile)
   localStorage sama dengan today.js & desktop.js
══════════════════════════════════════ */

/* ── HELPERS ── */
const pad2     = (n) => String(n).padStart(2, '0');
const dateKey  = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const todayKey = () => dateKey(new Date());
const pct      = (d, t) => t === 0 ? 0 : Math.round(d / t * 100);

const getHabits  = () => JSON.parse(localStorage.getItem('habits')       || '[]');
const getHistory = () => JSON.parse(localStorage.getItem('habitHistory') || '{}');

const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WDAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WDAYS_S = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const MONS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── STATE ── */
let calDate = new Date();
let selKey  = todayKey();

/* ══ DARK MODE ══ */
function applyTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  const btn = document.getElementById('moon-btn');
  if (!btn) return;
  if (isDark) {
    btn.classList.replace('fa-moon', 'fa-sun');
    btn.style.color = '#f6c34d';
  } else {
    btn.classList.replace('fa-sun', 'fa-moon');
    btn.style.color = '';
  }
}

function initTheme() {
  applyTheme(localStorage.getItem('theme') === 'dark');
  const btn = document.getElementById('moon-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const dark = document.body.classList.contains('dark-mode');
      localStorage.setItem('theme', dark ? 'light' : 'dark');
      applyTheme(!dark);
    });
  }
}

/* ══ CALENDAR ══ */
function levelClass(p, hasHabits) {
  if (!hasHabits || p === 0) return '';
  if (p === 100) return 'lf';
  if (p >= 67)  return 'l3';
  if (p >= 34)  return 'l2';
  return 'l1';
}

function renderCalendar() {
  const habits = getHabits();
  const hist   = getHistory();
  const y      = calDate.getFullYear();
  const m      = calDate.getMonth();
  const tstr   = todayKey();

  document.getElementById('cal-title').textContent = `${MONTHS[m]} ${y}`;

  const fd   = new Date(y, m, 1).getDay();
  const dim  = new Date(y, m + 1, 0).getDate();
  const prev = new Date(y, m, 0).getDate();
  const grid = document.getElementById('cal-grid');

  let cells = [];

  /* prev month padding */
  for (let i = fd - 1; i >= 0; i--)
    cells.push({ day: prev - i, oth: true });

  /* current month */
  for (let d = 1; d <= dim; d++) {
    const k    = `${y}-${pad2(m+1)}-${pad2(d)}`;
    const done = (hist[k] || []).length;
    const p    = pct(done, habits.length);
    cells.push({ day: d, key: k, p, today: k === tstr, full: p === 100 && habits.length > 0 });
  }

  /* next month padding */
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++)
    cells.push({ day: d, oth: true });

  grid.innerHTML = cells.map(c => {
    if (c.oth) return `<div class="cc oth">${c.day}</div>`;

    const lvl  = levelClass(c.p, habits.length > 0);
    const sel  = c.key === selKey ? 'sel' : '';
    const tod  = c.today ? 'tod' : '';
    const fire = c.full ? `<span class="fire">🔥</span>` : '';

    return `<div class="cc ${lvl} ${tod} ${sel}" data-k="${c.key}">
      <span>${c.day}</span>${fire}
    </div>`;
  }).join('');

  grid.querySelectorAll('.cc:not(.oth)').forEach(el => {
    el.addEventListener('click', () => {
      selKey = el.dataset.k;
      renderCalendar();
      renderDetail();
    });
  });

  renderDetail();
}

/* ══ DAY DETAIL ══ */
function renderDetail() {
  const habits = getHabits();
  const hist   = getHistory();
  const done   = hist[selKey] || [];
  const d      = new Date(selKey + 'T00:00:00');

  document.getElementById('detail-date').textContent =
    `${WDAYS[d.getDay()]}, ${MONS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;

  const listEl = document.getElementById('detail-list');

  if (!habits.length) {
    listEl.innerHTML = `<div class="detail-empty">No habits yet.</div>`;
    return;
  }

  listEl.innerHTML = habits.map(h => {
    const isDone = done.includes(h.id);
    return `<div class="detail-item">
      <div class="detail-dot ${isDone ? 'done' : 'skip'}"></div>
      <span class="detail-name">${h.emoji || '⭐'} ${h.name}</span>
      <span class="detail-status ${isDone ? 'done' : 'skip'}">${isDone ? 'Done' : '—'}</span>
    </div>`;
  }).join('');
}

/* ══ HEATMAP ══ */
function renderHeatmap() {
  const habits = getHabits();
  const hist   = getHistory();
  const now    = new Date();
  const y      = now.getFullYear();
  const m      = now.getMonth();

  document.getElementById('hm-title').textContent = `Activity — ${MONTHS[m]} ${y}`;

  const fd  = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const g   = document.getElementById('heatmap-grid');
  const tstr = todayKey();

  let html = '';

  /* padding */
  for (let i = 0; i < fd; i++)
    html += `<div class="hm-cell"></div>`;

  for (let d = 1; d <= dim; d++) {
    const k    = `${y}-${pad2(m+1)}-${pad2(d)}`;
    const done = (hist[k] || []).length;
    const p    = pct(done, habits.length);
    const lvl  = levelClass(p, habits.length > 0);
    const tod  = k === tstr ? 'ht' : '';
    html += `<div class="hm-cell ${lvl} ${tod}" title="${d} ${MONS[m]} · ${p}%"></div>`;
  }

  g.innerHTML = html;
}

/* ══ NAV ══ */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      if (page === 'today') window.location.href = 'index.html';
      if (page === 'stats') window.location.href = 'stats.html';
    });
  });
}

/* ══ CAL NAV ══ */
function initCalNav() {
  document.getElementById('cal-prev').addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar();
  });
}

/* ══ SYNC ══ */
window.addEventListener('storage', (e) => {
  if (e.key === 'habits' || e.key === 'habitHistory') {
    renderCalendar();
    renderHeatmap();
  }
});

/* ══ BOOT ══ */
function boot() {
  initTheme();
  initNav();
  initCalNav();
  renderCalendar();
  renderHeatmap();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
