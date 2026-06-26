/* ══════════════════════════════════════════════════════════════
   HABITFLOW — firebase.js
   Load file ini SEBELUM today.js, desktop.js, stats.js,
   calendar.js, dan sidebar.js di setiap HTML.
══════════════════════════════════════════════════════════════ */

/* ══ DIAGNOSTIC: tangkap & tampilkan error lewat alert() ══
   Sementara untuk debugging di HP (tanpa perlu DevTools).
   Bisa dihapus lagi nanti kalau sudah ketemu akar masalahnya.   */
let initializeApp, getAuth, GoogleAuthProvider, signInWithRedirect,
    getRedirectResult, signOut, onAuthStateChanged,
    getFirestore, doc, getDoc, setDoc, onSnapshot;

try {
  const appMod  = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js");
  const authMod = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js");
  const fsMod   = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");

  ({ initializeApp } = appMod);
  ({ getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } = authMod);
  ({ getFirestore, doc, getDoc, setDoc, onSnapshot } = fsMod);
} catch (err) {
  alert("⚠️ GAGAL MEMUAT FIREBASE SDK dari gstatic.com\n\n" + (err && err.message ? err.message : err));
  throw err; // hentikan eksekusi, sisanya tidak relevan kalau SDK gagal load
}

/* ══ CONFIG ══ */
const firebaseConfig = {
  apiKey: "AIzaSyDN_q_gp4z9-w8N1KrTa4B2eThV8W8rmag",
  authDomain: "habitflow-bdf42.firebaseapp.com",
  projectId: "habitflow-bdf42",
  storageBucket: "habitflow-bdf42.firebasestorage.app",
  messagingSenderId: "103555862750",
  appId: "1:103555862750:web:305ec4f2060701ab80f24f",
  measurementId: "G-KG2J3Y2K33",
};

let app, auth, db;
try {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
} catch (err) {
  alert("⚠️ GAGAL INISIALISASI FIREBASE (cek firebaseConfig)\n\n" + (err && err.message ? err.message : err));
  throw err;
}

let currentUser   = null;
let unsubSnapshot = null;
let isSyncing     = false;

/* ══ OVERRIDE localStorage ══ */
const _lsSetItem = localStorage.setItem.bind(localStorage);
const _lsGetItem = localStorage.getItem.bind(localStorage);

localStorage.setItem = function (key, value) {
  _lsSetItem(key, value);
  if (!isSyncing && currentUser && (key === "habits" || key === "habitHistory")) {
    pushToFirestore();
  }
};

/* ══ FIRESTORE ══ */
function userDocRef(uid) { return doc(db, "users", uid); }

async function pullFromFirestore(uid) {
  try {
    const snap = await getDoc(userDocRef(uid));
    if (snap.exists()) {
      const data = snap.data();
      isSyncing = true;
      if (data.habits)       _lsSetItem("habits",       JSON.stringify(data.habits));
      if (data.habitHistory) _lsSetItem("habitHistory", JSON.stringify(data.habitHistory));
      isSyncing = false;
      window.dispatchEvent(new StorageEvent("storage", { key: "habits" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "habitHistory" }));
    }
  } catch (err) { console.error("[HabitFlow] pull error:", err); }
}

async function pushToFirestore() {
  if (!currentUser) return;
  try {
    const habits       = JSON.parse(_lsGetItem("habits")       || "[]");
    const habitHistory = JSON.parse(_lsGetItem("habitHistory") || "{}");
    await setDoc(userDocRef(currentUser.uid), { habits, habitHistory }, { merge: true });
  } catch (err) { console.error("[HabitFlow] push error:", err); }
}

function subscribeRealtime(uid) {
  if (unsubSnapshot) unsubSnapshot();
  unsubSnapshot = onSnapshot(userDocRef(uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const remoteHabits  = JSON.stringify(data.habits       || []);
    const remoteHistory = JSON.stringify(data.habitHistory || {});
    const changed = remoteHabits !== _lsGetItem("habits") || remoteHistory !== _lsGetItem("habitHistory");
    if (changed) {
      isSyncing = true;
      _lsSetItem("habits",       remoteHabits);
      _lsSetItem("habitHistory", remoteHistory);
      isSyncing = false;
      window.dispatchEvent(new StorageEvent("storage", { key: "habits" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "habitHistory" }));
    }
  });
}

/* ══ TOAST ══ */
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = `position:fixed;bottom:96px;left:50%;transform:translateX(-50%) translateY(20px);
      background:#1e293b;color:#fff;padding:10px 20px;border-radius:12px;
      font-size:13px;font-weight:600;z-index:9999;opacity:0;
      transition:opacity .25s,transform .25s;pointer-events:none;white-space:nowrap;`;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  t.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(20px)";
  }, 2500);
}

/* ══ AUTH ACTIONS ══ */
async function handleGoogleLogin() {
  alert("🔵 Tombol diklik — mencoba signInWithRedirect...\nUser agent:\n" + navigator.userAgent);
  try {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      alert("Login gagal: " + err.message);
    }
  }
}

