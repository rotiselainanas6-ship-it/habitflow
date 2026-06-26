/* ══════════════════════════════════════
   HABITFLOW — desktop.js
   Data sharing: localStorage (sama dengan mobile)
   Format:
     habits       : [{ id, name, emoji, time }]
     habitHistory : { "YYYY-MM-DD": [id, id, ...] }
══════════════════════════════════════ */

/* ── CONSTANTS ── */
const EMOJIS  = ['💧','🏃','📚','🧘','🍎','💪','🌅','✍️','🎯','😴','🥗','🎨','🎵','🧹','💊','🚴','🧠','🌿','☀️','🧃'];
const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WDAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WDAYS_S = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const QUOTES  = [
  ['"We are what we repeatedly do."',          '— Aristotle'],
  ['"Small steps every day."',                 '— Unknown'],
  ['"Discipline is freedom."',                 '— Jocko Willink'],
  ['"Success is the sum of small efforts."',   '— R. Collier'],
  ['"You don\'t rise to goals, you fall to systems."', '— James Clear'],
];

/* ── STORAGE HELPERS (shared dengan mobile) ── */
const getHabits  = ()  => JSON.parse(localStorage.getItem('habits')       || '[]');
const getHistory = ()  => JSON.parse(localStorage.getItem('habitHistory') || '{}');
const setHabits  = (h) => localStorage.setItem('habits',       JSON.stringify(h));
const setHistory = (h) => localStorage.setItem('habitHistory', JSON.stringify(h));

/* ── DATE HELPERS ── */
const pad   = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayKey = () => dateKey(new Date());
const pct   = (d, t) => t === 0 ? 0 : Math.round(d / t * 100);

/* ── TOAST ── */
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2100);
}

/* ══ THEME ══ */
function applyTheme(light) {
  document.body.classList.toggle('light', light);
  document.getElementById('blobs').classList.toggle('light', light);
  const tr = document.getElementById('ttrack');
  tr.classList.toggle('on', light);
  document.getElementById('tlbl').textContent = light ? 'Light mode' : 'Dark mode';
}
function initTheme() {
  const light = localStorage.getItem('theme') === 'light';
  applyTheme(light);
  document.getElementById('theme-btn').addEventListener('click', () => {
    const l = document.body.classList.contains('light');
    localStorage.setItem('theme', l ? 'dark' : 'light');
    applyTheme(!l);
  });
}

