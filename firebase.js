/* ══════════════════════════════════════════════════════════════
   HABITFLOW — firebase.js
   Load file ini SEBELUM today.js, desktop.js, stats.js,
   calendar.js, dan sidebar.js di setiap HTML.

   Yang dilakukan file ini:
   1. Init Firebase (Auth + Firestore)
   2. Handle Google Login / Logout
   3. Sinkronisasi data habits & history ke Firestore
   4. Override localStorage agar semua JS lain otomatis pakai cloud
   5. Render UI login/logout di semua sidebar (mobile & desktop)
══════════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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

/* ══ INIT ══ */
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUser    = null;
let unsubSnapshot  = null; // listener Firestore aktif
let isSyncing      = false; // flag biar gak loop saat tulis ke LS

/* ══════════════════════════════════════════════════════════════
   OVERRIDE localStorage
   Semua file JS lain (today.js, desktop.js, dll.) memanggil
   localStorage.getItem / setItem untuk 'habits' & 'habitHistory'.
   Kita intercept setItem agar otomatis push ke Firestore juga.
══════════════════════════════════════════════════════════════ */
const _lsSetItem = localStorage.setItem.bind(localStorage);
const _lsGetItem = localStorage.getItem.bind(localStorage);

localStorage.setItem = function (key, value) {
  _lsSetItem(key, value); // tetap simpan lokal (untuk offline)
  if (!isSyncing && currentUser && (key === "habits" || key === "habitHistory")) {
    pushToFirestore();
  }
};

/* ══════════════════════════════════════════════════════════════
   FIRESTORE HELPERS
══════════════════════════════════════════════════════════════ */
function userDocRef(uid) {
  return doc(db, "users", uid);
}

/** Ambil data dari Firestore → tulis ke localStorage → trigger re-render */
async function pullFromFirestore(uid) {
  try {
    const snap = await getDoc(userDocRef(uid));
    if (snap.exists()) {
      const data = snap.data();
      isSyncing = true;
      if (data.habits)       _lsSetItem("habits",       JSON.stringify(data.habits));
      if (data.habitHistory) _lsSetItem("habitHistory", JSON.stringify(data.habitHistory));
      isSyncing = false;

      // Trigger storage event agar semua JS re-render
      window.dispatchEvent(new StorageEvent("storage", { key: "habits" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "habitHistory" }));
    }
    // Jika doc belum ada, berarti user baru — biarkan localStorage kosong
  } catch (err) {
    console.error("[HabitFlow] pullFromFirestore error:", err);
  }
}

/** Tulis localStorage → Firestore */
async function pushToFirestore() {
  if (!currentUser) return;
  try {
    const habits       = JSON.parse(_lsGetItem("habits")       || "[]");
    const habitHistory = JSON.parse(_lsGetItem("habitHistory") || "{}");
    await setDoc(userDocRef(currentUser.uid), { habits, habitHistory }, { merge: true });
  } catch (err) {
    console.error("[HabitFlow] pushToFirestore error:", err);
  }
}

