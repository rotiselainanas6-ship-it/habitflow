/* ══════════════════════════════════════
   HABITFLOW — today.js (mobile)
   Dibungkus IIFE agar tidak konflik scope dengan desktop.js
══════════════════════════════════════ */
(function () {

/* ── DATE HELPERS ── */
const pad2     = (n) => String(n).padStart(2, '0');
const dateKey  = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const todayKey = () => dateKey(new Date());

/* ── STORAGE HELPERS ── */
function getHabits()   { return JSON.parse(localStorage.getItem('habits')       || '[]'); }
function getHistory()  { return JSON.parse(localStorage.getItem('habitHistory') || '{}'); }
function setHabits(h)  { localStorage.setItem('habits',       JSON.stringify(h)); }
function setHistory(h) { localStorage.setItem('habitHistory', JSON.stringify(h)); }

/* ── DOM ELEMENTS ── */
const addHabitsBtn  = document.querySelector('.add-habits');
const habitListEl   = document.querySelector('.habit-list');
const manyHabitsEl  = document.querySelector('.many-habits');
const innerCircleEl = document.querySelector('.inner-circle');
const circleEl      = document.querySelector('.circle');
const moonBtn       = document.getElementById('moon-btn');

/* ── EMOJI LIST ── */
const EMOJIS_MOBILE = ['💧','🏃','📚','🧘','🍎','💪','🌅','✍️','🎯','😴'];

/* ══ UPDATE PROGRESS ══ */
function updateProgress() {
  const habits  = getHabits();
  const history = getHistory();
  const key     = todayKey();
  const doneIds = history[key] || [];
  const total   = habits.length;
  const done    = doneIds.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  manyHabitsEl.textContent  = `${done}/${total}`;
  innerCircleEl.textContent = `${percent}%`;
  circleEl.style.background = `conic-gradient(var(--purple-dark) ${percent}%, var(--silver) 0%)`;
}

/* ══ RENDER HABITS ══ */
function renderHabits() {
  const habits  = getHabits();
  const history = getHistory();
  const key     = todayKey();
  const doneIds = history[key] || [];

  habitListEl.innerHTML = '';

  if (!habits.length) {
    habitListEl.innerHTML = `<div style="padding:1.5rem;text-align:center;opacity:.6;color:var(--text-gray)">Belum ada habit. Tambahkan sekarang!</div>`;
    return;
  }

  habits.forEach((habit) => {
    const isDone = doneIds.includes(habit.id);

    const card = document.createElement('div');
    card.classList.add('habit-card');
    if (isDone) card.classList.add('completed');

    card.innerHTML = `
      <div class="habit-left">
        <div class="habit-icon">${habit.emoji || '⭐'}</div>
        <div class="habit-info">
          <h3>${habit.name}</h3>
          <p>${habit.time || 'Daily'}</p>
        </div>
      </div>
      <div class="habit-right">
        <input type="checkbox" ${isDone ? 'checked' : ''}>
        <i class="fa-solid fa-ellipsis-vertical menu-btn"></i>
        <div class="action-menu">
          <button class="delete-btn">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
      const hist = getHistory();
      if (!hist[key]) hist[key] = [];
      if (checkbox.checked) {
        if (!hist[key].includes(habit.id)) hist[key].push(habit.id);
      } else {
        hist[key] = hist[key].filter(id => id !== habit.id);
      }
      setHistory(hist);
      renderHabits();
      updateProgress();
    });

    const menuBtn   = card.querySelector('.menu-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.delete-btn').forEach(btn => {
        if (btn !== deleteBtn) btn.classList.remove('show');
      });
      deleteBtn.classList.toggle('show');
    });

    deleteBtn.addEventListener('click', () => {
      setHabits(getHabits().filter(h => h.id !== habit.id));
      renderHabits();
      updateProgress();
    });

    habitListEl.appendChild(card);
  });
}

/* ══ ADD HABIT MODAL ══ */
let mobSelEmoji = '💧';

function initMobModal() {
  const ov        = document.getElementById('mob-modal-ov');
  const epGrid    = document.getElementById('mob-ep-grid');
  const nameInput = document.getElementById('mob-m-name');
  const timeInput = document.getElementById('mob-m-time');
  const saveBtn   = document.getElementById('mob-save-habit');
  const closeBtn  = document.getElementById('mob-close-modal');
  const cancelBtn = document.getElementById('mob-cancel-modal');

  if (!ov) return;

  /* render emoji grid */
  epGrid.innerHTML = EMOJIS_MOBILE.concat(['🥗','🎨','🎵','🧹','💊','🚴','🧠','🌿','☀️','🧃']).map(e =>
    `<button class="mob-ep ${e === mobSelEmoji ? 'sel' : ''}" data-e="${e}">${e}</button>`
  ).join('');

  epGrid.querySelectorAll('.mob-ep').forEach(btn => {
    btn.addEventListener('click', () => {
      mobSelEmoji = btn.dataset.e;
      epGrid.querySelectorAll('.mob-ep').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
    });
  });

  function openModal() {
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => nameInput.focus(), 300);
  }

  function closeModal() {
    ov.classList.remove('open');
    document.body.style.overflow = '';
    nameInput.value = '';
    timeInput.value = '';
  }

  if (addHabitsBtn) addHabitsBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });

  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const time = timeInput.value.trim() || 'Daily';
    if (!name) { nameInput.focus(); return; }

    const habits = getHabits();
    habits.push({ id: Date.now(), name, emoji: mobSelEmoji, time });
    setHabits(habits);
    closeModal();
    renderHabits();
    updateProgress();
  });

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

/* ══ TUTUP SEMUA MENU ══ */
document.addEventListener('click', () => {
  document.querySelectorAll('.delete-btn').forEach(btn => btn.classList.remove('show'));
});

/* ══ DARK MODE ══ */
function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark-mode');
    if (moonBtn) { moonBtn.classList.replace('fa-moon', 'fa-sun'); moonBtn.style.color = '#f6c34d'; }
  } else {
    document.body.classList.remove('dark-mode');
    if (moonBtn) { moonBtn.classList.replace('fa-sun', 'fa-moon'); moonBtn.style.color = ''; }
  }
}

if (localStorage.getItem('theme') === 'dark') applyTheme(true);

if (moonBtn) {
  moonBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    applyTheme(!isDark);
  });
}

/* ══ BOTTOM NAV ══ */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.getAttribute('data-page');
    if (page === 'stats')    window.location.href = 'stats.html';
    if (page === 'calendar') window.location.href = 'calendar.html';
  });
});

/* ══ SYNC ANTAR TAB ══ */
window.addEventListener('storage', (e) => {
  if (e.key === 'habits' || e.key === 'habitHistory') {
    renderHabits();
    updateProgress();
  }
});

/* ══ MOBILE SIDEBAR ══ */
const mobMenuBtn        = document.getElementById('mob-menu-btn');
const mobSidebar        = document.getElementById('mob-sidebar');
const mobSidebarClose   = document.getElementById('mob-sidebar-close');
const mobSidebarOverlay = document.getElementById('mob-sidebar-overlay');

function openMobSidebar() {
  if (mobSidebar)        mobSidebar.classList.add('open');
  if (mobSidebarOverlay) mobSidebarOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobSidebar() {
  if (mobSidebar)        mobSidebar.classList.remove('open');
  if (mobSidebarOverlay) mobSidebarOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

if (mobMenuBtn)        mobMenuBtn.addEventListener('click', openMobSidebar);
if (mobSidebarClose)   mobSidebarClose.addEventListener('click', closeMobSidebar);
if (mobSidebarOverlay) mobSidebarOverlay.addEventListener('click', closeMobSidebar);


}

/* ══ INIT ══ */
renderHabits();
updateProgress();
initMobModal();

})(); // end IIFE
     