/* ══ DATE LABELS ══ */
function initDateLabels() {
  const now = new Date();
  const h   = now.getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('sb-dayname').textContent  = WDAYS[now.getDay()];
  document.getElementById('sb-daynum').textContent   = now.getDate();
  document.getElementById('sb-monthyr').textContent  = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  document.getElementById('tb-greet').textContent    = greet;
  document.getElementById('tb-title').textContent    = `${WDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const q = QUOTES[now.getDay() % QUOTES.length];
  document.getElementById('motiv-q').textContent     = q[0];
  document.querySelector('.motiv-sub').textContent   = q[1];
}

/* ══ RENDER SIDEBAR ══ */
function renderSidebar() {
  const habits  = getHabits();
  const hist    = getHistory();
  const key     = todayKey();
  const doneIds = hist[key] || [];
  const done    = doneIds.length;
  const total   = habits.length;
  const p       = pct(done, total);

  /* ring */
  document.getElementById('ring-pct').textContent = p + '%';
  document.getElementById('ring-ct').textContent  = `${done}/${total}`;
  const r = 34, circ = 2 * Math.PI * r;
  const fill = document.getElementById('ring-fill');
  fill.style.strokeDasharray  = circ;
  fill.style.strokeDashoffset = circ;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.strokeDashoffset = circ * (1 - p / 100);
  }));

  /* chips */
  document.getElementById('sc-d').textContent = done;
  document.getElementById('sc-s').textContent = Math.max(0, total - done);
  document.getElementById('sc-t').textContent = total;

  /* streaks */
  const now = new Date();
  let streak = 0, best = 0, cur = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    if ((hist[k] || []).length > 0 && habits.length > 0) {
      cur++;
      best = Math.max(best, cur);
      if (i === 0 || streak > 0) streak = cur;
    } else {
      if (i > 0) cur = 0;
    }
  }
  document.getElementById('s-cur').textContent     = streak;
  document.getElementById('s-best').textContent    = best;
  document.getElementById('tb-streak-n').textContent = streak;
  document.getElementById('tb-days').textContent   = Object.keys(hist).length + ' days tracked';
  document.getElementById('tb-fire').textContent   = streak > 0 ? '🔥' : '⬜';

  /* habit list */
  const list = document.getElementById('sb-habit-list');
  if (!habits.length) {
    list.innerHTML = `<div class="sb-empty"><i class="fa-regular fa-clipboard"></i> No habits yet</div>`;
    return;
  }
  list.innerHTML = habits.map(h => {
    const isDone = doneIds.includes(h.id);
    return `<div class="sh-card ${isDone ? 'done' : ''}" data-id="${h.id}">
      <span class="sh-emoji">${h.emoji || '⭐'}</span>
      <div class="sh-info">
        <div class="sh-name">${h.name}</div>
        <div class="sh-time">${h.time || 'Daily'}</div>
      </div>
      <div class="sh-check" data-id="${h.id}"><i class="fa-solid fa-check"></i></div>
      <button class="sh-del" data-id="${h.id}"><i class="fa-solid fa-trash"></i></button>
    </div>`;
  }).join('');

  list.querySelectorAll('.sh-check').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id  = parseInt(btn.dataset.id);
      const h2  = getHistory();
      if (!h2[key]) h2[key] = [];
      const idx = h2[key].indexOf(id);
      if (idx === -1) { h2[key].push(id); toast('Done ✓'); }
      else            { h2[key].splice(idx, 1); toast('Unmarked'); }
      setHistory(h2);
      renderAll();
    });
  });

  list.querySelectorAll('.sh-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('Delete habit?')) return;
      setHabits(getHabits().filter(h => h.id !== parseInt(btn.dataset.id)));
      toast('Deleted');
      renderAll();
    });
  });
}

/* ══ BAR CHART ══ */
function renderBar() {
  const habits = getHabits(), hist = getHistory(), now = new Date(), tstr = todayKey();
  const chart  = document.getElementById('bar-chart');
  const days   = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = dateKey(d);
    days.push({ lbl: WDAYS_S[d.getDay()], p: pct((hist[k] || []).length, habits.length), today: k === tstr });
  }
  chart.innerHTML = days.map(d => `
    <div class="bc-col">
      <div class="bc-bw"><div class="bc-b ${d.today ? 'today-b' : ''}" style="height:3px" data-h="${d.p}%"></div></div>
      <div class="bc-day">${d.lbl}</div>
    </div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    chart.querySelectorAll('.bc-b').forEach(b => b.style.height = b.dataset.h);
  }));
}

/* ══ WEEK STRIP ══ */
function renderWeekStrip() {
  const habits = getHabits(), hist = getHistory(), now = new Date(), tstr = todayKey();
  const strip  = document.getElementById('week-strip');
  const days   = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const p = pct((hist[k] || []).length, habits.length);
    days.push({ lbl: WDAYS_S[d.getDay()], p, today: k === tstr, full: p === 100 && habits.length > 0 });
  }
  strip.innerHTML = days.map(d => `
    <div class="wd-item">
      <div class="wd-lbl">${d.lbl}</div>
      <div class="wd-dot ${d.full ? 'df' : d.p > 0 ? 'dp' : ''} ${d.today ? 'dt' : ''}">${d.p > 0 ? d.p + '%' : ''}</div>
    </div>`).join('');
}

