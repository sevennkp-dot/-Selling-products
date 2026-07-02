/* nav-toggle.js — shared mobile hamburger toggle for all pages */
(function () {
  const toggle = document.getElementById('navToggle');
  const header = document.querySelector('.site-header');
  if (!toggle || !header) return;

  toggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  /* Close nav when a link is clicked (single-page feel) */
  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* Close nav when clicking outside */
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
