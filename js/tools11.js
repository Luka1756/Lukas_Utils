/* Luka's Utils v11.0: TinyURL shortener, IP and URL generator, query string builder.
   Each tool starts only if its panel is on the page. The generator and the query string builder run locally.
   The TinyURL tool sends the address you give it to this site's own /api/shorten function (see api/shorten.js), only when you press Shorten.
   Shared helpers (copy, toast) come from window.LuBridge in script.js. */
(function () {
  'use strict';
  const UI = window.LuBridge || {};
  const $ = (id) => { const e = document.getElementById(id); return e && e.isConnected ? e : null; };
  const toast = (m, ms) => { if (UI.showToast) UI.showToast(m, ms); };
  async function copy(text, ok) { if (UI.copyText && await UI.copyText(text)) toast(ok || 'Copied!'); }
  const setMsg = (el, text, kind) => { if (!el) return; el.textContent = text || ''; if (kind) el.dataset.kind = kind; else delete el.dataset.kind; };
  const pub = {};   // pure functions, exposed for the tests

  // ---------------------------------------------------------------- random helpers
  function randInt(n) {   // 0..n-1 without modulo bias
    const c = (window.crypto && window.crypto.getRandomValues) ? window.crypto : null;
    if (!c) throw new Error('no-crypto');
    const max = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    do { c.getRandomValues(buf); } while (buf[0] >= max);
    return buf[0] % n;
  }
  const pick = (arr, r) => arr[(r || randInt)(arr.length)];

  // ---------------------------------------------------------------- IP and URL generator
  function reservedV4(a, b, c) {
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
    if (a === 192 && b === 88 && c === 99) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    return false;
  }
  const hex = (r, maxExcl) => (r || randInt)(maxExcl).toString(16);
  pub.makeIp = function (kind, r) {
    r = r || randInt;
    const o = (lo, hi) => lo + r(hi - lo + 1);
    if (kind === 'v4doc') { const p = pick([[192, 0, 2], [198, 51, 100], [203, 0, 113]], r); return p[0] + '.' + p[1] + '.' + p[2] + '.' + o(1, 254); }
    if (kind === 'v4priv') {
      const t = r(3);
      if (t === 0) return '10.' + o(0, 255) + '.' + o(0, 255) + '.' + o(1, 254);
      if (t === 1) return '172.' + o(16, 31) + '.' + o(0, 255) + '.' + o(1, 254);
      return '192.168.' + o(0, 255) + '.' + o(1, 254);
    }
    if (kind === 'v4pub') {
      for (;;) { const a = o(1, 223), b = o(0, 255), c = o(0, 255); if (!reservedV4(a, b, c)) return a + '.' + b + '.' + c + '.' + o(1, 254); }
    }
    const group = () => hex(r, 65536);
    if (kind === 'v6doc') return '2001:db8:' + [1, 2, 3, 4, 5, 6].map(group).join(':');
    if (kind === 'v6ula') return 'fd' + ('0' + hex(r, 256)).slice(-2) + ':' + [1, 2, 3, 4, 5, 6, 7].map(group).join(':');
    throw new Error('unknown kind');
  };
  const WORDS = ['alpha', 'beta', 'delta', 'orbit', 'river', 'maple', 'cloud', 'signal', 'nova', 'harbor', 'ember', 'lumen', 'pixel', 'quartz', 'summit', 'tundra', 'willow', 'zenith', 'cobalt', 'meadow', 'raven', 'ripple', 'atlas', 'comet', 'ginger', 'lantern'];
  const HOSTS = ['example.com', 'www.example.com', 'api.example.com', 'docs.example.com', 'example.org', 'www.example.org', 'example.net', 'shop.example.net'];
  pub.makeUrl = function (opts, r) {
    r = r || randInt; opts = opts || {};
    let u = (opts.https === false ? 'http://' : 'https://') + pick(HOSTS, r);
    if (opts.path !== false) { const n = 1 + r(3); const seg = []; for (let i = 0; i < n; i++) seg.push(pick(WORDS, r)); if (r(3) === 0) seg.push(String(1 + r(9999))); u += '/' + seg.join('/'); }
    if (opts.query) { const n = 1 + r(3); const q = []; for (let i = 0; i < n; i++) q.push(pick(['id', 'q', 'page', 'sort', 'ref', 'lang', 'tag'], r) + '=' + (r(2) ? String(1 + r(999)) : pick(WORDS, r))); u += '?' + q.join('&'); }
    return u;
  };
  const IPG_NOTES = {
    v4doc: '192.0.2.0/24, 198.51.100.0/24 and 203.0.113.0/24 are reserved for documentation and examples (RFC 5737), so they are safe to use in text and tests. These numbers are made up.',
    v4priv: 'The ranges 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 are for private networks such as a home or office (RFC 1918). They are not reachable from the internet. These numbers are made up.',
    v4pub: 'Random numbers that avoid the reserved ranges. They look like public addresses, but some of them may belong to real servers or people. They are not checked. Do not scan, probe or visit them, and do not present them as yours.',
    v6doc: '2001:db8::/32 is reserved for documentation (RFC 3849), so it is safe to use in text and tests. These addresses are made up.',
    v6ula: 'fd00::/8 holds unique local addresses (RFC 4193) for private networks. They are not routed on the internet. These addresses are made up.',
    url: 'The host names example.com, example.org and example.net are reserved for documentation. The paths and query strings are made up, so these links are examples. They are not checked and are not expected to lead anywhere useful.',
  };
  (function initGenerator() {
    const btn = $('ipg-generate'); if (!btn) return;
    const kind = $('ipg-kind'), count = $('ipg-count'), out = $('ipg-output'), msg = $('ipg-msg'), note = $('ipg-note'), lab = $('ipg-count-label'), urlopts = $('ipg-urlopts');
    let text = '';
    function generate() {
      let n = parseInt(count.value, 10);
      if (!Number.isFinite(n) || n < 1) { setMsg(msg, 'Enter how many to make, from 1 to 50.', 'error'); return; }
      if (n > 50) { n = 50; count.value = '50'; }
      urlopts.hidden = kind.value !== 'url';
      note.textContent = IPG_NOTES[kind.value];
      const lines = [];
      try {
        for (let i = 0; i < n; i++) lines.push(kind.value === 'url' ? pub.makeUrl({ https: $('ipg-https').checked, path: $('ipg-path').checked, query: $('ipg-query').checked }) : pub.makeIp(kind.value));
      } catch (e) { setMsg(msg, 'This browser has no secure random generator, so nothing was made.', 'error'); out.textContent = ''; text = ''; return; }
      setMsg(msg, '');
      text = lines.join('\n'); out.textContent = text; lab.textContent = '(' + n + ')';
    }
    btn.addEventListener('click', generate);
    [kind, $('ipg-https'), $('ipg-path'), $('ipg-query')].forEach((e) => e && e.addEventListener('change', generate));
    count.addEventListener('change', generate);
    $('ipg-copy').addEventListener('click', () => { if (!text) { toast('Nothing to copy yet'); return; } copy(text, 'Copied!'); });
    generate();
  })();

  // ---------------------------------------------------------------- query string builder
  pub.encodePart = function (s, plus) {
    let e = encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    return plus ? e.replace(/%20/g, '+') : e;
  };
  pub.buildQuery = function (text, o) {
    o = o || {};
    const pairs = []; const errors = [];
    String(text || '').split('\n').forEach((raw, i) => {
      const line = raw.replace(/\r$/, '');
      if (!line.trim()) return;
      const eq = line.indexOf('=');
      const key = (eq < 0 ? line : line.slice(0, eq)).trim();
      const val = eq < 0 ? null : line.slice(eq + 1).trim();
      if (!key) { errors.push('Line ' + (i + 1) + ' has no key before the "=".'); return; }
      if (o.skipEmpty && (val === null || val === '')) return;
      pairs.push([key, val]);
    });
    if (o.sort) pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const qs = pairs.map(([k, v]) => pub.encodePart(k, o.plus) + (v === null ? '' : '=' + pub.encodePart(v, o.plus))).join('&');
    let result = qs; let baseError = '';
    const base = String(o.base || '').trim();
    if (base) {
      let ok = true; try { const u = new URL(base); ok = u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { ok = false; }
      if (!ok) baseError = 'The base address needs to be a full http:// or https:// address.';
      else if (qs) {
        const hash = base.indexOf('#'); const head = hash < 0 ? base : base.slice(0, hash); const tail = hash < 0 ? '' : base.slice(hash);
        result = head + (head.includes('?') ? (/[?&]$/.test(head) ? '' : '&') : '?') + qs + tail;
      } else result = base;
    }
    return { text: result, count: pairs.length, errors, baseError };
  };
  function decodePart(s, plusIsSpace) {
    const t = plusIsSpace ? s.replace(/\+/g, ' ') : s;
    try { return { ok: true, v: decodeURIComponent(t) }; } catch (e) { return { ok: false, v: t }; }
  }
  const showCtl = (s) => s.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  pub.readQuery = function (text, o) {
    o = o || {};
    let src = String(text || '').trim();
    if (!src) return { text: '', count: 0, broken: [] };
    if (/^[a-z][a-z0-9+.-]*:/i.test(src)) { try { const u = new URL(src); src = u.search; } catch (e) { const q = src.indexOf('?'); src = q < 0 ? '' : src.slice(q); } }
    const hash = src.indexOf('#'); if (hash >= 0) src = src.slice(0, hash);
    if (src[0] === '?') src = src.slice(1);
    else if (/^[^=&]*\?/.test(src)) src = src.slice(src.indexOf('?') + 1);   // a path or address before the ?
    const lines = []; const broken = [];
    let pairs = src.split('&').filter((p) => p.length);
    if (o.skipEmpty) pairs = pairs.filter((p) => p.includes('=') && p.slice(p.indexOf('=') + 1) !== '');
    pairs.forEach((p, i) => {
      const eq = p.indexOf('=');
      const k = decodePart(eq < 0 ? p : p.slice(0, eq), o.plusIsSpace !== false);
      const v = eq < 0 ? null : decodePart(p.slice(eq + 1), o.plusIsSpace !== false);
      if (!k.ok || (v && !v.ok)) broken.push(i + 1);
      lines.push([showCtl(k.v), v === null ? null : showCtl(v.v)]);
    });
    if (o.sort) lines.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return { text: lines.map(([k, v]) => (v === null ? k : k + '=' + v)).join('\n'), count: lines.length, broken };
  };
  (function initQuery() {
    const mode = $('qs-mode'); if (!mode) return;
    const input = $('qs-input'), out = $('qs-output'), msg = $('qs-msg'), label = $('qs-out-label');
    let text = '';
    function render() {
      const read = mode.value === 'read';
      $('qs-space-wrap').hidden = read; $('qs-base-wrap').hidden = read; $('qs-plus-wrap').hidden = !read;
      label.textContent = read ? 'Parameters, decoded' : ($('qs-base').value.trim() ? 'Link' : 'Query string');
      input.placeholder = read ? 'https://example.com/search?q=hello%20world&lang=en' : 'q=hello world\nlang=en\ntag=a&b';
      if (!input.value.trim()) { out.textContent = ''; text = ''; setMsg(msg, ''); return; }
      if (read) {
        const r = pub.readQuery(input.value, { skipEmpty: $('qs-skip').checked, sort: $('qs-sort').checked, plusIsSpace: $('qs-plus').value === 'space' });
        out.textContent = r.text; text = r.text;
        if (r.broken.length) setMsg(msg, 'Part ' + r.broken.join(', ') + ' has a broken % sequence, so it is shown as it was written.', 'warn');
        else setMsg(msg, r.count ? r.count + ' parameter' + (r.count === 1 ? '' : 's') + '.' : 'No parameters found.', r.count ? 'ok' : '');
      } else {
        const r = pub.buildQuery(input.value, { skipEmpty: $('qs-skip').checked, sort: $('qs-sort').checked, plus: $('qs-space').value === 'plus', base: $('qs-base').value });
        out.textContent = r.text; text = r.text;
        if (r.errors.length) setMsg(msg, r.errors[0] + (r.errors.length > 1 ? ' (and ' + (r.errors.length - 1) + ' more)' : ''), 'error');
        else if (r.baseError) setMsg(msg, r.baseError, 'error');
        else setMsg(msg, r.count + ' parameter' + (r.count === 1 ? '' : 's') + '.', 'ok');
      }
    }
    ['input'].forEach((ev) => { input.addEventListener(ev, render); $('qs-base').addEventListener(ev, render); });
    ['qs-mode', 'qs-space', 'qs-plus', 'qs-skip', 'qs-sort'].forEach((id) => $(id).addEventListener('change', render));
    $('qs-copy').addEventListener('click', () => { if (!text) { toast('Nothing to copy yet'); return; } copy(text, 'Copied!'); });
    $('qs-clear').addEventListener('click', () => { input.value = ''; $('qs-base').value = ''; render(); input.focus(); });
    render();
  })();

  // ---------------------------------------------------------------- TinyURL shortener (sends to /api/shorten when you press the button)
  pub.checkTarget = function (raw) {
    const text = String(raw == null ? '' : raw).trim();
    if (!text) return { error: 'Paste a web address to shorten.' };
    if (text.length > 2048) return { error: 'That address is too long (limit 2048 characters).' };
    if (/[\u0000-\u001f\u007f\s]/.test(text)) return { error: 'The address cannot contain spaces.' };
    let u; try { u = new URL(text); } catch (e) { return { error: 'That does not look like a full web address. Start it with http or https and a domain name.' }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'Only http:// and https:// addresses can be shortened.' };
    if (u.username || u.password) return { error: 'Addresses with a user name or password in them are not accepted.' };
    const host = u.hostname.toLowerCase();
    if (host.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return { error: 'Addresses made of an IP number are not accepted. Use a normal domain name.' };
    if (host === 'localhost' || !host.includes('.')) return { error: 'That is not a public website address, so it cannot be shortened.' };
    if (host === 'tinyurl.com' || host.endsWith('.tinyurl.com')) return { error: 'That is already a TinyURL link.' };
    return { url: u.href };
  };
  pub.tinyLink = function (v) {
    if (typeof v !== 'string' || v.length > 200) return '';
    let u; try { u = new URL(v); } catch (e) { return ''; }
    if (u.protocol !== 'https:' || u.hostname !== 'tinyurl.com' || u.username || u.password || u.search || u.hash) return '';
    return /^\/[A-Za-z0-9_-]{3,60}$/.test(u.pathname) ? u.href : '';
  };
  (function initTiny() {
    const btn = $('tinyurl-btn'); if (!btn) return;
    const input = $('tinyurl-input'), status = $('tinyurl-status'), done = $('tinyurl-done'), out = $('tinyurl-output'), open = $('tinyurl-open');
    let busy = false, link = '';
    function showResult(l) {
      link = l; done.hidden = !l;
      if (l) { out.textContent = l; open.href = l; } else { out.textContent = ''; open.removeAttribute('href'); }
    }
    async function shorten() {
      if (busy) return;
      const t = pub.checkTarget(input.value);
      showResult('');
      if (t.error) { setMsg(status, t.error, 'error'); input.focus(); return; }
      busy = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); const label = btn.textContent; btn.textContent = 'Shortening…';
      setMsg(status, 'Sending the address to TinyURL through this website’s server…');
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 25000);
      try {
        const res = await fetch('/api/shorten', { method: 'POST', credentials: 'omit', cache: 'no-store', signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', 'X-LU-Shorten': '1' }, body: JSON.stringify({ url: t.url }) });
        let j = null; try { j = await res.json(); } catch (e) { /* not JSON */ }
        const short = j && j.ok === true ? pub.tinyLink(j.short) : '';
        if (res.ok && short) { showResult(short); setMsg(status, 'Done. The short link is public, so anyone who has it can use it.', 'ok'); }
        else if (res.ok) setMsg(status, 'The server answered, but not with a usable short link, so none was made.', 'error');
        else if (j && typeof j.message === 'string' && j.message.length < 200) setMsg(status, j.message, 'error');
        else if (res.status === 404) setMsg(status, 'Link shortening is not available on this copy of the site.', 'error');
        else if (res.status === 429) setMsg(status, 'Too many links shortened. Wait a little and try again.', 'error');
        else setMsg(status, 'Shortening failed (error ' + res.status + '). Try again later.', 'error');
      } catch (e) {
        setMsg(status, e && e.name === 'AbortError' ? 'That took too long. Nothing was confirmed, so try again.' : 'Could not reach the server. Check your connection and try again.', 'error');
      } finally { clearTimeout(timer); busy = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = label; }
    }
    btn.addEventListener('click', shorten);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); shorten(); } });
    $('tinyurl-copy').addEventListener('click', () => { if (link) copy(link, 'Short link copied!'); });
    $('tinyurl-clear').addEventListener('click', () => { input.value = ''; showResult(''); setMsg(status, ''); input.focus(); });
  })();

  window.LuTools11 = pub;
})();