async function handleLogout() {
  try {
    if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
    await signOut(auth);
    showToast("Logged out.");
  } catch (err) { console.error("[HabitFlow] logout error:", err); }
}

/* ══ AUTH UI ══ */
function updateAuthUI(user) {
  updateMobileUI(user);
  updateDesktopUI(user);
}

/* ── MOBILE UI ── */
function updateMobileUI(user) {
  const body = document.getElementById("mob-sidebar-body");
  if (!body) return;

  if (user) {
    body.innerHTML = `
      <!-- User info -->
      <div style="display:flex;align-items:center;gap:12px;padding:4px 0 16px;">
        <img src="${user.photoURL || ''}" alt=""
          style="width:40px;height:40px;border-radius:50%;object-fit:cover;
          background:#e5e7eb;flex-shrink:0;">
        <div style="overflow:hidden;">
          <div style="font-size:14px;font-weight:700;color:var(--text-dark);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${user.displayName || 'User'}
          </div>
          <div style="font-size:11px;color:var(--text-gray);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${user.email}
          </div>
        </div>
      </div>
      <div style="height:1px;background:var(--silver);margin-bottom:16px;"></div>
      <div style="display:flex;align-items:center;gap:8px;
        padding:6px 0;margin-bottom:8px;">
        <span style="font-size:12px;color:#22c55e;font-weight:600;">
          ☁️ Synced
        </span>
      </div>
      <!-- Logout button di bawah -->
      <button id="mob-logout-btn" style="
        display:flex;align-items:center;gap:10px;width:100%;
        padding:12px 14px;border-radius:12px;
        border:1.5px solid #fecaca;background:#fff5f5;
        color:#ef4444;font-size:14px;font-weight:600;
        cursor:pointer;margin-top:8px;transition:background .2s;">
        <i class="fa-solid fa-right-from-bracket"></i>
        Logout
      </button>`;
    document.getElementById("mob-logout-btn")
      .addEventListener("click", handleLogout);
  } else {
    body.innerHTML = `
      <button class="mob-google-btn" id="mob-google-btn">
        <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.5 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.7 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z"/>
          <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7-5.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8.1-6.1z"/>
          <path fill="#34A853" d="M24 47c5.5 0 10.1-1.8 13.5-4.9l-7.4-5.7c-1.8 1.2-4.1 1.9-6.6 1.9-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C7 42.3 14.9 47 24 47z"/>
        </svg>
        Login with Google
      </button>`;
    document.getElementById("mob-google-btn")
      ?.addEventListener("click", handleGoogleLogin);
  }
}

/* ── DESKTOP UI ── */
function updateDesktopUI(user) {
  // Tombol Google di desktop sidebar
  const btn = document.getElementById("sb-google-btn");
  if (btn) {
    if (user) {
      btn.innerHTML = `
        <img src="${user.photoURL || ''}" alt=""
          style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:left;">
          ${user.displayName || user.email}
        </span>`;
      btn.title = user.email;
      btn.onclick = null; // hapus handler lama
    } else {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.5 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.7 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z"/>
          <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7-5.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8.1-6.1z"/>
          <path fill="#34A853" d="M24 47c5.5 0 10.1-1.8 13.5-4.9l-7.4-5.7c-1.8 1.2-4.1 1.9-6.6 1.9-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C7 42.3 14.9 47 24 47z"/>
        </svg>
        <span>Login with Google</span>`;
      btn.onclick = handleGoogleLogin;
    }
  }

  // Tombol logout desktop — inject tepat sebelum theme-btn
  const existing = document.getElementById("sb-logout-btn");
  if (existing) existing.remove();

  if (user) {
    const themeBtn = document.getElementById("theme-btn");
    if (themeBtn) {
      const logoutBtn = document.createElement("button");
      logoutBtn.id = "sb-logout-btn";
      logoutBtn.style.cssText = `
        display:flex;align-items:center;gap:8px;width:100%;
        padding:9px 14px;border-radius:10px;margin-bottom:8px;
        border:1.5px solid #fecaca;background:#fff5f5;
        color:#ef4444;font-size:13px;font-weight:600;
        cursor:pointer;transition:background .2s;`;
      logoutBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Logout`;
      logoutBtn.addEventListener("click", handleLogout);
      themeBtn.parentNode.insertBefore(logoutBtn, themeBtn);
    }
  }
}

/* ══ AUTH STATE ══ */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    await pullFromFirestore(user.uid);
    subscribeRealtime(user.uid);
    showToast(`☁️ Synced as ${user.displayName || user.email}`);
  } else {
    if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
  }
});

/* ══ REDIRECT RESULT ══ */
getRedirectResult(auth).then((result) => {
  if (result?.user) {
    showToast(`☁️ Login berhasil sebagai ${result.user.displayName}`);
  }
}).catch((err) => {
  if (err.code !== "auth/cancelled-popup-request") {
    console.error("[HabitFlow] redirect error:", err.code, err.message);
    alert("⚠️ ERROR SESUDAH REDIRECT GOOGLE\n\nCode: " + err.code + "\n" + err.message);
  }
});

/* ══ INIT ══ */
function init() { updateAuthUI(null); }
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else { init(); }