/* ══ HEATMAP ══ */
function renderHeatmap() {
  const habits = getHabits(), hist = getHistory(), now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const fd  = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  document.querySelector('#hm-head').textContent = `Activity — ${MONTHS[m]}`;
  const g = document.getElementById('hm-grid');
  let html = '';
  for (let i = 0; i < fd; i++) html += `<div class="hm-c"></div>`;
  for (let d = 1; d <= dim; d++) {
    const k    = `${y}-${pad(m+1)}-${pad(d)}`;
    const done = (hist[k] || []).length, tot = habits.length;
    const p    = pct(done, tot);
    const isT  = k === todayKey();
    const cls  = done === 0 ? '' : p === 100 ? 'hf' : p >= 66 ? 'h3' : p >= 33 ? 'h2' : 'h1';
    html += `<div class="hm-c ${cls} ${isT ? 'ht' : ''}" title="${d} ${MONS[m]}"></div>`;
  }
  g.innerHTML = html;
}

/* ══ PERF BARS ══ */
function renderPerf() {
  const habits = getHabits(), hist = getHistory(), now = new Date();
  const list = document.getElementById('perf-list');
  if (!habits.length) { list.innerHTML = `<div class="dd-empty">No habits yet.</div>`; return; }
  list.innerHTML = habits.map(h => {
    let c = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      if ((hist[dateKey(d)] || []).includes(h.id)) c++;
    }
    const p = pct(c, 7);
    return `<div class="perf-row">
      <span class="pe">${h.emoji || '⭐'}</span>
      <div class="pi">
        <div class="pn">${h.name}</div>
        <div class="pt"><div class="pf" style="width:0" data-w="${p}%"></div></div>
      </div>
      <span class="pp">${p}%</span>
    </div>`;
  }).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    list.querySelectorAll('.pf').forEach(el => el.style.width = el.dataset.w);
  }));
}

/* ══ CALENDAR ══ */
let calDate = new Date(), selKey = todayKey();

function renderCalendar() {
  const habits = getHabits(), hist = getHistory();
  const y = calDate.getFullYear(), m = calDate.getMonth();
  document.getElementById('cal-title').textContent = `${MONTHS[m]} ${y}`;
  const fd   = new Date(y, m, 1).getDay();
  const dim  = new Date(y, m + 1, 0).getDate();
  const dprev= new Date(y, m, 0).getDate();
  const tstr = todayKey();
  const grid = document.getElementById('cal-grid');
  let cells  = [];
  for (let i = fd - 1; i >= 0; i--) cells.push({ day: dprev - i, oth: true, key: null });
  for (let d = 1; d <= dim; d++) {
    const k    = `${y}-${pad(m+1)}-${pad(d)}`;
    const done = (hist[k] || []).length;
    cells.push({ day: d, oth: false, key: k, today: k === tstr, dots: done, full: habits.length > 0 && done === habits.length });
  }
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++) cells.push({ day: d, oth: true, key: null });
  grid.innerHTML = cells.map(c => {
    if (c.oth) return `<div class="cc oth">${c.day}</div>`;
    const cls  = [c.today ? 'tod' : '', c.key === selKey ? 'sel' : '', c.full ? 'ful' : ''].join(' ');
    const dots = c.dots > 0
      ? `<div class="dot-r">${Array(Math.min(c.dots, 3)).fill('<div class="cdot"></div>').join('')}</div>`
      : '';
    return `<div class="cc ${cls}" data-k="${c.key}"><span>${c.day}</span>${dots}</div>`;
  }).join('');
  grid.querySelectorAll('.cc:not(.oth)').forEach(el => {
    el.addEventListener('click', () => { selKey = el.dataset.k; renderCalendar(); renderDayDetail(); });
  });
  renderDayDetail();
}

function renderDayDetail() {
  const habits = getHabits(), hist = getHistory();
  const done = hist[selKey] || [];
  const d    = new Date(selKey + 'T00:00:00');
  document.getElementById('dd-date').textContent = `${WDAYS[d.getDay()]}, ${MONS[d.getMonth()]} ${d.getDate()}`;
  const items = document.getElementById('dd-items');
  if (!habits.length) { items.innerHTML = `<div class="dd-empty">No habits added yet.</div>`; return; }
  items.innerHTML = habits.map(h => {
    const isDone = done.includes(h.id);
    return `<div class="dd-item">
      <div class="dd-dot ${isDone ? 'dn' : 'sk'}"></div>
      <span class="dd-name">${h.emoji || '⭐'} ${h.name}</span>
      <span class="dd-st ${isDone ? 'dn' : 'sk'}">${isDone ? 'Done' : '—'}</span>
    </div>`;
  }).join('');
}

