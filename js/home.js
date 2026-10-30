/* Homepage: old #hash links, and the tool search. Reads window.LU_CATALOG (catalog.js). */
(function () {
  var C = window.LU_CATALOG;
  if (!C) return;

  // Links from the old single-page site (/#tool-embed, /#styles, /#presets ...) go to the page that now holds them.
  var legacy = { styles: '/styles', colors: '/colors', presets: '/library', 'text-tools': '/text-tools', 'discord-tools': '/discord-tools', 'tool-base64': '/developer-tools#tool-encoder' };
  function redirectLegacy() {
    var h = location.hash.slice(1);
    if (!h) return false;
    var dest = legacy[h] || null;
    if (!dest) for (var i = 0; i < C.tools.length; i++) if (C.tools[i].id === h) { dest = C.tools[i].url; break; }
    if (dest) { location.replace(dest); return true; }
    return false;
  }
  window.addEventListener('hashchange', redirectLegacy);
  if (redirectLegacy()) return;

  // Panel dropdowns: a disclosure button that shows that panel's feature links (plain links to /page#tool-id).
  (function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.cat-card'));
    function close(card, refocus) {
      var btn = card.querySelector('.cat-toggle'), menu = card.querySelector('.cat-menu');
      if (!btn || !menu || menu.hidden) return;
      menu.hidden = true; btn.setAttribute('aria-expanded', 'false');
      card.classList.remove('menu-open', 'menu-up'); menu.style.maxHeight = '';
      if (refocus) btn.focus();
    }
    function closeAll(except) { cards.forEach(function (c) { if (c !== except) close(c, false); }); }
    function open(card) {
      var btn = card.querySelector('.cat-toggle'), menu = card.querySelector('.cat-menu');
      closeAll(card);
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); card.classList.add('menu-open');
      // Pick the side with more room and cap the list to it (the sticky header counts as taken), so no item is ever
      // hidden behind the header or off the bottom. A long list scrolls inside its own box.
      var hdr = document.getElementById('site-header'), top = hdr ? hdr.offsetHeight : 0;
      var r = card.getBoundingClientRect(), natural = menu.scrollHeight + 18;
      var below = window.innerHeight - r.bottom - 14, above = r.top - top - 14;
      var up = natural > below && above > below;
      card.classList.toggle('menu-up', up);
      menu.style.maxHeight = Math.max(150, Math.min(400, (up ? above : below) - 6)) + 'px';
      var m = menu.getBoundingClientRect();
      if (m.bottom > window.innerHeight || m.top < top) menu.scrollIntoView({ block: 'nearest' });
    }
    cards.forEach(function (card) {
      var btn = card.querySelector('.cat-toggle'), menu = card.querySelector('.cat-menu');
      if (!btn || !menu) return;
      btn.addEventListener('click', function () { if (menu.hidden) open(card); else close(card, false); });
      menu.addEventListener('keydown', function (e) {
        var links = Array.prototype.slice.call(menu.querySelectorAll('a')), i = links.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { links[Math.min(i + 1, links.length - 1)].focus(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { if (i <= 0) btn.focus(); else links[i - 1].focus(); e.preventDefault(); }
        else if (e.key === 'Home') { links[0].focus(); e.preventDefault(); }
        else if (e.key === 'End') { links[links.length - 1].focus(); e.preventDefault(); }
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { if (menu.hidden) open(card); var f = menu.querySelector('a'); if (f) f.focus(); e.preventDefault(); }
      });
      card.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(card, true); e.stopPropagation(); } });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeAll(null); });   // closes while the page changes
    });
    document.addEventListener('click', function (e) { closeAll(e.target.closest('.cat-card')); });
    document.addEventListener('focusin', function (e) { closeAll(e.target.closest('.cat-card')); });   // focus moving into another card closes this one
    window.addEventListener('pageshow', function () { closeAll(null); });   // coming back with Back must not show an open menu
    window.addEventListener('resize', function () { closeAll(null); });
  })();

  var input = document.getElementById('home-search-input');
  var list = document.getElementById('home-results');
  var empty = document.getElementById('home-search-empty');
  if (!input || !list) return;
  var catName = {};
  C.categories.forEach(function (c) { catName[c.slug] = c.name; });
  var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9<: ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
  var index = C.tools.map(function (t) {
    return { t: t, name: norm(t.name), words: norm(t.kw), desc: norm(t.desc), cat: norm(catName[t.cat]) };
  });
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function score(e, terms) {
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var q = terms[i], s = 0;
      if (e.name === q) s = 100;
      else if (e.name.indexOf(q) === 0) s = 80;
      else if (e.name.indexOf(' ' + q) > -1) s = 65;
      else if (e.name.indexOf(q) > -1) s = 50;
      else if (e.words.indexOf(q) > -1) s = 35;
      else if (e.desc.indexOf(q) > -1) s = 20;
      else if (e.cat.indexOf(q) > -1) s = 10;
      if (!s) return 0; // every word has to match something
      total += s;
    }
    return total;
  }
  var active = -1;
  function setActive(n) {
    var items = list.querySelectorAll('li');
    active = items.length ? (n + items.length) % items.length : -1;
    items.forEach(function (li, k) { li.classList.toggle('active', k === active); li.setAttribute('aria-selected', k === active ? 'true' : 'false'); });
    if (active > -1) input.setAttribute('aria-activedescendant', items[active].id); else input.removeAttribute('aria-activedescendant');
  }
  function render() {
    var q = norm(input.value);
    if (!q) { list.hidden = true; list.innerHTML = ''; empty.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; return; }
    var terms = q.split(' ');
    var hits = index.map(function (e) { return { e: e, s: score(e, terms) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
    list.innerHTML = hits.map(function (x, k) {
      var t = x.e.t;
      return '<li role="option" id="hr-' + k + '"><a class="home-result" href="' + esc(t.url) + '"><span class="hr-name">' + esc(t.name) + '</span><span class="hr-desc">' + esc(t.desc) + '</span><span class="hr-cat">' + esc(catName[t.cat]) + '</span></a></li>';
    }).join('');
    list.hidden = !hits.length;
    empty.hidden = !!hits.length;
    input.setAttribute('aria-expanded', String(!!hits.length));
    setActive(hits.length ? 0 : -1);
  }
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { var a = list.querySelector('li.active a'); if (a) { e.preventDefault(); location.href = a.getAttribute('href'); } }
    else if (e.key === 'Escape') { if (input.value) { input.value = ''; render(); } else input.blur(); }
  });
  list.addEventListener('mousemove', function (e) { var li = e.target.closest('li'); if (li) setActive(Array.prototype.indexOf.call(list.children, li)); });
  // "/" and Ctrl/Cmd+K are handled by shortcuts.js. A visit to /#search (from another page's shortcut) lands in the box.
  if (location.hash === '#search') {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    input.focus();
  }
})();
