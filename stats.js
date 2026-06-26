/* ══════════════════════════════════════
   HABITFLOW — stats.js (mobile)
   Membaca data dari localStorage yang sama
   dengan today.js dan desktop.js
══════════════════════════════════════ */

/* ── DATE HELPERS ── */
const pad2     = (n) => String(n).padStart(2, '0');
const dateKey  = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const todayKey = () => dateKey(new Date());
const pct      = (d, t) => t === 0 ? 0 : Math.round(d / t * 100);

/* ── STORAGE HELPERS ── */
const getHabits  = () => JSON.parse(localStorage.getItem('habits')       || '[]');
const getHistory = () => JSON.parse(localStorage.getItem('habitHistory') || '{}');

const WDAYS_S = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/* ══ DARK MODE ══ */
function applyTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  const moonBtn = document.getElementById('moon-btn');
  if (!moonBtn) return;
  if (isDark) {
    moonBtn.classList.replace('fa-moon', 'fa-sun');
    moonBtn.style.color = '#f6c34d';
  } else {
    moonBtn.classList.replace('fa-sun', 'fa-moon');
    moonBtn.style.color = '';
  }
}

function initTheme() {
  const isDark = localStorage.getItem('theme') === 'dark';
  applyTheme(isDark);
  const moonBtn = document.getElementById('moon-btn');
  if (moonBtn) {
    moonBtn.addEventListener('click', () => {
      const dark = document.body.classList.contains('dark-mode');
      localStorage.setItem('theme', dark ? 'light' : 'dark');
      applyTheme(!dark);
    });
  }
}

/* ══ OVERALL PROGRESS ══ */
function renderOverall() {
  const habits  = getHabits();
  const hist    = getHistory();
  const key     = todayKey();
  const doneIds = hist[key] || [];
  const total   = habits.length;
  const done    = doneIds.length;
  const skipped = Math.max(0, total - done);
  const p       = pct(done, total);

  /* circle */
  const circle  = document.querySelector('.stats-circle');
  const innerEl = document.getElementById('stats-percent');
  if (circle)  circle.style.background = `conic-gradient(var(--purple-dark) ${p}%, var(--silver) 0%)`;
  if (innerEl) innerEl.textContent = `${p}%`;

  /* greeting */
  const greetEl   = document.getElementById('stats-greeting');
  const summaryEl = document.getElementById('stats-summary');
  if (greetEl) {
    if (total === 0)   greetEl.textContent = 'Add a habit!';
    else if (p === 100) greetEl.textContent = 'Perfect day! 🎉';
    else if (p >= 50)  greetEl.textContent = 'Keep going!';
    else               greetEl.textContent = 'Let\'s get started!';
  }
  if (summaryEl) {
    if (total === 0) summaryEl.textContent = 'No habits yet. Add one from Today tab.';
    else             summaryEl.textContent = `You've completed ${done} of ${total} habits today.`;
  }

  /* numbers */
  const compEl  = document.getElementById('stats-completed');
  const skipEl  = document.getElementById('stats-skipped');
  const totEl   = document.getElementById('stats-total');
  if (compEl) compEl.textContent = done;
  if (skipEl) skipEl.textContent = skipped;
  if (totEl)  totEl.textContent  = total;
}

/* ══ BAR CHART — last 7 days ══ */
function renderBarChart() {
  const habits  = getHabits();
  const hist    = getHistory();
  const now     = new Date();
  const chart   = document.getElementById('bar-chart');
  if (!chart) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    days.push({
      lbl:   WDAYS_S[d.getDay()],
      p:     pct((hist[k] || []).length, habits.length),
      today: k === todayKey(),
    });
  }

  chart.innerHTML = days.map(d => `
    <div class="bar-wrapper">
      <div class="bar-inner ${d.today ? 'bar-today' : ''}"
           style="height:0"
           data-h="${d.p}%"
           title="${d.p}%"></div>
      <div class="bar-label">${d.lbl}</div>
    </div>
  `).join('');

  /* animate after paint */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    chart.querySelectorAll('.bar-inner').forEach(b => {
      b.style.height = b.dataset.h;
    });
  }));
}

/* ══ HABIT PERFORMANCE ══ */
function renderHabitPerformance() {
  const habits = getHabits();
  const hist   = getHistory();
  const now    = new Date();
  const perfEl = document.getElementById('habit-performance');
  if (!perfEl) return;

  if (!habits.length) {
    perfEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-gray);font-size:13px;">No habits yet.</div>`;
    return;
  }

  perfEl.innerHTML = habits.map(h => {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if ((hist[dateKey(d)] || []).includes(h.id)) count++;
    }
    const p = pct(count, 7);
    return `
      <div class="habit-perf-item">
        <div class="habit-perf-header">
          <span>${h.emoji || '⭐'} ${h.name}</span>
          <span>${p}%</span>
        </div>
        <div class="perf-bar-bg">
          <div class="perf-bar-fill" style="width:0" data-w="${p}%"></div>
        </div>
      </div>
    `;
  }).join('');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    perfEl.querySelectorAll('.perf-bar-fill').forEach(el => {
      el.style.width = el.dataset.w;
    });
  }));
}

/* ══ BOTTOM NAV ══ */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      if (page === 'today')    window.location.href = 'index.html';
      if (page === 'calendar') window.location.href = 'calendar.html';
    });
  });
}

/* ══ TABS (UI only — extensible) ══ */
function initTabs() {
  const tabs = document.querySelectorAll('.stats-tabs span');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

/* ══ SYNC ANTAR TAB ══ */
window.addEventListener('storage', (e) => {
  if (e.key === 'habits' || e.key === 'habitHistory') {
    renderOverall();
    renderBarChart();
    renderHabitPerformance();
  }
});

/* ══ BOOT ══ */
function boot() {
  initTheme();
  initNav();
  initTabs();
  renderOverall();
  renderBarChart();
  renderHabitPerformance();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
