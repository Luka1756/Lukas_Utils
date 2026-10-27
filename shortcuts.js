/* Keyboard shortcuts, shared by every page. One listener, one place that lists them, so the help dialog can never
   drift from what actually works. Every shortcut does exactly what its visible button does (it clicks that button),
   and nothing here is the only way to do anything. No storage and no network. */
(function () {
  if (window.__luShortcuts) return;          // a second copy of this file must not add a second listener
  window.__luShortcuts = true;

  var doc = document, root = doc.documentElement;
  var isMac = /Mac|iPhone|iPad|iPod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');
  var MOD = isMac ? '⌘' : 'Ctrl', ALT = isMac ? '⌥' : 'Alt', SHIFT = isMac ? '⇧' : 'Shift';
  function label(keys) {   // ['Alt','C'] -> "Alt+C" (or "⌥C" on a Mac)
    return keys.map(function (k) { return k === 'Mod' ? MOD : k === 'Alt' ? ALT : k === 'Shift' ? SHIFT : k; }).join(isMac ? '' : '+');
  }
  function aria(keys) { return keys.map(function (k) { return k === 'Mod' ? (isMac ? 'Meta' : 'Control') : k; }).join('+'); }

  /* ---------- which element is "typing" ---------- */
  var NON_TEXT = /^(checkbox|radio|button|submit|reset|image|range|color|file)$/i;
  function isTyping(el) {
    if (!el || el === doc.body || el === root) return false;
    var tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') return !NON_TEXT.test(el.type || 'text');
    if (el.isContentEditable) return true;
    var role = el.getAttribute && el.getAttribute('role');
    return role === 'textbox' || role === 'combobox' || role === 'searchbox';
  }
  function visible(el) { return !!(el && el.isConnected && !el.hidden && (el.offsetWidth || el.offsetHeight || el.getClientRects().length) && !el.closest('[hidden]')); }
  function usable(el) { return visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true'; }

  // Letters match the printed key, so AZERTY, Dvorak and QWERTZ users get the letter on their keycap. Where the printed
  // key is not a plain a-z letter (Mac Option+letter, Cyrillic, Greek...), the physical key position is used instead.
  function keyIs(e, ch) {
    var k = (e.key || '').toLowerCase();
    if (k === ch) return true;
    if (/^[a-z]$/.test(ch) && !/^[a-z]$/.test(k) && e.code === 'Key' + ch.toUpperCase()) return true;
    return false;
  }

  /* ---------- tool shortcuts: per tool, only the controls that really exist ---------- */
  // Selectors are looked up inside the tool's own panel. A missing control means no shortcut for that action there.
  var ACTIONS = [
    { id: 'copy',    key: 'c', name: 'Copy the output' },
    { id: 'clear',   key: 'x', name: 'Clear the input' },
    { id: 'mode',    key: 'm', name: 'Switch Encode / Decode' },
    { id: 'preview', key: 'p', name: 'Show or hide the preview' },
    { id: 'input',   key: 'i', name: 'Focus the main input' },
  ];
  var TOOLS = {
    'tool-markdown-preview': { input: '#md-preview-input', copy: '#copy-md-raw', preview: '[data-md-toggle]' },
    'tool-markdown-formats': { copy: '#copy-discord-format', preview: '[data-md-toggle]' },
    'tool-encoder': { input: '#encoder-input', copy: '#copy-encoder', clear: '#clear-encoder', mode: '#encoder-mode-toggle' },
    'tool-json': { input: '#json-fmt-input', copy: '#copy-json-fmt' },
    'tool-url': { input: '#url-encode-input', copy: '#copy-url-encode' },
    'tool-password': { copy: '#pw-copy' },
    'tool-json-csv': { input: '#j2c-input', copy: '#j2c-copy', clear: '#j2c-clear' },
    'tool-cron': { input: '#cron-input', copy: '#cron-copy', clear: '#cron-clear' },
    'tool-hash': { input: '#hash-input', copy: '#copy-hash' },
    'tool-regex': { input: '#rx-pattern', copy: '#rx-copy-pattern' },
    'tool-jwt': { input: '#jwt-input', copy: '#jwt-copy-payload', clear: '#jwt-clear' },
    'tool-url-parser': { input: '#urlp-input', copy: '#urlp-copy-json', clear: '#urlp-clear' },
    'tool-unicode': { input: '#uni-input', copy: '#uni-copy', clear: '#uni-clear' },
    'tool-counter': { input: '#count-input', copy: '#count-copy', clear: '#count-clear' },
    'tool-lines': { input: '#lines-input', copy: '#lines-copy', clear: '#lines-clear' },
    'tool-borders': { input: '#border-text-input', copy: '#copy-border' },
    'tool-table': { input: '#table-input', copy: '#table-copy', clear: '#table-clear' },
    'tool-splitter': { input: '#split-input', clear: '#split-clear' },
    'tool-text-cleaner': { input: '#cleaner-input', copy: '#copy-cleaner' },
    'templates': { copy: '#copy-template' },
    'tool-ansi': { copy: '#copy-ansi' },
    'tool-webhook-code': { input: '#wcode-input', copy: '#wcode-copy' },
    'tool-webhook-payload': { copy: '#copy-webhook-payload' },
    'tool-image-url': { input: '#imgurl-input', copy: '#imgurl-copy', clear: '#imgurl-clear' },
    'tool-discord-link': { input: '#dlink-input', copy: '#dlink-copy', clear: '#dlink-clear' },
    'tool-oauth-url': { input: '#oauth-client-id', copy: '#oauth-copy' },
    'tool-intents': { input: '#intents-value', copy: '#intents-copy', clear: '#intents-clear' },
    'tool-embed': { input: '#embed-message-content', copy: '#copy-embed-json', clear: '#clear-embed' },
    'tool-timestamp': { input: '#timestamp-input' },
    'tool-unix': { input: '#unix-input' },
    'tool-snowflake': { input: '#snowflake-input' },
    'tool-permissions': { input: '#perm-integer-input' },
    'tool-role-color': { input: '#role-color-hex' },
    'tool-cdn': { input: '#cdn-id-input' },
    'tool-emoji': { input: '#emoji-tag-input' },
    'tool-invite-formatter': { input: '#invite-input' },
    'tool-invite-lookup': { input: '#invite-lookup-input' },
    'tool-embed-check': { input: '#echeck-input' },
    'tool-webhook-inspector': { input: '#whi-input' },
    'tool-message-length': { input: '#length-input' },
    'tool-base': { input: '#base-input' },
    'tool-diff': { input: '#diff-input-a' },
    'tool-mention': { input: '#mention-id-input' },
    'tool-cheatsheet': { input: '#cheatsheet-search' },
    'tool-borders-dummy': {},
  };

  // The tool the keys apply to: the one holding focus, else the one showing (one panel at a time), else a lone panel.
  function currentPanel() {
    var a = doc.activeElement, p = a && a.closest ? a.closest('.panel[id]') : null;
    if (p && TOOLS[p.id] && visible(p)) return p;
    p = doc.querySelectorAll('.panel.is-active-tool[id]')[0];
    if (p && visible(p)) return p;
    var single = doc.querySelectorAll('.tool-grid.single > .panel[id]');
    if (single.length === 1 && visible(single[0])) return single[0];
    return null;
  }
  function find(panel, sel) { var el = sel ? panel.querySelector(sel) : null; return el && el.isConnected ? el : null; }
  // The element each action would use right now, or null when this tool does not have it.
  function target(panel, id) {
    var cfg = panel && TOOLS[panel.id];
    if (!cfg || !cfg[id]) return null;
    var el = find(panel, cfg[id]);
    if (!el) return null;
    if (id === 'mode') {   // the toggle group: the button that is not selected right now
      var btns = Array.prototype.slice.call(el.querySelectorAll('button'));
      var other = btns.filter(function (b) { return !b.classList.contains('active') && b.getAttribute('aria-pressed') !== 'true'; })[0];
      return other && usable(other) ? other : null;
    }
    return id === 'input' ? (visible(el) && !el.disabled ? el : null) : (usable(el) ? el : null);
  }
  function available(panel) { return ACTIONS.filter(function (a) { return target(panel, a.id); }); }

  /* ---------- global shortcuts ---------- */
  var SEARCH_IDS = ['home-search-input', 'tool-search-input', 'search-input'];
  function openSearch() {
    var menuBtn = doc.getElementById('menu-toggle'), toolToggle = doc.getElementById('tool-nav-toggle');
    for (var i = 0; i < SEARCH_IDS.length; i++) {
      var el = doc.getElementById(SEARCH_IDS[i]);
      if (el && el.isConnected && el.tagName === 'INPUT') {
        if (!visible(el) && toolToggle && toolToggle.getAttribute('aria-expanded') === 'false') toolToggle.click();   // phone: the tool list is folded
        if (visible(el)) { el.focus(); el.select && el.select(); return true; }
      }
    }
    var mm = doc.getElementById('mm-search');
    if (mm && menuBtn && visible(menuBtn)) { if (!root.classList.contains('menu-open')) menuBtn.click(); mm.focus(); return true; }
    location.href = '/#search';   // no search box here: the home page has one
    return true;
  }
  function goHome() {
    if (location.pathname === '/' || location.pathname === '/index.html') { window.scrollTo(0, 0); return; }
    location.href = '/';
  }
  function toggleMenu() {
    var b = doc.getElementById('menu-toggle');
    if (!usable(b)) return false;
    b.click(); return true;
  }

  var GLOBAL = [
    { keys: [['/'], ['Mod', 'K']], name: 'Search tools' },
    { keys: [['G'], ['H']], seq: true, name: 'Go to the home page' },
    { keys: [['M']], name: 'Open or close the menu (when the menu button is showing)' },
    { keys: [['?']], name: 'Show this list' },
    { keys: [['Esc']], name: 'Close the menu, a dropdown or this list' },
  ];

  /* ---------- the help dialog ---------- */
  var dlg = null, opener = null, lastPanelName = '';
  function kbd(keys) { return keys.map(function (k) { return '<kbd>' + label([k]) + '</kbd>'; }).join(''); }
  function combo(keys) { return '<kbd>' + label(keys) + '</kbd>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function row(keysHtml, name) { return '<li><span class="sc-keys">' + keysHtml + '</span><span class="sc-name">' + esc(name) + '</span></li>'; }
  function build() {
    var panel = currentPanel(), html = '';
    html += '<h3 class="sc-h">Everywhere</h3><ul class="sc-list">';
    html += row(kbd(['/']) + '<span class="sc-or">or</span>' + combo(['Mod', 'K']), 'Search tools');
    html += row(kbd(['G']) + '<span class="sc-or">then</span>' + kbd(['H']), 'Go to the home page');
    html += row(kbd(['M']), 'Open or close the menu (when the menu button is showing)');
    html += row(kbd(['?']), 'Show this list');
    html += row('<kbd>Esc</kbd>', 'Close the menu, a dropdown or this list');
    html += '</ul>';
    var acts = panel ? available(panel) : [];
    if (panel && acts.length) {
      var h = panel.querySelector('.panel-title');
      html += '<h3 class="sc-h">This tool' + (h ? ': ' + esc(h.textContent.trim()) : '') + '</h3><ul class="sc-list">';
      acts.forEach(function (a) { html += row(combo(['Alt', a.key.toUpperCase()]), a.name); });
      html += '</ul>';
    } else {
      html += '<h3 class="sc-h">In a tool</h3><p class="sc-note">Open a tool to see its shortcuts here. They are ' + esc(label(['Alt', 'C'])) + ' to copy, ' + esc(label(['Alt', 'X'])) + ' to clear, ' + esc(label(['Alt', 'I'])) + ' to focus the input, ' + esc(label(['Alt', 'M'])) + ' to switch Encode / Decode and ' + esc(label(['Alt', 'P'])) + ' to show or hide a preview, and each one only works in a tool that has that button.</p>';
    }
    html += '<h3 class="sc-h">In lists and search</h3><ul class="sc-list">';
    html += row('<kbd>↑</kbd><kbd>↓</kbd>', 'Move through results and dropdown lists');
    html += row('<kbd>Enter</kbd>', 'Open the first or highlighted result');
    html += row('<kbd>Esc</kbd>', 'Close the list, then clear or leave the search box');
    html += '</ul>';
    html += '<p class="sc-foot">Letter shortcuts are ignored while you are typing in a box. ' + (isMac ? '⌥ is the Option key.' : '') + ' On a phone every action also has its own button, so nothing depends on a keyboard.</p>';
    return html;
  }
  function makeDialog() {
    var d = doc.createElement('div');
    d.className = 'sc-overlay'; d.id = 'sc-overlay'; d.hidden = true;
    d.innerHTML = '<div class="sc-dialog" role="dialog" aria-modal="true" aria-labelledby="sc-title" tabindex="-1">'
      + '<div class="sc-head"><h2 id="sc-title">Keyboard shortcuts</h2><button type="button" class="sc-close" aria-label="Close keyboard shortcuts">×</button></div>'
      + '<div class="sc-body" id="sc-body"></div></div>';
    doc.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('.sc-close')) closeHelp(true); });
    return d;
  }
  function openHelp(from) {
    if (root.classList.contains('menu-open')) { var c = doc.getElementById('mm-close'); if (c) c.click(); }
    if (!dlg) dlg = makeDialog();
    opener = from || doc.activeElement;
    doc.getElementById('sc-body').innerHTML = build();
    dlg.hidden = false; root.classList.add('sc-open');
    dlg.querySelector('.sc-dialog').focus();
  }
  function closeHelp(refocus) {
    if (!dlg || dlg.hidden) return;
    dlg.hidden = true; root.classList.remove('sc-open');
    if (refocus && opener && opener.isConnected && opener.focus) { try { opener.focus(); } catch (e) {} }
    opener = null;
  }
  function helpOpen() { return !!(dlg && !dlg.hidden); }

  /* ---------- tooltips and aria-keyshortcuts, kept in step with the table above ---------- */
  function mark(el, keys, name) {
    if (!el || !el.isConnected) return;
    var base = el.getAttribute('data-sc-base');
    if (base === null) { base = el.getAttribute('title') || ''; el.setAttribute('data-sc-base', base); }
    el.setAttribute('title', (base ? base + ' ' : '') + '(' + label(keys) + ')');
    el.setAttribute('aria-keyshortcuts', aria(keys));
  }
  function decorate() {
    Object.keys(TOOLS).forEach(function (id) {
      var panel = doc.getElementById(id);
      if (!panel || !panel.isConnected || panel.tagName === undefined) return;
      var cfg = TOOLS[id];
      ACTIONS.forEach(function (a) {
        if (!cfg[a.id]) return;
        var el = panel.querySelector(cfg[a.id]);
        if (!el || !el.isConnected) return;
        if (a.id === 'mode') { el.querySelectorAll('button').forEach(function (b) { mark(b, ['Alt', a.key.toUpperCase()]); }); return; }
        if (a.id === 'input') { mark(el, ['Alt', a.key.toUpperCase()]); return; }
        mark(el, ['Alt', a.key.toUpperCase()]);
      });
    });
    var mt = doc.getElementById('menu-toggle'); if (mt) mark(mt, ['M']);
    SEARCH_IDS.forEach(function (id) { var s = doc.getElementById(id); if (s && s.isConnected && s.tagName === 'INPUT') mark(s, ['/']); });
  }

  /* ---------- the one key handler ---------- */
  var seqG = 0;   // time of the last "G", for "G then H"
  function modal() { return helpOpen(); }
  function menuOpen() { return root.classList.contains('menu-open'); }
  // A dropdown or list that is showing owns the keys while it is up.
  function listOpen() {
    return doc.querySelectorAll('.cat-menu:not([hidden]), #ts-zone-list:not([hidden]), #tz-search-results:not([hidden]), #home-results:not([hidden])').length > 0
      || !!(doc.activeElement && doc.activeElement.closest && doc.activeElement.closest('[role=listbox], [role=menu], .cat-menu'));
  }

  doc.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;   // another control already used it, or an IME is composing
    var k = e.key;
    if (k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta') return;

    if (modal()) {   // inside the help dialog only Esc, Tab (kept inside) and ? are meaningful
      if (k === 'Escape') { e.preventDefault(); closeHelp(true); }
      else if (k === 'Tab') { e.preventDefault(); var d = dlg.querySelector('.sc-dialog'), c = dlg.querySelector('.sc-close'); (doc.activeElement === c ? d : c).focus(); }
      else if (k === '?') { e.preventDefault(); closeHelp(true); }
      return;
    }
    var typing = isTyping(doc.activeElement);
    var plain = !e.ctrlKey && !e.metaKey && !e.altKey;

    // Search: / (not while typing) and Ctrl K or Cmd K (works while typing too, as it always did).
    var modK = isMac ? (e.metaKey && !e.ctrlKey && !e.altKey) : (e.ctrlKey && !e.metaKey && !e.altKey);
    if (modK && !e.shiftKey && keyIs(e, 'k')) { if (e.repeat) { e.preventDefault(); return; } e.preventDefault(); openSearch(); return; }
    if (plain && k === '/' && !typing && !listOpen()) { e.preventDefault(); if (!e.repeat) openSearch(); return; }

    if (plain && !typing && !listOpen()) {
      if (k === '?') { e.preventDefault(); if (!e.repeat) openHelp(doc.activeElement); return; }
      if (!e.shiftKey && !menuOpen() && keyIs(e, 'g')) { seqG = e.repeat ? seqG : Date.now(); return; }
      if (!e.shiftKey && keyIs(e, 'h') && seqG && Date.now() - seqG < 1200 && !menuOpen()) { seqG = 0; e.preventDefault(); if (!e.repeat) goHome(); return; }
      if (!e.shiftKey && keyIs(e, 'm') && !e.repeat) { if (toggleMenu()) e.preventDefault(); return; }
    }
    if (k !== 'g' && k !== 'G') seqG = 0;

    // Tool shortcuts: Alt (Option on a Mac) + a letter. They work while typing, because Alt+letter is never text.
    // Ctrl+Alt is how some layouts type AltGr characters, so it is never a shortcut.
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !(e.getModifierState && e.getModifierState('AltGraph'))) {
      if (menuOpen() || listOpen()) return;
      var panel = currentPanel();
      if (!panel) return;
      for (var i = 0; i < ACTIONS.length; i++) {
        var a = ACTIONS[i];
        if (!keyIs(e, a.key)) continue;
        var el = target(panel, a.id);
        if (!el) return;                        // this tool has no such control: leave the key alone
        e.preventDefault();
        if (e.repeat) return;
        if (a.id === 'input') { el.focus(); if (el.select && el.tagName !== 'TEXTAREA') el.select(); }
        else el.click();                        // the very same action as pressing the button
        return;
      }
    }
  });

  // Help buttons (footer, phone menu) and anything else marked data-shortcuts-open.
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-shortcuts-open]');
    if (b) { e.preventDefault(); openHelp(b); }
  });

  function init() { decorate(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
  // Panels and tool lists are filled in after load by the tools' own scripts; refresh the tooltips once things settle.
  window.addEventListener('load', function () { setTimeout(decorate, 150); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { closeHelp(false); seqG = 0; } });

  window.LuShortcuts = { isTyping: isTyping, keyIs: keyIs, label: label, tools: TOOLS, actions: ACTIONS, isMac: isMac, open: openHelp, close: closeHelp };
})();
