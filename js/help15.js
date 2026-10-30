/* Luka's Utils v10.0 (Phase 15): "?" help popovers and FAQ controls.
   The help text lives in the page itself (a <template> beside each "?" button), written by the site builder from
   help_data.py, so this file only opens, places and closes it. It stores nothing and makes no network calls. */
(function () {
  'use strict';
  var doc = document;
  var pop = null, popBody = null, popTitle = null, popFoot = null, current = null, raf = 0;
  var SHEET = '(max-width: 560px)';
  var sheetMq = window.matchMedia ? window.matchMedia(SHEET) : { matches: false };

  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var uid = 0;

  function build() {
    if (pop) return;
    pop = el('div', 'lu-pop');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('tabindex', '-1');
    pop.hidden = true;
    var head = el('div', 'lu-pop-head');
    popTitle = el('p', 'lu-pop-title');
    popTitle.id = 'lu-pop-title';
    var x = el('button', 'lu-pop-close', '×');
    x.type = 'button'; x.setAttribute('aria-label', 'Close help'); x.setAttribute('data-lu-close', '');
    head.appendChild(popTitle); head.appendChild(x);
    popBody = el('div', 'lu-pop-body');
    popFoot = el('div', 'lu-pop-foot');
    pop.setAttribute('aria-labelledby', 'lu-pop-title');
    pop.appendChild(head); pop.appendChild(popBody); pop.appendChild(popFoot);
    doc.body.appendChild(pop);
  }

  function sourceFor(btn) {
    var p = btn.parentNode;
    return p ? p.querySelector(':scope > template.lu-help-src') : null;
  }
  function faqFor(btn) {
    var panel = btn.closest('.panel, .lu-help-scope');
    if (!panel) return null;
    var f = panel.querySelector('.lu-faq');
    return f || null;
  }

  function place() {
    raf = 0;
    if (!pop || pop.hidden || !current) return;
    if (!current.isConnected || current.getClientRects().length === 0) { close(false); return; }
    var vw = window.innerWidth || doc.documentElement.clientWidth;
    var vh = window.innerHeight || doc.documentElement.clientHeight;
    if (sheetMq.matches) {
      pop.classList.add('is-sheet');
      pop.style.left = ''; pop.style.top = ''; pop.style.width = ''; pop.style.maxHeight = '';
      return;
    }
    pop.classList.remove('is-sheet');
    var gap = 8, margin = 12;
    var w = Math.min(360, vw - margin * 2);
    pop.style.width = w + 'px';
    var r = current.getBoundingClientRect();
    var left = Math.max(margin, Math.min(r.left + r.width / 2 - 24, vw - w - margin));
    pop.style.left = left + 'px';
    // Natural height of the content (not the clamped one), so scrolling inside the popover is never reset.
    var h = pop.firstChild.offsetHeight + popBody.scrollHeight + (popFoot.hidden ? 0 : popFoot.offsetHeight) + 2;
    var below = vh - r.bottom - gap - margin, above = r.top - gap - margin;
    var top;
    if (h <= below || below >= above) { top = r.bottom + gap; pop.style.maxHeight = Math.max(160, below) + 'px'; }
    else { var mh = Math.max(160, above); pop.style.maxHeight = mh + 'px'; top = r.top - gap - Math.min(h, mh); }
    pop.style.top = Math.max(margin, top) + 'px';
  }
  function schedule() { if (!raf) raf = window.requestAnimationFrame(place); }

  function open(btn) {
    var src = sourceFor(btn);
    if (!src) return;
    build();
    if (current && current !== btn) current.setAttribute('aria-expanded', 'false');
    current = btn;
    btn.setAttribute('aria-expanded', 'true');
    popTitle.textContent = src.getAttribute('data-title') || 'Help';
    while (popBody.firstChild) popBody.removeChild(popBody.firstChild);
    popBody.appendChild(src.content.cloneNode(true));
    while (popFoot.firstChild) popFoot.removeChild(popFoot.firstChild);
    var faq = faqFor(btn);
    var n = faq ? faq.querySelectorAll('.lu-q').length : 0;
    if (n && btn.hasAttribute('data-lu-title-help')) {
      var more = el('button', 'lu-pop-more', 'Common questions (' + n + ')');
      more.type = 'button'; more.setAttribute('data-lu-more', '');
      popFoot.appendChild(more); popFoot.hidden = false;
    } else popFoot.hidden = true;
    pop.hidden = false;
    pop.classList.toggle('is-sheet', !!sheetMq.matches);
    popBody.scrollTop = 0;
    place();
    try { pop.focus({ preventScroll: true }); } catch (e) { pop.focus(); }
  }

  function close(refocus) {
    if (!pop || pop.hidden) { current = null; return; }
    pop.hidden = true;
    var b = current; current = null;
    if (b) { b.setAttribute('aria-expanded', 'false'); if (refocus && b.isConnected) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } } }
  }

  function openFaq(btn) {
    var faq = faqFor(btn);
    if (!faq) return;
    close(false);
    faq.open = true;
    var s = faq.querySelector('summary');
    faq.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    if (s) { try { s.focus({ preventScroll: true }); } catch (e) { s.focus(); } }
  }

  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var b = t.closest('[data-lu-help]');
    if (b) {
      e.preventDefault();
      if (current === b && pop && !pop.hidden) close(true); else open(b);
      return;
    }
    if (t.closest('[data-lu-close]')) { close(true); return; }
    var more = t.closest('[data-lu-more]');
    if (more && current) { openFaq(current); return; }
    var all = t.closest('[data-lu-faq-all]');
    if (all) {
      var box = all.closest('.lu-faq, .lu-faq-static');
      if (!box) return;
      var qs = box.querySelectorAll('.lu-q');
      var anyClosed = Array.prototype.some.call(qs, function (q) { return !q.open; });
      Array.prototype.forEach.call(qs, function (q) { q.open = anyClosed; });
      syncAll(box);
    }
  });

  function syncAll(box) {
    var btn = box.querySelector('[data-lu-faq-all]');
    if (!btn) return;
    var qs = box.querySelectorAll('.lu-q');
    var anyClosed = Array.prototype.some.call(qs, function (q) { return !q.open; });
    btn.textContent = anyClosed ? 'Expand all' : 'Collapse all';
  }
  // "toggle" does not bubble, so listen in the capture phase to keep each Expand all button in step.
  doc.addEventListener('toggle', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('lu-q')) { var box = t.closest('.lu-faq, .lu-faq-static'); if (box) syncAll(box); }
  }, true);

  // Esc closes the popover first, and does nothing else that Esc might do (search clearing, menus).
  doc.addEventListener('keydown', function (e) {
    if (!pop || pop.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(pop.querySelectorAll('button, a[href]'), function (x) { return !x.hidden && x.getClientRects().length; });
      var last = f[f.length - 1], first = f[0];
      var inside = pop.contains(doc.activeElement);
      if (!inside) return;
      // Tabbing past the end hands focus back to the "?" button, so the page order carries on from there.
      if ((!e.shiftKey && doc.activeElement === last) || (e.shiftKey && (doc.activeElement === first || doc.activeElement === pop))) {
        e.preventDefault(); close(true);
      }
    }
  }, true);

  doc.addEventListener('pointerdown', function (e) {
    if (!pop || pop.hidden) return;
    var t = e.target;
    if (pop.contains(t) || (t.closest && t.closest('[data-lu-help]'))) return;
    close(false);
  }, true);
  // Anything else taking focus (the shortcuts list, a search box) means the popover is no longer wanted.
  doc.addEventListener('focusin', function (e) {
    if (!pop || pop.hidden) return;
    var t = e.target;
    if (pop.contains(t) || t === current) return;
    close(false);
  });
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', function (e) { if (pop && e.target && e.target.nodeType === 1 && pop.contains(e.target)) return; schedule(); }, true);
  window.addEventListener('hashchange', function () { close(false); });

  window.LuHelp = { open: open, close: close };
})();