/** Real-time listener — kalau data berubah dari device lain, update UI */
function subscribeRealtime(uid) {
  if (unsubSnapshot) unsubSnapshot(); // cabut listener lama
  unsubSnapshot = onSnapshot(userDocRef(uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const localHabits  = _lsGetItem("habits");
    const localHistory = _lsGetItem("habitHistory");

    const remoteHabits  = JSON.stringify(data.habits       || []);
    const remoteHistory = JSON.stringify(data.habitHistory || {});

    // Hanya update jika ada perbedaan (hindari loop)
    const changed = remoteHabits !== localHabits || remoteHistory !== localHistory;
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

/* ══════════════════════════════════════════════════════════════
   AUTH UI
   Update semua tombol login/logout yang ada di halaman,
   baik desktop sidebar maupun mobile sidebar.
══════════════════════════════════════════════════════════════ */
function updateAuthUI(user) {
  /* ── Avatar + nama jika login ── */
  const avatarHtml = user
    ? `<img src="${user.photoURL}" alt="" style="
        width:28px;height:28px;border-radius:50%;
        object-fit:cover;flex-shrink:0;">
       <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
         max-width:140px;">${user.displayName || user.email}</span>`
    : `<svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
         <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.5 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.7 17.7 9.5 24 9.5z"/>
         <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z"/>
         <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7-5.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8.1-6.1z"/>
         <path fill="#34A853" d="M24 47c5.5 0 10.1-1.8 13.5-4.9l-7.4-5.7c-1.8 1.2-4.1 1.9-6.6 1.9-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C7 42.3 14.9 47 24 47z"/>
       </svg>
       <span>Login with Google</span>`;

  const btnText = user ? "Logout" : "";

  /* Semua tombol Google di halaman (desktop + mobile bisa lebih dari 1) */
  const allGoogleBtns = [
    document.getElementById("sb-google-btn"),   // desktop sidebar
    document.getElementById("mob-google-btn"),   // mobile sidebar (index)
  ].filter(Boolean);

  allGoogleBtns.forEach((btn) => {
    btn.innerHTML = user
      ? `${avatarHtml}
         <span style="flex:1"></span>
         <span style="font-size:12px;color:#ef4444;font-weight:600;flex-shrink:0;">Logout</span>`
      : avatarHtml;
    btn.title = user ? "Klik untuk logout" : "Login dengan Google";
  });

  /* Badge sync di desktop topbar (opsional, kalau ada elemen-nya) */
  const syncBadge = document.getElementById("sync-badge");
  if (syncBadge) {
    syncBadge.textContent = user ? "☁️ Synced" : "💾 Local";
    syncBadge.title       = user
      ? `Login sebagai ${user.email}`
      : "Login untuk sync antar device";
  }
}

/* ══════════════════════════════════════════════════════════════
   AUTH ACTIONS
══════════════════════════════════════════════════════════════ */
async function handleGoogleLogin() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged yang akan handle sisanya
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      console.error("[HabitFlow] Login error:", err);
      alert("Login gagal: " + err.message);
    }
  }
}

async function handleLogout() {
  try {
    if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
    await signOut(auth);
    // Data lokal tetap ada, tapi sync berhenti
    showToast("Logged out. Data tetap tersimpan lokal.");
  } catch (err) {
    console.error("[HabitFlow] Logout error:", err);
  }
}

/* ══════════════════════════════════════════════════════════════
   BIND TOMBOL — dijalankan setelah DOM siap
══════════════════════════════════════════════════════════════ */
function bindAuthButtons() {
  const allGoogleBtns = [
    document.getElementById("sb-google-btn"),
    document.getElementById("mob-google-btn"),
  ].filter(Boolean);

  allGoogleBtns.forEach((btn) => {
    // Hapus listener lama (kalau ada) dengan clone trick
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);

    fresh.addEventListener("click", () => {
      if (currentUser) handleLogout();
      else handleGoogleLogin();
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   TOAST HELPER (works across pages)
══════════════════════════════════════════════════════════════ */
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    // Buat elemen toast kalau belum ada (misal di stats/calendar page)
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = `
      position:fixed;bottom:96px;left:50%;transform:translateX(-50%) translateY(20px);
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

/* ══════════════════════════════════════════════════════════════
   AUTH STATE LISTENER — jantung dari seluruh sistem
══════════════════════════════════════════════════════════════ */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    // 1. Update UI login
    updateAuthUI(user);
    // 2. Ambil data cloud → localStorage
    await pullFromFirestore(user.uid);
    // 3. Pasang real-time listener
    subscribeRealtime(user.uid);
    showToast(`☁️ Synced as ${user.displayName || user.email}`);
  } else {
    // Logout
    updateAuthUI(null);
    if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
  }

  // Bind ulang tombol setelah UI update
  bindAuthButtons();
});

/* ══════════════════════════════════════════════════════════════
   INIT saat DOM siap
══════════════════════════════════════════════════════════════ */
function init() {
  updateAuthUI(null);    // default state sebelum auth check selesai
  bindAuthButtons();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
