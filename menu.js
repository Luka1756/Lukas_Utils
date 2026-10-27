/* Phone/tablet menu, shared by every page (the markup comes from the shared header).
   Categories with several tools expand like an accordion; features are plain links to /page#tool-id,
   which the panel pages already route. Nothing here touches storage or the network. */
(function () {
  var btn = document.getElementById('menu-toggle');
  var menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  var root = document.documentElement;
  var header = document.getElementById('site-header');
  var search = document.getElementById('mm-search');
  var closeBtn = document.getElementById('mm-close');
  var list = document.getElementById('mm-list');
  var results = document.getElementById('mm-results');
  var empty = document.getElementById('mm-empty');
  var toggles = Array.prototype.slice.call(menu.querySelectorAll('.mm-toggle'));
  var items = Array.prototype.slice.call(menu.querySelectorAll('[data-mm-item]'));
  var wide = window.matchMedia ? window.matchMedia('(min-width: 1120px)') : null;
  var opened = false;

  function isOpen() { return menu.classList.contains('open'); }

  function place() { menu.style.top = (header ? header.getBoundingClientRect().bottom : 64) + 'px'; }

  function expand(t, on) {
    t.setAttribute('aria-expanded', String(on));
    var sub = document.getElementById(t.getAttribute('aria-controls'));
    if (sub) sub.hidden = !on;
    t.parentNode.classList.toggle('mm-expanded', on);
  }

  function path(p) { return p.replace(/\.html$/, '').replace(/\/$/, '') || '/'; }

  // Mark the feature (or panel page) that is showing now.
  function syncCurrent() {
    var here = path(location.pathname), hash = location.hash;
    var all = menu.querySelectorAll('.mm-sub a');
    var hit = null;
    for (var i = 0; i < all.length; i++) {
      var a = all[i];
      a.removeAttribute('data-current');
      if (a.classList.contains('mm-all')) continue;
      var u = a.getAttribute('href'), k = u.indexOf('#');
      if (k > -1 && path(u.slice(0, k)) === here && u.slice(k) === hash) hit = a;
    }
    var allLink = menu.querySelector('.mm-sub a.mm-all[aria-current]');
    if (hit) { hit.setAttribute('data-current', ''); hit.setAttribute('aria-current', 'location'); }
    for (var j = 0; j < all.length; j++) if (all[j] !== hit && !all[j].classList.contains('mm-all')) all[j].removeAttribute('aria-current');
    if (allLink) { if (hit) allLink.setAttribute('data-dim', ''); else allLink.removeAttribute('data-dim'); }
  }

  function expandCurrent() {
    if (opened) return;
    opened = true;
    var cat = menu.getAttribute('data-active');
    toggles.forEach(function (t) { if (t.parentNode.getAttribute('data-cat') === cat) expand(t, true); });
  }

  function setOpen(open, returnFocus) {
    if (open === isOpen()) return;
    menu.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) { place(); expandCurrent(); syncCurrent(); menu.scrollTop = 0; }
    else { clearSearch(); if (returnFocus) btn.focus(); }
  }

  function clearSearch() {
    if (!search) return;
    search.value = '';
    showResults('');
  }

  function showResults(q) {
    q = q.trim().toLowerCase();
    if (!q) { results.hidden = true; empty.hidden = true; list.hidden = false; return; }
    var words = q.split(/\s+/), hits = [];
    items.forEach(function (a) {
      var name = (a.getAttribute('data-name') || '').toLowerCase();
      var hay = name + ' ' + (a.getAttribute('data-cat') || '').toLowerCase() + ' ' + (a.getAttribute('data-kw') || '').toLowerCase();
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return;
      hits.push({ a: a, score: name.indexOf(q) === 0 ? 0 : name.indexOf(q) > -1 ? 1 : 2 });
    });
    hits.sort(function (x, y) { return x.score - y.score; });
    results.textContent = '';
    hits.forEach(function (h) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = h.a.getAttribute('href');
      if (h.a.target) { a.target = h.a.target; a.rel = 'noopener'; }
      var n = document.createElement('span'); n.className = 'mm-r-name'; n.textContent = h.a.getAttribute('data-name');
      a.appendChild(n);
      var c = h.a.getAttribute('data-cat');
      if (c) { var s = document.createElement('span'); s.className = 'mm-r-cat'; s.textContent = c; a.appendChild(s); }
      li.appendChild(a); results.appendChild(li);
    });
    list.hidden = true;
    results.hidden = !hits.length;
    empty.hidden = !!hits.length;
  }

  btn.addEventListener('click', function () { setOpen(!isOpen(), true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false, true); });

  // The expand control only expands. The page link for each category is the first row inside it.
  toggles.forEach(function (t) {
    t.addEventListener('click', function () {
      var on = t.getAttribute('aria-expanded') !== 'true';
      if (on) toggles.forEach(function (o) { if (o !== t) expand(o, false); });
      expand(t, on);
      if (on && t.scrollIntoView) { try { t.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    });
  });

  // Tapping the dim area beside the panel closes; any link closes (the page or hash change does the navigating).
  menu.addEventListener('click', function (e) {
    if (e.target === menu) { setOpen(false, true); return; }
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a) setOpen(false, false);
  });

  if (search) {
    search.addEventListener('input', function () { showResults(search.value); });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = results.querySelector('a');
        if (first) { e.preventDefault(); first.click(); }
      } else if (e.key === 'ArrowDown') {
        var f = results.hidden ? null : results.querySelector('a');
        if (f) { e.preventDefault(); f.focus(); }
      }
    });
    results.addEventListener('keydown', function (e) {
      var a = document.activeElement;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var all = Array.prototype.slice.call(results.querySelectorAll('a')), i = all.indexOf(a);
      if (i < 0) return;
      e.preventDefault();
      if (e.key === 'ArrowDown') (all[i + 1] || all[i]).focus();
      else if (i === 0) search.focus(); else all[i - 1].focus();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false, true); return; }
    if (e.key !== 'Tab') return;
    // Keep Tab inside the header button and the menu while it is open.
    var f = [btn].concat(Array.prototype.slice.call(menu.querySelectorAll('a[href], button, input')).filter(function (n) {
      return !n.closest('[hidden]') && n.offsetParent !== null;
    }));
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  window.addEventListener('hashchange', syncCurrent);
  window.addEventListener('resize', function () { if (isOpen()) { if (wide && wide.matches) setOpen(false, false); else place(); } });
  window.addEventListener('pageshow', function (e) { if (e.persisted) setOpen(false, false); });
  window.addEventListener('pagehide', function () { root.classList.remove('menu-open'); });
  syncCurrent();
})();