/* ══ RENDER ALL ══ */
function renderAll() {
  renderSidebar();
  renderBar();
  renderWeekStrip();
  renderHeatmap();
  renderPerf();
  renderCalendar();
}

/* ══ MODAL ══ */
let selEmoji = '💧';
function initModal() {
  const ov  = document.getElementById('modal-ov');
  const epg = document.getElementById('ep-grid');
  epg.innerHTML = EMOJIS.map(e =>
    `<button class="ep ${e === selEmoji ? 'sel' : ''}" data-e="${e}">${e}</button>`
  ).join('');
  epg.querySelectorAll('.ep').forEach(btn => {
    btn.addEventListener('click', () => {
      selEmoji = btn.dataset.e;
      epg.querySelectorAll('.ep').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
    });
  });
  document.getElementById('open-modal').addEventListener('click', () => {
    ov.classList.add('open');
    document.getElementById('m-name').focus();
  });
  document.getElementById('close-modal').addEventListener('click', () => ov.classList.remove('open'));
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
  document.getElementById('save-habit').addEventListener('click', () => {
    const name = document.getElementById('m-name').value.trim();
    const time = document.getElementById('m-time').value.trim() || 'Daily';
    if (!name) { document.getElementById('m-name').focus(); return; }
    const h = getHabits();
    h.push({ id: Date.now(), name, emoji: selEmoji, time });
    setHabits(h);
    document.getElementById('m-name').value = '';
    document.getElementById('m-time').value = '';
    ov.classList.remove('open');
    toast('Habit added 🎉');
    renderAll();
  });
  document.getElementById('m-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('save-habit').click();
  });
}

/* ══ CALENDAR NAV ══ */
function initCalNav() {
  document.getElementById('cal-prev').addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() - 1); renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() + 1); renderCalendar();
  });
}

/* ══ SYNC ANTAR TAB/PERANGKAT ══
   Jika tab lain (atau halaman mobile di tab yang sama) mengubah localStorage,
   event 'storage' akan menyegarkan tampilan secara otomatis.              */
window.addEventListener('storage', (e) => {
  if (e.key === 'habits' || e.key === 'habitHistory') renderAll();
});

/* ══ MIGRASI DATA LAMA ══
   Sama dengan today.js — bersihkan format lama saat pertama load.           */
function migrateIfNeeded() {
  const raw = localStorage.getItem('habits');
  if (!raw) return;

  const habits = JSON.parse(raw);
  const isOldFormat = habits.some(h => !h.id || typeof h.id !== 'number');
  if (isOldFormat) {
    const migrated = habits.map((h, i) => ({
      id:    Date.now() + i,
      name:  h.name  || 'Habit',
      emoji: h.emoji || '⭐',
      time:  h.time  || 'Daily',
    }));
    localStorage.setItem('habits', JSON.stringify(migrated));
    localStorage.removeItem('habitHistory');
    return;
  }

  const validIds = new Set(habits.map(h => h.id));
  const rawHist  = localStorage.getItem('habitHistory');
  if (!rawHist) return;

  const hist  = JSON.parse(rawHist);
  let changed = false;
  for (const date in hist) {
    const cleaned = hist[date].filter(id => validIds.has(id));
    if (cleaned.length !== hist[date].length) { hist[date] = cleaned; changed = true; }
  }
  if (changed) localStorage.setItem('habitHistory', JSON.stringify(hist));
}

/* ══ BOOT ══ */
function boot() {
  migrateIfNeeded();
  initTheme();
  initDateLabels();
  initModal();
  initCalNav();
  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
                         }
     
