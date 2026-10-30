/* Theme toggle for pages that do not load script.js (home, changelog, legal and the standalone tool pages).
   The menu itself is menu.js on every page.
   script.js does the same on the category pages, so this file is never loaded together with it. */
(function () {
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var html = document.documentElement;
    var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (next === 'light') html.setAttribute('data-theme', 'light'); else html.removeAttribute('data-theme');
    try { localStorage.setItem('lu_theme', next); } catch (e) {}
  });
})();
