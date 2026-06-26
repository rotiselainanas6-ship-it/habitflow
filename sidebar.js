/* =========================
   SHARED MOBILE SIDEBAR JS
   Di-load dari stats.html dan calendar.html
   (today sudah ada di today.js)
========================= */
(function () {
  const menuBtn = document.getElementById('mob-menu-btn');
  const sidebar = document.getElementById('mob-sidebar');
  const overlay = document.getElementById('mob-sidebar-overlay');
  const closeBtn = document.getElementById('mob-sidebar-close');
  const googleBtn = document.getElementById('mob-google-btn');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (menuBtn)  menuBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay)  overlay.addEventListener('click', closeSidebar);

  /* Login/logout ditangani oleh firebase.js via bindAuthButtons() */
  if (false && googleBtn) {
    googleBtn.addEventListener('click', () => {
      alert('Google login akan diintegrasikan di sini.');
    });
  }
})();
