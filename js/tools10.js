/* Luka's Utils v10.0: extra tools for the category pages.
   Each tool starts only if its panel is on the page. Everything here runs locally: no network calls and nothing is stored.
   Shared helpers (copy, toast, permission names) come from window.LuBridge in script.js. */
(function () {
  'use strict';
  const UI = window.LuBridge || {};
  const $ = (id) => { const e = document.getElementById(id); return e && e.isConnected ? e : null; };
  const toast = (m, ms) => { if (UI.showToast) UI.showToast(m, ms); };
  async function copy(text, ok) { if (UI.copyText && await UI.copyText(text)) toast(ok || 'Copied!'); }
  const cp = (s) => Array.from(s).length;                 // length in code points, like the Message length tool
  const setMsg = (el, text, kind) => { if (!el) return; el.textContent = text || ''; if (kind) el.dataset.kind = kind; else delete el.dataset.kind; };
  const clearEl = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };
  function h(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (kids || []).forEach((c) => { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  const copyBtn = (text, label) => { const b = h('button', { type: 'button', class: 'btn-outline small t10-mini', 'aria-label': 'Copy ' + (label || 'value'), text: 'Copy' }); b.addEventListener('click', () => copy(text)); return b; };
  // A row for <dl class="t10-kv">: label, value, optional copy button.
  function kvRow(label, value, opts) {
    opts = opts || {};
    const dd = h('dd', null, [opts.plain ? document.createTextNode(String(value)) : h('code', { text: String(value) })]);
    if (opts.copy !== false && opts.copy) dd.appendChild(copyBtn(opts.copy === true ? String(value) : opts.copy, label.toLowerCase()));
    const row = h('div', { class: 't10-row' + (opts.kind ? ' is-' + opts.kind : '') }, [h('dt', { text: label }), dd]);
    return row;
  }
  const SNOW_EPOCH = 1420070400000n;
  const isSnowId = (s) => /^\d{17,20}$/.test(s);
  function snowDate(id) { return new Date(Number((BigInt(id) >> 22n) + SNOW_EPOCH)); }
  const utc = (d) => d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  function snowCreated(id) {
    const d = snowDate(id);
    if (d.getTime() > Date.now() + 864e5) return utc(d) + ' (in the future, so probably not a real ID)';
    return utc(d);
  }
  const pub = {};  // pure functions, exposed for the tests

  /* ---------- 1. Bot invite link ---------- */
  pub.buildInvite = function (o) {
    const id = (o.clientId || '').trim(), p = (o.perms || '').trim(), r = (o.redirect || '').trim(), sc = o.scopes || [];
    if (!id) return { error: 'Enter your application ID to build the link.', empty: true };
    if (!/^\d{17,20}$/.test(id)) return { error: 'An application ID is 17 to 20 digits. Copy it from the Developer Portal.' };
    if (!sc.length) return { error: 'Pick at least one scope.' };
    let permsOut = null;
    if (p) {
      if (!/^\d+$/.test(p) || BigInt(p) >= (1n << 64n)) return { error: 'The permissions value must be a whole number (digits only).' };
      permsOut = BigInt(p).toString();
    }
    if (r) {
      let u; try { u = new URL(r); } catch (e) { return { error: 'The redirect URI isn’t a valid link. Start it with https.' }; }
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'The redirect URI must start with https:// (http is only for local testing).' };
    }
    let url = 'https://discord.com/oauth2/authorize?client_id=' + id;
    const hints = [];
    if (permsOut !== null && sc.includes('bot')) url += '&permissions=' + permsOut;
    else if (permsOut !== null) hints.push('Permissions only apply with the bot scope, so they were left out.');
    url += '&scope=' + sc.map(encodeURIComponent).join('%20');
    if (r) url += '&response_type=code&redirect_uri=' + encodeURIComponent(r);
    else if (sc.some((s) => s === 'identify' || s === 'guilds' || s === 'email')) hints.push('Sign-in scopes normally need a redirect URI.');
    return { url, hints };
  };
  function permSummary(valueStr) {
    const names = UI.permissions || [];
    let v; try { v = BigInt(valueStr); } catch (e) { return ''; }
    if (v === 0n) return 'No permissions.';
    if ((v >> 3n) & 1n) return 'Includes Administrator, which grants every permission.';
    const have = names.filter(([b]) => (v >> BigInt(b)) & 1n).map(([, n]) => n);
    let known = 0n; names.forEach(([b]) => { known |= 1n << BigInt(b); });
    const other = (v & ~known) !== 0n;
    const shown = have.slice(0, 6).join(', ') + (have.length > 6 ? ' and ' + (have.length - 6) + ' more' : '');
    return (have.length ? have.length + ' permission' + (have.length === 1 ? '' : 's') + ': ' + shown + '.' : '') + (other ? ' Also sets newer permission bits this list doesn’t name.' : '');
  }
  (function () {
    const out = $('oauth-output'); if (!out) return;
    const cid = $('oauth-client-id'), perms = $('oauth-perms'), redirect = $('oauth-redirect'), msg = $('oauth-msg'), note = $('oauth-perms-note');
    const scopes = Array.from(document.querySelectorAll('[data-oauth-scope]'));
    function render() {
      const r = pub.buildInvite({ clientId: cid.value, perms: perms.value, redirect: redirect.value, scopes: scopes.filter((s) => s.checked).map((s) => s.dataset.oauthScope) });
      const p = perms.value.trim();
      note.textContent = p && /^\d+$/.test(p) && BigInt(p) < (1n << 64n) ? permSummary(p) : (p ? 'Digits only.' : '');
      if (r.url) { out.textContent = r.url; delete out.dataset.state; setMsg(msg, r.hints.join(' '), r.hints.length ? 'warn' : ''); }
      else { out.textContent = ''; delete out.dataset.state; setMsg(msg, r.error, r.empty ? '' : 'error'); }
    }
    [cid, perms, redirect].forEach((e) => e.addEventListener('input', render));
    scopes.forEach((s) => s.addEventListener('change', render));
    $('oauth-copy').addEventListener('click', () => { if (!out.textContent) { toast('Nothing to copy yet'); return; } copy(out.textContent, 'Link copied!'); });
    render();
  })();

  /* ---------- 2. Gateway intents ---------- */
  (function () {
    const grid = $('intents-grid'); if (!grid) return;
    const boxes = Array.from(grid.querySelectorAll('[data-intent-bit]'));
    const input = $('intents-value'), note = $('intents-note');
    const PRIV = [1, 8, 15];
    let known = 0n; boxes.forEach((b) => { known |= 1n << BigInt(b.dataset.intentBit); });
    let extra = 0n;
    const fromBoxes = () => { let v = extra; boxes.forEach((b) => { if (b.checked) v |= 1n << BigInt(b.dataset.intentBit); }); return v; };
    function toBoxes(v) { boxes.forEach((b) => { b.checked = ((v >> BigInt(b.dataset.intentBit)) & 1n) === 1n; }); }
    function renderNote(v) {
      const pr = boxes.filter((b) => b.checked && PRIV.includes(Number(b.dataset.intentBit))).map((b) => b.parentNode.querySelector('span').textContent);
      const bits = [];
      if (extra) bits.push('Bits Discord hasn’t assigned are kept: ' + extra.toString() + '.');
      if (pr.length) bits.push('Privileged: ' + pr.join(', ') + '. Switch these on in the Developer Portal too.');
      if (!bits.length) bits.push(v === 0n ? 'No intents selected.' : 'Value ' + v.toString() + ' (0x' + v.toString(16).toUpperCase() + ').');
      note.textContent = bits.join(' '); delete note.dataset.kind;
    }
    function fromInput() {
      const s = input.value.trim();
      if (!s) { extra = 0n; toBoxes(0n); renderNote(0n); return; }
      if (!/^\d+$/.test(s) || BigInt(s) >= (1n << 64n)) { note.textContent = 'Enter a whole number (digits only).'; note.dataset.kind = 'error'; return; }
      const v = BigInt(s); extra = v & ~known; toBoxes(v); renderNote(v);
    }
    function fromChecks() { const v = fromBoxes(); input.value = v === 0n ? '' : v.toString(); renderNote(v); }
    input.addEventListener('input', fromInput);
    boxes.forEach((b) => b.addEventListener('change', fromChecks));
    $('intents-nonpriv').addEventListener('click', () => { extra = 0n; boxes.forEach((b) => { b.checked = !PRIV.includes(Number(b.dataset.intentBit)); }); fromChecks(); });
    $('intents-all').addEventListener('click', () => { extra = 0n; boxes.forEach((b) => { b.checked = true; }); fromChecks(); });
    $('intents-clear').addEventListener('click', () => { extra = 0n; boxes.forEach((b) => { b.checked = false; }); fromChecks(); });
    $('intents-copy').addEventListener('click', () => { const v = fromBoxes(); copy(v.toString()); });
    renderNote(0n);
  })();

  /* ---------- 3. Discord link parser ---------- */
  pub.parseDiscordLinks = function (text) {
    const re = /(?:https?:\/\/)?(?:(?:ptb\.|canary\.)?discord(?:app)?\.com|discord:\/\/-?)\/channels\/(@me|\d{17,20})\/(\d{17,20})(?:\/(\d{17,20}))?/gi;
    const seen = new Set(), out = []; let m;
    while ((m = re.exec(text)) !== null) {
      const guild = m[1], channel = m[2], message = m[3] || null;
      const key = guild + '/' + channel + '/' + (message || '');
      if (seen.has(key)) continue; seen.add(key);
      out.push({ type: guild === '@me' ? (message ? 'Message in a DM' : 'DM channel') : (message ? 'Message in a server' : 'Channel in a server'), guildId: guild === '@me' ? null : guild, channelId: channel, messageId: message, link: 'https://discord.com/channels/' + guild + '/' + channel + (message ? '/' + message : '') });
    }
    return out;
  };
  (function () {
    const input = $('dlink-input'); if (!input) return;
    const res = $('dlink-results'), msg = $('dlink-msg');
    let last = [];
    function render() {
      clearEl(res); last = pub.parseDiscordLinks(input.value);
      if (!input.value.trim()) { setMsg(msg, ''); return; }
      if (!last.length) { setMsg(msg, 'No Discord message or channel links found. They look like discord.com/channels/server/channel/message.', 'error'); return; }
      setMsg(msg, last.length + ' link' + (last.length === 1 ? '' : 's') + ' found.');
      last.forEach((l) => {
        const dl = h('dl', { class: 't10-kv' });
        dl.appendChild(kvRow('Link', l.link, { copy: true }));
        if (l.guildId) dl.appendChild(kvRow('Server ID', l.guildId, { copy: true }));
        dl.appendChild(kvRow('Channel ID', l.channelId, { copy: true }));
        if (l.messageId) dl.appendChild(kvRow('Message ID', l.messageId, { copy: true }));
        const when = l.messageId || l.channelId;
        dl.appendChild(kvRow(l.messageId ? 'Message sent' : 'Channel created', snowCreated(when), { plain: true }));
        res.appendChild(h('section', { class: 't10-card' }, [h('h5', { class: 't10-card-title', text: l.type }), dl]));
      });
    }
    input.addEventListener('input', render);
    $('dlink-copy').addEventListener('click', () => {
      if (!last.length) { toast('Nothing to copy yet'); return; }
      copy(JSON.stringify(last.map((l) => ({ type: l.type, guildId: l.guildId, channelId: l.channelId, messageId: l.messageId, createdAt: snowDate(l.messageId || l.channelId).toISOString() })), null, 2));
    });
    $('dlink-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  })();

  /* ---------- 4. Embed & payload validator ---------- */
  const PAYLOAD_KEYS = ['content', 'username', 'avatar_url', 'tts', 'embeds', 'allowed_mentions', 'components', 'files', 'payload_json', 'attachments', 'flags', 'thread_name', 'applied_tags', 'poll'];
  const EMBED_KEYS = ['title', 'type', 'description', 'url', 'timestamp', 'color', 'footer', 'image', 'thumbnail', 'video', 'provider', 'author', 'fields'];
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isMediaUrl = (s) => { if (/^attachment:\/\/[^/\s]+$/.test(s)) return true; try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:'; } catch (e) { return false; } };
  pub.validatePayload = function (text) {
    const issues = [], add = (sev, path, msg) => issues.push({ sev, path, msg });
    let data;
    try { data = JSON.parse(text); } catch (e) { return { parseError: e.message, issues, stats: null }; }
    let content = null, embeds = [], base = '';
    if (Array.isArray(data)) { embeds = data; base = ''; }
    else if (isObj(data) && (PAYLOAD_KEYS.some((k) => k in data))) {
      Object.keys(data).forEach((k) => { if (!PAYLOAD_KEYS.includes(k)) add('warn', k, 'Not a known webhook field, so Discord will ignore it.'); });
      if ('content' in data) { if (typeof data.content !== 'string') add('error', 'content', 'content must be text.'); else { content = data.content; if (cp(content) > 2000) add('error', 'content', 'content is ' + cp(content) + ' characters. The limit is 2000.'); } }
      if ('username' in data && (typeof data.username !== 'string' || cp(data.username) > 80 || !data.username.length)) add('error', 'username', 'username must be 1 to 80 characters.');
      if ('embeds' in data) { if (!Array.isArray(data.embeds)) add('error', 'embeds', 'embeds must be a list.'); else embeds = data.embeds; }
      if (embeds.length === 0 && !content && !('components' in data) && !('files' in data) && !('poll' in data) && !('attachments' in data)) add('error', '', 'Nothing to send: add content or at least one embed.');
    } else if (isObj(data) && EMBED_KEYS.some((k) => k in data)) { embeds = [data]; }
    else return { parseError: 'This isn’t a webhook payload or an embed. Expected keys such as content, embeds, title or description.', issues, stats: null };
    if (embeds.length > 10) add('error', 'embeds', embeds.length + ' embeds. A message can have at most 10.');
    let total = 0;
    const len = (path, v, max, label) => {
      if (typeof v !== 'string') { add('error', path, label + ' must be text.'); return 0; }
      const n = cp(v); if (n > max) add('error', path, label + ' is ' + n + ' characters. The limit is ' + max + '.'); return n;
    };
    const urlCheck = (path, v, label) => { if (typeof v !== 'string' || !isMediaUrl(v)) add('error', path, label + ' must be a link starting with https:// (or attachment://file.png).'); };
    embeds.forEach((e, i) => {
      const p = (embeds.length === 1 && !('embeds' in (isObj(data) ? data : {})) ? '' : 'embeds[' + i + ']');
      const at = (k) => (p ? p + '.' : '') + k;
      if (!isObj(e)) { add('error', p || 'embed', 'Each embed must be an object.'); return; }
      Object.keys(e).forEach((k) => { if (!EMBED_KEYS.includes(k)) add('warn', at(k), 'Not a known embed field, so Discord will ignore it.'); });
      let any = false;
      if ('title' in e) { total += len(at('title'), e.title, 256, 'title'); any = any || !!e.title; }
      if ('description' in e) { total += len(at('description'), e.description, 4096, 'description'); any = any || !!e.description; }
      if ('url' in e) urlCheck(at('url'), e.url, 'url');
      if ('timestamp' in e && (typeof e.timestamp !== 'string' || isNaN(Date.parse(e.timestamp)) || !/^\d{4}-\d\d-\d\dT/.test(e.timestamp))) add('error', at('timestamp'), 'timestamp must be an ISO 8601 date like 2026-10-23T06:57:00.000Z.');
      if ('color' in e) {
        if (typeof e.color === 'string') add('error', at('color'), /^#?[0-9a-f]{6}$/i.test(e.color) ? 'color must be a number, not hex text. Use ' + parseInt(e.color.replace('#', ''), 16) + ' for ' + e.color + '.' : 'color must be a number from 0 to 16777215.');
        else if (!Number.isInteger(e.color) || e.color < 0 || e.color > 16777215) add('error', at('color'), 'color must be a whole number from 0 to 16777215.');
      }
      ['image', 'thumbnail'].forEach((k) => { if (k in e) { if (!isObj(e[k])) add('error', at(k), k + ' must be an object like {"url": "https://…"}.'); else urlCheck(at(k + '.url'), e[k].url, k + '.url'); any = true; } });
      if ('footer' in e) { any = true; if (!isObj(e.footer)) add('error', at('footer'), 'footer must be an object like {"text": "…"}.'); else { if (!('text' in e.footer)) add('error', at('footer.text'), 'footer needs a text.'); else total += len(at('footer.text'), e.footer.text, 2048, 'footer.text'); if ('icon_url' in e.footer) urlCheck(at('footer.icon_url'), e.footer.icon_url, 'footer.icon_url'); } }
      if ('author' in e) { any = true; if (!isObj(e.author)) add('error', at('author'), 'author must be an object like {"name": "…"}.'); else { if (!('name' in e.author)) add('error', at('author.name'), 'author needs a name.'); else total += len(at('author.name'), e.author.name, 256, 'author.name'); ['url', 'icon_url'].forEach((k) => { if (k in e.author) urlCheck(at('author.' + k), e.author[k], 'author.' + k); }); } }
      if ('fields' in e) {
        if (!Array.isArray(e.fields)) add('error', at('fields'), 'fields must be a list.');
        else {
          if (e.fields.length > 25) add('error', at('fields'), e.fields.length + ' fields. An embed can have at most 25.');
          if (e.fields.length) any = true;
          e.fields.forEach((f, j) => {
            const fp = at('fields[' + j + ']');
            if (!isObj(f)) { add('error', fp, 'Each field must be an object with a name and a value.'); return; }
            if (typeof f.name !== 'string' || !f.name.trim()) add('error', fp + '.name', 'name can’t be empty.'); else total += len(fp + '.name', f.name, 256, 'name');
            if (typeof f.value !== 'string' || !f.value.trim()) add('error', fp + '.value', 'value can’t be empty.'); else total += len(fp + '.value', f.value, 1024, 'value');
            if ('inline' in f && typeof f.inline !== 'boolean') add('error', fp + '.inline', 'inline must be true or false.');
          });
        }
      }
      if (!any && !e.video) add('warn', p || 'embed', 'This embed is empty, so Discord will probably reject or hide it.');
    });
    if (total > 6000) add('error', '', 'The embeds add up to ' + total + ' characters. The limit across one message is 6000.');
    issues.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'error' ? -1 : 1));
    return { issues, stats: { embeds: embeds.length, total, content: content == null ? null : cp(content) } };
  };
  (function () {
    const input = $('echeck-input'); if (!input) return;
    const sum = $('echeck-summary'), list = $('echeck-issues');
    const SAMPLE = '{\n  "content": "Server update",\n  "embeds": [\n    {\n      "title": "Maintenance tonight",\n      "description": "We’ll be down for about 10 minutes.",\n      "color": 2278750,\n      "fields": [\n        { "name": "When", "value": "22:00 UTC", "inline": true }\n      ],\n      "footer": { "text": "Thanks for your patience" }\n    }\n  ]\n}';
    function render() {
      clearEl(list); clearEl(sum);
      const t = input.value;
      if (!t.trim()) { return; }
      const r = pub.validatePayload(t);
      if (r.parseError) { sum.appendChild(h('p', { class: 't10-msg', 'data-kind': 'error', text: 'Not valid JSON: ' + r.parseError })); return; }
      const errs = r.issues.filter((i) => i.sev === 'error').length, warns = r.issues.length - errs;
      sum.appendChild(h('p', { class: 't10-msg', 'data-kind': errs ? 'error' : (warns ? 'warn' : 'ok'), text: !r.issues.length ? 'No problems found.' : errs + ' error' + (errs === 1 ? '' : 's') + (warns ? ', ' + warns + ' warning' + (warns === 1 ? '' : 's') : '') + '.' }));
      const st = r.stats, bits = [];
      if (st.content != null) bits.push('content ' + st.content + ' / 2000');
      bits.push(st.embeds + ' embed' + (st.embeds === 1 ? '' : 's') + ' (max 10)');
      bits.push('embed text ' + st.total + ' / 6000');
      sum.appendChild(h('p', { class: 't10-hint', text: bits.join(' · ') }));
      r.issues.forEach((i) => list.appendChild(h('li', { class: 't10-issue is-' + i.sev }, [h('span', { class: 't10-badge', text: i.sev === 'error' ? 'Error' : 'Warning' }), i.path ? h('code', { text: i.path }) : null, h('span', { text: i.msg })])));
    }
    input.addEventListener('input', render);
    $('echeck-sample').addEventListener('click', () => { input.value = SAMPLE; render(); });
    $('echeck-builder').addEventListener('click', () => {
      const src = document.getElementById('embed-json-output');
      const txt = src && src.isConnected ? src.textContent.trim() : '';
      if (!txt) { toast('Build an embed in the Embed builder first'); return; }
      input.value = txt; render();
    });
  })();

  /* ---------- 5. Webhook URL inspector ---------- */
  pub.parseWebhook = function (raw) {
    const s = (raw || '').trim();
    if (!s) return { empty: true };
    const m = s.match(/^(https?):\/\/((?:(?:ptb|canary)\.)?discord(?:app)?\.com)\/api(?:\/(v\d+))?\/webhooks\/(\d+)\/([^/?#\s]+)(\/(?:slack|github))?\/?(?:\?([^#\s]*))?(?:#.*)?$/i);
    if (!m) {
      if (/discord\.gg\/|discord\.com\/invite\//i.test(s)) return { error: 'That’s an invite link, not a webhook URL. Use the Invite formatter or Invite lookup instead.' };
      if (/\/channels\/\d+/.test(s)) return { error: 'That’s a message or channel link, not a webhook URL. Try the Link parser.' };
      if (/discord(?:app)?\.com\/api\/webhooks\//i.test(s)) return { error: 'The webhook ID or token is missing or malformed. A webhook URL ends in /ID/TOKEN.' };
      return { error: 'This isn’t a Discord webhook URL. It should look like https://discord.com/api/webhooks/ID/TOKEN.' };
    }
    const [, scheme, host, ver, id, token, compat, query] = m;
    const out = { scheme: scheme.toLowerCase(), host: host.toLowerCase(), version: ver || null, id, token, compat: compat ? compat.slice(1) : null, query: query || '', warnings: [] };
    if (!isSnowId(id)) { return { error: 'The webhook ID should be 17 to 20 digits. This one is ' + id.length + '.' }; }
    if (!/^[A-Za-z0-9._-]{20,}$/.test(token)) return { error: 'The token looks wrong. It should be a long run of letters, numbers, - and _.' };
    if (out.scheme !== 'https') out.warnings.push('Uses plain http. Discord only accepts https.');
    if (/discordapp\.com$/.test(out.host)) out.warnings.push('discordapp.com is the old domain. It still works, but discord.com is the current one.');
    if (token.length !== 68) out.warnings.push('Tokens are normally 68 characters long. This one is ' + token.length + ', so it may be cut off or edited.');
    const q = new URLSearchParams(out.query); out.threadId = q.get('thread_id'); out.wait = q.get('wait');
    if (out.threadId && !isSnowId(out.threadId)) out.warnings.push('thread_id should be 17 to 20 digits.');
    out.clean = 'https://discord.com/api/webhooks/' + id + '/' + token;
    return out;
  };
  (function () {
    const input = $('whi-input'); if (!input) return;
    const msg = $('whi-msg'), outEl = $('whi-out');
    function render() {
      clearEl(outEl); outEl.hidden = true;
      const r = pub.parseWebhook(input.value);
      if (r.empty) { setMsg(msg, ''); return; }
      if (r.error) { setMsg(msg, r.error, 'error'); return; }
      setMsg(msg, r.warnings.length ? r.warnings.join(' ') : 'The format looks valid.', r.warnings.length ? 'warn' : 'ok');
      outEl.hidden = false;
      outEl.appendChild(kvRow('Webhook ID', r.id, { copy: true }));
      outEl.appendChild(kvRow('Created', snowCreated(r.id), { plain: true }));
      outEl.appendChild(kvRow('Token', r.token.slice(0, 4) + '••••••••' + r.token.slice(-4) + ' (' + r.token.length + ' characters)', { plain: true }));
      outEl.appendChild(kvRow('Host', r.host + (r.version ? ' · API ' + r.version : ''), { plain: true }));
      if (r.compat) outEl.appendChild(kvRow('Compatibility mode', r.compat + ' (expects a ' + r.compat + '-style payload)', { plain: true }));
      if (r.threadId) outEl.appendChild(kvRow('Thread ID', r.threadId, { copy: true }));
      if (r.wait) outEl.appendChild(kvRow('wait', r.wait, { plain: true }));
    }
    input.addEventListener('input', render);
    render();
  })();
  // Show/hide eye for the password-style fields in these tools.
  document.addEventListener('click', (e) => {
    const t = e.target.closest ? e.target.closest('[data-pw-toggle]') : null;
    if (!t || !t.isConnected) return;
    const field = document.getElementById(t.dataset.pwToggle); if (!field || !field.isConnected) return;
    const show = field.type === 'password';
    const a = field.selectionStart, b = field.selectionEnd;
    field.type = show ? 'text' : 'password';
    t.setAttribute('aria-pressed', String(show));
    const label = show ? 'Hide webhook URL' : 'Show webhook URL';
    t.setAttribute('aria-label', label); t.setAttribute('title', label);
    t.querySelector('.pw-eye').toggleAttribute('hidden', show);
    t.querySelector('.pw-eye-off').toggleAttribute('hidden', !show);
    try { field.setSelectionRange(a, b); } catch (err) {}
  });

  /* ---------- 6. Webhook code snippets ---------- */
  function pyLit(v, ind) {
    ind = ind || 0; const pad = '    '.repeat(ind + 1), end = '    '.repeat(ind);
    if (v === null) return 'None'; if (v === true) return 'True'; if (v === false) return 'False';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return JSON.stringify(v).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    if (Array.isArray(v)) return v.length ? '[\n' + v.map((x) => pad + pyLit(x, ind + 1)).join(',\n') + '\n' + end + ']' : '[]';
    const k = Object.keys(v); return k.length ? '{\n' + k.map((x) => pad + JSON.stringify(x) + ': ' + pyLit(v[x], ind + 1)).join(',\n') + '\n' + end + '}' : '{}';
  }
  pub.pyLit = pyLit;
  pub.webhookSnippet = function (lang, text, o) {
    o = o || {};
    let obj; try { obj = JSON.parse(text); } catch (e) { return { error: 'The payload isn’t valid JSON: ' + e.message }; }
    if (!isObj(obj)) return { error: 'The payload must be a JSON object, like {"content": "Hello"}.' };
    const thread = (o.thread || '').trim();
    if (thread && !isSnowId(thread)) return { error: 'The thread ID should be 17 to 20 digits.' };
    const q = []; if (o.wait) q.push('wait=true'); if (thread) q.push('thread_id=' + thread);
    const url = 'https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN' + (q.length ? '?' + q.join('&') : '');
    const pretty = JSON.stringify(obj, null, 2);
    if (lang === 'curl') return { code: 'curl -X POST "' + url + '" \\\n  -H "Content-Type: application/json" \\\n  -d \'' + pretty.replace(/'/g, "'\\''") + '\'', note: 'For bash or zsh. On Windows cmd, save the JSON to payload.json and use -d @payload.json instead.' };
    if (lang === 'js') return { code: '// Node 18+ or any modern browser. Read the URL from an environment variable in real projects.\nconst WEBHOOK_URL = "' + url + '";\n\nconst payload = ' + pretty + ';\n\nconst res = await fe' + 'tch(WEBHOOK_URL, {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(payload),\n});\nif (!res.ok) throw new Error("Webhook failed: " + res.status + " " + (await res.text()));', note: 'Uses top-level await, so save it as an .mjs file or wrap it in an async function.' };
    if (lang === 'python') return { code: 'import requests\n\nWEBHOOK_URL = "' + url + '"  # keep the real one in an environment variable\n\npayload = ' + pyLit(obj) + '\n\nresponse = requests.post(WEBHOOK_URL, json=payload, timeout=10)\nresponse.raise_for_status()', note: 'Needs the requests package (pip install requests).' };
    return { error: 'Unknown language.' };
  };
  (function () {
    const input = $('wcode-input'); if (!input) return;
    const out = $('wcode-output'), msg = $('wcode-msg'), wait = $('wcode-wait'), thread = $('wcode-thread');
    let lang = 'curl';
    function render() {
      const r = pub.webhookSnippet(lang, input.value, { wait: wait.checked, thread: thread.value });
      if (r.code) { out.textContent = r.code; delete out.dataset.state; setMsg(msg, r.note, 'hint'); }
      else { out.textContent = r.error; out.dataset.state = 'error'; setMsg(msg, '', ''); }
    }
    document.querySelectorAll('[data-wcode-lang]').forEach((b) => b.addEventListener('click', () => {
      lang = b.dataset.wcodeLang; document.querySelectorAll('[data-wcode-lang]').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); }); render();
    }));
    [input, thread].forEach((e) => e.addEventListener('input', render)); wait.addEventListener('change', render);
    $('wcode-copy').addEventListener('click', () => { if (out.dataset.state === 'error' || !out.textContent) { toast('Nothing to copy: fix the payload first'); return; } copy(out.textContent, 'Snippet copied!'); });
    render();
  })();

  /* ---------- 7. Table formatter ---------- */
  function cellWidth(s) {
    let w = 0;
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c === 0x200d || (c >= 0xfe00 && c <= 0xfe0f) || /\p{M}|\p{Cf}/u.test(ch)) continue;
      w += ((c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe6f) || (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x1f300 && c <= 0x1f64f) || (c >= 0x1f900 && c <= 0x1f9ff) || (c >= 0x20000 && c <= 0x3fffd)) ? 2 : 1;
    }
    return w;
  }
  pub.parseTable = function (text) {
    const t = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    if (!t.trim()) return { rows: [], delim: ',' };
    const lines = t.split('\n');
    let delim = ',';
    if (lines.some((l) => l.includes('\t'))) delim = '\t';
    else if (lines.some((l) => l.includes('|'))) delim = '|';
    let rows;
    if (delim === '|') {
      rows = lines.filter((l) => !(/^[\s|:\-]+$/.test(l) && l.includes('-'))).map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    } else {
      rows = []; let row = [], cell = '', q = false, i = 0;
      while (i < t.length) {
        const ch = t[i];
        if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
        else if (ch === '"' && cell === '') q = true;
        else if (ch === delim) { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else cell += ch;
        i++;
      }
      row.push(cell); rows.push(row);
      rows = rows.map((r) => r.map((c) => c.replace(/\s*\n\s*/g, ' ').trim()));
    }
    rows = rows.filter((r) => r.some((c) => c !== ''));
    return { rows, delim };
  };
  pub.formatTable = function (rows, o) {
    o = o || {};
    const n = Math.max(0, ...rows.map((r) => r.length));
    const data = rows.map((r) => { const c = r.slice(); while (c.length < n) c.push(''); return c; });
    if (!data.length) return '';
    const style = o.style || 'ascii', header = o.header !== false;
    const widths = []; for (let c = 0; c < n; c++) widths.push(Math.max(1, ...data.map((r) => cellWidth(r[c]))));
    const numeric = []; for (let c = 0; c < n; c++) numeric.push(data.slice(header ? 1 : 0).length > 0 && data.slice(header ? 1 : 0).every((r) => r[c] === '' || /^[-+]?[\d.,]+%?$/.test(r[c])) && data.slice(header ? 1 : 0).some((r) => r[c] !== ''));
    const al = (c) => (o.align === 'auto' ? (numeric[c] ? 'right' : 'left') : (o.align || 'left'));
    const pad = (s, c) => { const gap = widths[c] - cellWidth(s), a = al(c); if (a === 'right') return ' '.repeat(gap) + s; if (a === 'center') { const l = Math.floor(gap / 2); return ' '.repeat(l) + s + ' '.repeat(gap - l); } return s + ' '.repeat(gap); };
    const line = (r, L, M, R) => L + r.map((s, c) => ' ' + pad(s, c) + ' ').join(M) + R;
    const out = [];
    if (style === 'md') {
      const hd = header ? data[0] : data[0].map(() => '');
      out.push(line(hd, '|', '|', '|'));
      out.push('|' + widths.map((w, c) => { const a = al(c), d = '-'.repeat(Math.max(3, w)); return ' ' + (a === 'right' ? d.slice(0, -1) + ':' : a === 'center' ? ':' + d.slice(1, -1) + ':' : ':' + d.slice(1)) + ' '; }).join('|') + '|');
      data.slice(header ? 1 : 0).forEach((r) => out.push(line(r, '|', '|', '|')));
      // markdown pipes need every column at least 3 wide for the divider; widen if needed
      return out.join('\n');
    }
    if (style === 'space') {
      data.forEach((r, i) => { out.push(r.map((s, c) => pad(s, c)).join('  ').replace(/\s+$/, '')); if (header && i === 0) out.push(widths.map((w) => '-'.repeat(w)).join('  ')); });
      return out.join('\n');
    }
    const box = style === 'box';
    const hz = box ? '─' : '-', rule = (L, M, R, ch) => L + widths.map((w) => ch.repeat(w + 2)).join(M) + R;
    const V = box ? '│' : '|';
    out.push(box ? rule('┌', '┬', '┐', hz) : rule('+', '+', '+', hz));
    data.forEach((r, i) => {
      out.push(line(r, V, V, V));
      if (header && i === 0 && data.length > 1) out.push(box ? rule('├', '┼', '┤', hz) : rule('+', '+', '+', '='));
    });
    out.push(box ? rule('└', '┴', '┘', hz) : rule('+', '+', '+', hz));
    return out.join('\n');
  };
  (function () {
    const input = $('table-input'); if (!input) return;
    const out = $('table-output'), msg = $('table-msg'), count = $('table-count');
    function render() {
      const { rows } = pub.parseTable(input.value);
      if (!rows.length) { out.textContent = ''; count.textContent = ''; setMsg(msg, ''); return; }
      const cols = Math.max(...rows.map((r) => r.length));
      if (cols > 40 || rows.length > 500) { out.textContent = ''; out.dataset.state = 'error'; setMsg(msg, 'That’s too large to line up (max 500 rows and 40 columns).', 'error'); return; }
      let res = pub.formatTable(rows, { style: $('table-style').value, align: $('table-align').value, header: $('table-header').checked });
      if ($('table-fence').checked) res = '```\n' + res + '\n```';
      delete out.dataset.state; out.textContent = res;
      const n = cp(res); count.textContent = '· ' + n + ' characters';
      const notes = [];
      if (n > 2000) notes.push('Over Discord’s 2000-character limit. Use the Message splitter, or fewer columns.');
      if (rows.some((r) => r.some((c) => /[ᄀ-￿\u{1F300}-\u{1FAFF}]/u.test(c) && cellWidth(c) !== cp(c) + 0 ))) notes.push('Emoji and wide characters may not line up exactly in Discord’s font.');
      setMsg(msg, notes.join(' '), notes.length ? 'warn' : '');
    }
    ['table-style', 'table-align', 'table-header', 'table-fence'].forEach((id) => $(id).addEventListener('change', render));
    input.addEventListener('input', render);
    $('table-copy').addEventListener('click', () => { if (!out.textContent || out.dataset.state === 'error') { toast('Nothing to copy yet'); return; } copy(out.textContent); });
    $('table-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
    render();
  })();

  /* ---------- 8. Message splitter ---------- */
  // Where to cut a window of text (in code points): paragraph, then line, then sentence, then word, else hard.
  function pickCut(win, room) {
    const minCut = Math.floor(room / 4);
    const at = (idx) => (idx >= 0 ? cp(win.slice(0, idx)) : -1);
    let c = at(win.lastIndexOf('\n\n')); if (c >= minCut) return c;
    c = at(win.lastIndexOf('\n')); if (c >= minCut) return c;
    const re = /[.!?\u2026][)"'\u201d]*\s/g; let last = -1, m;
    while ((m = re.exec(win)) !== null) last = m.index + m[0].length;
    c = at(last); if (c >= minCut) return c;
    c = at(win.lastIndexOf(' ')); if (c >= minCut) return c;
    return room;
  }
  pub.splitText = function (text, limit, marks) {
    limit = limit | 0;
    const src = text.replace(/\r\n?/g, '\n');
    const all = Array.from(src);
    if (!src.trim()) return [];
    if (all.length <= limit) return [src];
    const reserveMark = marks ? 12 : 0;
    const chunks = []; let s = 0, open = false, lang = '';
    while (s < all.length) {
      const prefix = open ? '```' + lang + '\n' : '';
      const room = limit - reserveMark - cp(prefix) - 4;
      if (room < 20) throw new Error('The limit is too small for this text.');
      let end;
      if (all.length - s <= room + 4) end = all.length;
      else { end = s + Math.min(room, Math.max(1, pickCut(all.slice(s, s + room + 1).join(''), room))); }
      const body = all.slice(s, end).join('');
      let piece = prefix + body.replace(/\s+$/, '');
      let o = open, l = lang;       // fence state after this piece (the reopened fence in the prefix is already counted in `open`)
      body.split('\n').forEach((ln) => { const f = /^\s*```(\S*)/.exec(ln); if (f) { if (o) { o = false; l = ''; } else { o = true; l = f[1] || ''; } } });
      const more = end < all.length;
      if (o && more) piece += '\n```';
      open = o && more; lang = l;
      chunks.push(piece);
      s = end;
      if (more) { while (s < all.length && all[s] === '\n') s++; if (!open) while (s < all.length && all[s] === ' ') s++; }
    }
    const cleaned = chunks.filter((c) => c.trim());
    return marks ? cleaned.map((c, i) => '(' + (i + 1) + '/' + cleaned.length + ') ' + c) : cleaned;
  };
  (function () {
    const input = $('split-input'); if (!input) return;
    const out = $('split-out'), msg = $('split-msg'), limitSel = $('split-limit'), marks = $('split-marks');
    function render() {
      clearEl(out);
      const t = input.value;
      if (!t.trim()) { setMsg(msg, ''); return; }
      const limit = parseInt(limitSel.value, 10);
      let parts; try { parts = pub.splitText(t, limit, marks.checked); } catch (e) { setMsg(msg, e.message, 'error'); return; }
      const total = cp(t);
      setMsg(msg, parts.length === 1 ? 'Fits in one message (' + cp(parts[0]) + ' of ' + limit + ' characters).' : total + ' characters split into ' + parts.length + ' parts.', parts.length === 1 ? 'ok' : '');
      parts.forEach((p, i) => {
        const li = h('li', { class: 't10-chunk' });
        li.appendChild(h('div', { class: 't10-chunk-head' }, [h('span', { text: 'Part ' + (i + 1) + ' of ' + parts.length }), h('span', { class: 't10-count', text: cp(p) + ' / ' + limit })]));
        li.appendChild(h('pre', { class: 'output-text t10-scroll', text: p }));
        li.appendChild(h('div', { class: 'btn-row' }, [copyBtnLabel(p, 'Copy part ' + (i + 1))]));
        out.appendChild(li);
      });
    }
    function copyBtnLabel(text, label) { const b = h('button', { type: 'button', class: 'btn-outline small', text: label }); b.addEventListener('click', () => copy(text)); return b; }
    input.addEventListener('input', render); limitSel.addEventListener('change', render); marks.addEventListener('change', render);
    $('split-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  })();

  /* ---------- 9. Text counter ---------- */
  const segG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const segW = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
  pub.countText = function (t) {
    const graphemes = segG ? Array.from(segG.segment(t)).length : cp(t);
    let words = [];
    if (segW) words = Array.from(segW.segment(t)).filter((x) => x.isWordLike).map((x) => x.segment);
    else words = t.match(/\S+/g) || [];
    const sentences = (t.match(/[^.!?…\n]+(?:[.!?…]+|$)/g) || []).filter((x) => /\S/.test(x)).length;
    const lines = t === '' ? 0 : t.replace(/\r\n?/g, '\n').split('\n').length;
    const paragraphs = t.trim() === '' ? 0 : t.replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter((x) => x.trim()).length;
    const freq = new Map();
    words.forEach((w) => { const k = w.toLowerCase(); freq.set(k, (freq.get(k) || 0) + 1); });
    const top = Array.from(freq.entries()).filter((e) => e[1] > 1 && cp(e[0]) > 1).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8);
    return { chars: cp(t), noSpaces: cp(t.replace(/\s/g, '')), graphemes, utf16: t.length, bytes: new TextEncoder().encode(t).length, words: words.length, sentences, lines, paragraphs, top, exactGraphemes: !!segG };
  };
  function human(sec) {
    if (sec < 1) return 'under a second';
    if (sec < 60) return Math.round(sec) + ' s';
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m + ' min' + (s ? ' ' + s + ' s' : '');
  }
  (function () {
    const input = $('count-input'); if (!input) return;
    const dl = $('count-stats'), topBox = $('count-top-box'), top = $('count-top');
    let lines = [];
    function render() {
      const c = pub.countText(input.value), w = c.words;
      const rows = [['Characters', c.chars], ['Without spaces', c.noSpaces], [c.exactGraphemes ? 'Visible characters' : 'Visible characters (approximate)', c.graphemes], ['Words', w], ['Sentences', c.sentences], ['Lines', c.lines], ['Paragraphs', c.paragraphs], ['UTF-8 bytes', c.bytes], ['UTF-16 length', c.utf16], ['Reading time', human(w / 200 * 60)], ['Speaking time', human(w / 130 * 60)]];
      lines = rows.map((r) => r[0] + ': ' + r[1]);
      clearEl(dl);
      rows.forEach((r) => dl.appendChild(h('div', { class: 't10-stat' }, [h('dt', { text: r[0] }), h('dd', { text: String(typeof r[1] === 'number' ? r[1].toLocaleString() : r[1]) })])));
      clearEl(top); topBox.hidden = !c.top.length;
      c.top.forEach(([word, n]) => top.appendChild(h('span', { class: 't10-chip' }, [word, h('b', { text: ' ×' + n })])));
    }
    input.addEventListener('input', render);
    $('count-copy').addEventListener('click', () => { copy(lines.join('\n')); });
    $('count-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
    render();
  })();

  /* ---------- 10. Unicode inspector ---------- */
  const CATS = { Lu: 'Letter, uppercase', Ll: 'Letter, lowercase', Lt: 'Letter, titlecase', Lm: 'Letter, modifier', Lo: 'Letter, other', Mn: 'Mark, combining', Mc: 'Mark, spacing', Me: 'Mark, enclosing', Nd: 'Number, digit', Nl: 'Number, letter', No: 'Number, other', Pc: 'Punctuation, connector', Pd: 'Punctuation, dash', Ps: 'Punctuation, open', Pe: 'Punctuation, close', Pi: 'Punctuation, initial quote', Pf: 'Punctuation, final quote', Po: 'Punctuation, other', Sm: 'Symbol, math', Sc: 'Symbol, currency', Sk: 'Symbol, modifier', So: 'Symbol, other', Zs: 'Space', Zl: 'Line separator', Zp: 'Paragraph separator', Cc: 'Control', Cf: 'Invisible format', Cs: 'Surrogate', Co: 'Private use', Cn: 'Unassigned' };
  const CAT_RE = Object.keys(CATS).map((k) => [k, new RegExp('^\\p{' + k + '}$', 'u')]);
  const KNOWN_HIDDEN = { 0x00a0: 'NBSP', 0x00ad: 'SHY', 0x034f: 'CGJ', 0x061c: 'ALM', 0x115f: 'HANGUL FILLER', 0x1160: 'HANGUL FILLER', 0x17b4: 'KHMER INHERENT', 0x17b5: 'KHMER INHERENT', 0x180e: 'MVS', 0x2000: 'EN QUAD', 0x2001: 'EM QUAD', 0x2002: 'EN SP', 0x2003: 'EM SP', 0x2004: '3/EM SP', 0x2005: '4/EM SP', 0x2006: '6/EM SP', 0x2007: 'FIG SP', 0x2008: 'PUNCT SP', 0x2009: 'THIN SP', 0x200a: 'HAIR SP', 0x200b: 'ZWSP', 0x200c: 'ZWNJ', 0x200d: 'ZWJ', 0x200e: 'LRM', 0x200f: 'RLM', 0x2028: 'LINE SEP', 0x2029: 'PARA SEP', 0x202a: 'LRE', 0x202b: 'RLE', 0x202c: 'PDF', 0x202d: 'LRO', 0x202e: 'RLO', 0x202f: 'NNBSP', 0x205f: 'MMSP', 0x2060: 'WJ', 0x2061: 'FUNC APPLY', 0x2062: 'INV TIMES', 0x2063: 'INV SEP', 0x2064: 'INV PLUS', 0x2066: 'LRI', 0x2067: 'RLI', 0x2068: 'FSI', 0x2069: 'PDI', 0x3000: 'IDEOGRAPHIC SP', 0x3164: 'HANGUL FILLER', 0xfeff: 'BOM/ZWNBSP', 0xfe0e: 'VS15 text', 0xfe0f: 'VS16 emoji', 0xffa0: 'HW HANGUL FILLER' };
  pub.inspectChar = function (ch) {
    const c = ch.codePointAt(0);
    const cat = (CAT_RE.find(([, re]) => re.test(ch)) || ['Cn'])[0];
    const enc = new TextEncoder().encode(ch);
    const u16 = []; for (let i = 0; i < ch.length; i++) u16.push(ch.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'));
    const isVs = (c >= 0xfe00 && c <= 0xfe0f) || (c >= 0xe0100 && c <= 0xe01ef);
    const ordinaryCtrl = c === 10 || c === 9 || c === 13;
    const unusual = !ordinaryCtrl && (cat === 'Cc' || cat === 'Cf' || (cat === 'Zs' && c !== 0x20) || cat === 'Zl' || cat === 'Zp' || cat[0] === 'M' || cat === 'Co' || cat === 'Cn' || cat === 'Cs' || isVs || c === 0x115f || c === 0x1160 || c === 0x3164 || c === 0xffa0);
    const hidden = !ordinaryCtrl && (cat === 'Cc' || cat === 'Cf' || (cat === 'Zs' && c !== 0x20) || cat === 'Zl' || cat === 'Zp' || isVs || [0x034f, 0x115f, 0x1160, 0x17b4, 0x17b5, 0x3164, 0xffa0].includes(c));
    const cpHex = 'U+' + c.toString(16).toUpperCase().padStart(4, '0');
    let shown = ch;
    if (c === 0x20) shown = '␠'; else if (c === 10) shown = '␊'; else if (c === 9) shown = '␉'; else if (c === 13) shown = '␍';
    else if (c < 0x20) shown = String.fromCharCode(0x2400 + c); else if (c === 0x7f) shown = '␡';
    else if (hidden) shown = '[' + (KNOWN_HIDDEN[c] || cpHex) + ']';
    return { ch, cp: c, cpHex, cat, type: CATS[cat] || 'Unassigned', utf8: Array.from(enc).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' '), utf16: u16.join(' '), unusual, hidden, shown, label: KNOWN_HIDDEN[c] || null, isSpace: c === 0x20 };
  };
  pub.inspectText = function (t, max) {
    max = max || 3000;
    const chars = Array.from(t), items = chars.slice(0, max).map(pub.inspectChar);
    return { items, total: chars.length, truncated: chars.length > max, hiddenCount: items.filter((i) => i.hidden).length, unusualCount: items.filter((i) => i.unusual).length };
  };
  (function () {
    const input = $('uni-input'); if (!input) return;
    const msg = $('uni-msg'), body = $('uni-body'), wrap = $('uni-table-wrap'), special = $('uni-special'), revBox = $('uni-reveal-box'), rev = $('uni-reveal');
    let shownRows = [];
    function render() {
      clearEl(body); wrap.hidden = true; revBox.hidden = true; shownRows = [];
      const t = input.value;
      if (!t) { setMsg(msg, ''); return; }
      const r = pub.inspectText(t);
      const graphemes = segG ? Array.from(segG.segment(t)).length : r.total;
      const bits = [r.total + ' code point' + (r.total === 1 ? '' : 's'), graphemes + ' visible character' + (graphemes === 1 ? '' : 's')];
      if (r.hiddenCount) bits.push(r.hiddenCount + ' hidden or invisible'); else bits.push('nothing hidden');
      if (r.truncated) bits.push('showing the first 3000');
      setMsg(msg, bits.join(' · '), r.hiddenCount ? 'warn' : '');
      if (r.hiddenCount) { revBox.hidden = false; rev.textContent = r.items.map((i) => (i.hidden ? i.shown : i.ch)).join(''); }
      const rows = special.checked ? r.items.filter((i) => i.unusual) : r.items;
      shownRows = rows;
      wrap.hidden = false;
      if (!rows.length) { const tr = h('tr', null, [h('td', { colspan: '5', class: 't10-none', text: 'No unusual characters found.' })]); body.appendChild(tr); return; }
      rows.forEach((i) => body.appendChild(h('tr', { class: i.unusual ? 'is-unusual' : '' }, [h('td', { class: 't10-glyph', text: i.shown }), h('td', null, [h('code', { text: i.cpHex })]), h('td', null, [h('code', { text: i.utf8 })]), h('td', null, [h('code', { text: i.utf16 })]), h('td', { text: i.type + (i.label ? ' · ' + i.label : '') })])));
    }
    input.addEventListener('input', render); special.addEventListener('change', render);
    $('uni-copy').addEventListener('click', () => { if (!shownRows.length) { toast('Nothing to copy yet'); return; } copy(['Char\tCode point\tUTF-8\tUTF-16\tType'].concat(shownRows.map((i) => [i.shown, i.cpHex, i.utf8, i.utf16, i.type + (i.label ? ' · ' + i.label : '')].join('\t'))).join('\n')); });
    $('uni-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  })();

  /* ---------- 11. Line tools ---------- */
  const unesc = (s) => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  pub.lineOp = function (text, op, o) {
    o = o || {};
    let lines = text.replace(/\r\n?/g, '\n').split('\n');
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    if (text === '') lines = [];
    const rand = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
    switch (op) {
      case 'sort-az': case 'sort-za': {
        const col = new Intl.Collator(undefined, { numeric: !!o.natural, sensitivity: o.ignoreCase === false ? 'variant' : 'accent' });
        lines = lines.slice().sort((a, b) => col.compare(a, b)); if (op === 'sort-za') lines.reverse(); return lines.join('\n');
      }
      case 'sort-num': {
        const num = (l) => { const m = l.match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; };
        const dec = lines.map((l, i) => ({ l, i, n: num(l) }));
        dec.sort((a, b) => (a.n === null && b.n === null ? a.i - b.i : a.n === null ? 1 : b.n === null ? -1 : (a.n - b.n) || a.i - b.i));
        return dec.map((d) => d.l).join('\n');
      }
      case 'sort-len': { const dec = lines.map((l, i) => ({ l, i, n: cp(l) })); dec.sort((a, b) => (o.longest ? b.n - a.n : a.n - b.n) || a.i - b.i); return dec.map((d) => d.l).join('\n'); }
      case 'reverse': return lines.slice().reverse().join('\n');
      case 'shuffle': { const a = lines.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.join('\n'); }
      case 'dedupe': { const seen = new Set(), out = []; lines.forEach((l) => { let k = o.trim ? l.trim() : l; if (o.ignoreCase) k = k.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(l); } }); return out.join('\n'); }
      case 'empty': return lines.filter((l) => l.trim() !== '').join('\n');
      case 'trim': return lines.map((l) => { const t = l.trim(); return o.inner ? t.replace(/[ \t]{2,}/g, ' ') : t; }).join('\n');
      case 'number': { let n = parseInt(o.start, 10); if (!Number.isFinite(n)) n = 1; const sep = unesc(o.sep == null ? '. ' : o.sep); return lines.map((l) => { if (o.skipEmpty && l.trim() === '') return l; return (n++) + sep + l; }).join('\n'); }
      case 'affix': return lines.map((l) => unesc(o.prefix || '') + l + unesc(o.suffix || '')).join('\n');
      case 'join': { let ls = lines; if (o.skipEmpty) ls = ls.filter((l) => l.trim() !== ''); return ls.map((l) => (o.trim ? l.trim() : l)).join(unesc(o.sep == null ? ', ' : o.sep)); }
      case 'split': { const sep = unesc(o.sep == null ? ',' : o.sep); if (sep === '') return text; let parts = text.split(sep); if (o.trim) parts = parts.map((p) => p.trim()); if (o.skipEmpty) parts = parts.filter((p) => p !== ''); return parts.join('\n'); }
      default: return text;
    }
  };
  (function () {
    const input = $('lines-input'); if (!input) return;
    const opSel = $('lines-op'), optsEl = $('lines-opts'), out = $('lines-output'), count = $('lines-count'), msg = $('lines-msg'), again = $('lines-reshuffle');
    const OPTS = {
      'sort-az': [['c', 'ignoreCase', 'Ignore case', true], ['c', 'natural', 'Natural order (2 before 10)', true]],
      'sort-za': [['c', 'ignoreCase', 'Ignore case', true], ['c', 'natural', 'Natural order (2 before 10)', true]],
      'sort-len': [['c', 'longest', 'Longest first', false]],
      dedupe: [['c', 'ignoreCase', 'Ignore case', false], ['c', 'trim', 'Ignore spaces at the ends', false]],
      trim: [['c', 'inner', 'Also collapse repeated spaces', false]],
      number: [['n', 'start', 'Start at', '1'], ['t', 'sep', 'After the number', '. '], ['c', 'skipEmpty', 'Skip empty lines', true]],
      affix: [['t', 'prefix', 'Prefix', ''], ['t', 'suffix', 'Suffix', '']],
      join: [['t', 'sep', 'Separator', ', '], ['c', 'skipEmpty', 'Skip empty lines', true], ['c', 'trim', 'Trim each line', true]],
      split: [['t', 'sep', 'Split at', ','], ['c', 'trim', 'Trim each piece', true], ['c', 'skipEmpty', 'Drop empty pieces', true]],
    };
    function buildOpts() {
      clearEl(optsEl); const spec = OPTS[opSel.value] || [];
      again.hidden = opSel.value !== 'shuffle';
      spec.forEach(([kind, key, label, def]) => {
        let ctl;
        if (kind === 'c') { ctl = h('input', { type: 'checkbox', 'data-lopt': key }); ctl.checked = !!def; }
        else { ctl = h('input', { type: kind === 'n' ? 'number' : 'text', class: 'text-input t10-inline', 'data-lopt': key, value: def, autocomplete: 'off', spellcheck: 'false' }); }
        ctl.addEventListener('input', render); ctl.addEventListener('change', render);
        optsEl.appendChild(h('label', { class: 'enc-opt' }, [kind === 'c' ? ctl : null, label, kind === 'c' ? null : ctl]));
      });
      if (spec.some((s) => s[0] === 't') && ['join', 'split', 'number', 'affix'].includes(opSel.value)) optsEl.appendChild(h('span', { class: 't10-hint', text: 'Use \\n for a new line and \\t for a tab.' }));
    }
    function readOpts() { const o = {}; optsEl.querySelectorAll('[data-lopt]').forEach((e) => { o[e.dataset.lopt] = e.type === 'checkbox' ? e.checked : e.value; }); return o; }
    function render() {
      const t = input.value;
      if (t.length > 2000000) { out.textContent = ''; setMsg(msg, 'That’s over 2 million characters. Split it up first.', 'error'); return; }
      const res = pub.lineOp(t, opSel.value, readOpts());
      out.textContent = res; delete out.dataset.state; setMsg(msg, '');
      const n = (s) => (s === '' ? 0 : s.split('\n').length);
      count.textContent = t ? '· ' + n(t.replace(/\n$/, '')) + ' → ' + n(res) + ' lines' : '';
    }
    opSel.addEventListener('change', () => { buildOpts(); render(); });
    input.addEventListener('input', render);
    again.addEventListener('click', render);
    $('lines-copy').addEventListener('click', () => { if (!out.textContent) { toast('Nothing to copy yet'); return; } copy(out.textContent); });
    $('lines-use').addEventListener('click', () => { if (!out.textContent) return; input.value = out.textContent; render(); });
    $('lines-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
    buildOpts(); render();
  })();

  /* ---------- 12. Regex tester ---------- */
  // Runs in a worker so a pattern that backtracks forever can be stopped instead of freezing the page.
  function rxRun(d) {
    try {
      const re = new RegExp(d.pattern, d.flags), text = d.text, out = [];
      let truncated = false;
      const pack = (m) => ({ i: m.index, text: m[0], groups: Array.prototype.slice.call(m, 1).map((g) => (g === undefined ? null : g)), named: m.groups ? Object.assign({}, m.groups) : null });
      if (re.global || re.sticky) {
        re.lastIndex = 0; let m;
        while ((m = re.exec(text)) !== null) {
          out.push(pack(m));
          if (m[0] === '') re.lastIndex += ((re.unicode || re.unicodeSets) && text.codePointAt(re.lastIndex) > 0xffff) ? 2 : 1;
          if (!re.global) break;
          if (out.length >= 500) { truncated = true; break; }
        }
      } else { const m = re.exec(text); if (m) out.push(pack(m)); }
      let replaced = null;
      if (d.replacement !== null && d.replacement !== undefined) { re.lastIndex = 0; replaced = text.replace(re, d.replacement); }
      return { ok: true, matches: out, truncated, replaced, source: re.toString() };
    } catch (err) { return { ok: false, error: String(err && err.message ? err.message : err) }; }
  }
  pub.rxRun = rxRun;
  (function () {
    const pat = $('rx-pattern'); if (!pat) return;
    const flags = $('rx-flags'), text = $('rx-text'), rep = $('rx-replace'), msg = $('rx-msg');
    const hlBox = $('rx-hl-box'), hl = $('rx-hl'), tblWrap = $('rx-table-wrap'), body = $('rx-body'), repBox = $('rx-rep-box'), repOut = $('rx-rep'), copyRep = $('rx-copy-rep');
    let worker = null, runId = 0, timer = null, debounce = null, lastSource = '', lastReplaced = null;
    function mkWorker() {
      if (worker) return worker;
      try {
        const src = 'self.onmessage=function(e){var d=e.data;self.postMessage({id:d.id,r:(' + rxRun.toString() + ')(d)});};';
        const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        worker = new Worker(url); URL.revokeObjectURL(url);
        worker.onerror = () => { worker = null; };
      } catch (e) { worker = false; }
      return worker;
    }
    function clearOut() { hlBox.hidden = true; tblWrap.hidden = true; repBox.hidden = true; copyRep.hidden = true; clearEl(hl); clearEl(body); lastSource = ''; lastReplaced = null; }
    function show(r, d) {
      clearOut();
      if (!r.ok) { setMsg(msg, r.error, 'error'); return; }
      lastSource = r.source;
      const n = r.matches.length;
      setMsg(msg, n ? n + ' match' + (n === 1 ? '' : 'es') + (r.truncated ? ' (showing the first 500)' : '') : 'No matches.', n ? 'ok' : 'warn');
      if (d.text) {
        hlBox.hidden = false; let pos = 0;
        r.matches.forEach((m) => { if (m.i < pos) return; hl.appendChild(document.createTextNode(d.text.slice(pos, m.i))); if (m.text === '') { hl.appendChild(h('mark', { class: 't10-empty', title: 'Empty match', text: '⌶' })); pos = m.i; } else { hl.appendChild(h('mark', { text: m.text })); pos = m.i + m.text.length; } });
        hl.appendChild(document.createTextNode(d.text.slice(pos)));
      }
      if (n) {
        tblWrap.hidden = false;
        r.matches.forEach((m, k) => {
          const g = m.groups.map((v, j) => (j + 1) + ': ' + (v === null ? '(no match)' : JSON.stringify(v))).concat(m.named ? Object.keys(m.named).map((nm) => nm + ': ' + (m.named[nm] === undefined ? '(no match)' : JSON.stringify(m.named[nm]))) : []);
          body.appendChild(h('tr', null, [h('td', { text: String(k + 1) }), h('td', null, [h('code', { text: m.text === '' ? '(empty)' : m.text })]), h('td', { text: String(m.i) }), h('td', { class: 't10-groups', text: g.join('\n') || '—' })]));
        });
      }
      if (r.replaced !== null) { repBox.hidden = false; copyRep.hidden = false; repOut.textContent = r.replaced; lastReplaced = r.replaced; }
    }
    function run() {
      const d = { id: ++runId, pattern: pat.value, flags: flags.value, text: text.value, replacement: rep.value !== '' ? rep.value : null };
      clearTimeout(timer);
      if (!d.pattern) { clearOut(); setMsg(msg, 'Enter a pattern to test.'); return; }
      if (d.text.length > 100000) { clearOut(); setMsg(msg, 'The test text is over 100,000 characters. Trim it down.', 'error'); return; }
      const w = mkWorker();
      if (!w) { show(rxRun(d), d); return; }
      setMsg(msg, 'Testing…');
      w.onmessage = (e) => { if (e.data.id !== runId) return; clearTimeout(timer); show(e.data.r, d); };
      timer = setTimeout(() => { try { worker.terminate(); } catch (e) {} worker = null; clearOut(); setMsg(msg, 'This pattern took too long and was stopped. It may be backtracking catastrophically, for example nested quantifiers like (a+)+.', 'error'); }, 2000);
      w.postMessage(d);
    }
    const later = () => { clearTimeout(debounce); debounce = setTimeout(run, 150); };
    [pat, flags, text, rep].forEach((e) => e.addEventListener('input', later));
    $('rx-copy-pattern').addEventListener('click', () => { if (!lastSource) { toast('Nothing to copy: fix the pattern first'); return; } copy(lastSource); });
    copyRep.addEventListener('click', () => { if (lastReplaced !== null) copy(lastReplaced); });
    pub.rxReady = run;
    run();
  })();

  /* ---------- 13. JWT decoder ---------- */
  function b64urlBytes(s) {
    if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad characters');
    let t = s.replace(/-/g, '+').replace(/_/g, '/'); if (t.length % 4 === 1) throw new Error('bad length'); while (t.length % 4) t += '=';
    const bin = atob(t), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
  }
  const rel = (sec) => { const a = Math.abs(sec); const u = [[86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']]; for (const [n, w] of u) if (a >= n) { const v = Math.floor(a / n); return v + ' ' + w + (v === 1 ? '' : 's'); } return '0 seconds'; };
  pub.decodeJwt = function (raw, now) {
    let s = (raw || '').trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').replace(/\s+/g, '');
    if (!s) return { empty: true };
    const parts = s.split('.');
    if (parts.length === 5) return { error: 'This looks like an encrypted token (JWE). Its contents can’t be read without the key.' };
    if (parts.length !== 3) return { error: 'A JWT has three parts separated by dots (header.payload.signature). This has ' + parts.length + '.' };
    const dec = (part, name) => {
      let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(b64urlBytes(part)); } catch (e) { return { error: 'The ' + name + ' isn’t valid Base64URL text.' }; }
      try { return { value: JSON.parse(text), text }; } catch (e) { return { error: 'The ' + name + ' decoded, but it isn’t JSON.' }; }
    };
    const hd = dec(parts[0], 'header'); if (hd.error) return { error: hd.error };
    const pl = dec(parts[1], 'payload'); if (pl.error) return { error: pl.error };
    if (!isObj(hd.value)) return { error: 'The header should be a JSON object.' };
    let sigBytes = null; try { sigBytes = b64urlBytes(parts[2]).length; } catch (e) { return { error: 'The signature isn’t valid Base64URL.' }; }
    const nowSec = Math.floor((now == null ? Date.now() : now) / 1000), claims = [], warnings = [];
    const p = isObj(pl.value) ? pl.value : {};
    ['iat', 'nbf', 'exp'].forEach((k) => {
      if (!(k in p)) return;
      const v = p[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) { warnings.push(k + ' should be a number of seconds.'); return; }
      if (v > 1e11) warnings.push(k + ' looks like milliseconds. JWT times are in seconds.');
      const d = new Date(v * 1000); if (isNaN(d.getTime())) { warnings.push(k + ' is outside the date range.'); return; }
      let note = '';
      if (k === 'exp') note = v <= nowSec ? 'expired ' + rel(nowSec - v) + ' ago' : 'expires in ' + rel(v - nowSec);
      if (k === 'nbf') note = v > nowSec ? 'not valid for another ' + rel(v - nowSec) : 'already valid';
      if (k === 'iat') note = v > nowSec + 300 ? 'in the future' : rel(nowSec - v) + ' ago';
      claims.push({ key: k, label: k === 'iat' ? 'Issued at' : k === 'nbf' ? 'Not before' : 'Expires', utc: utc(d), local: d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'long' }), note, expired: k === 'exp' && v <= nowSec, early: k === 'nbf' && v > nowSec });
    });
    const alg = typeof hd.value.alg === 'string' ? hd.value.alg : null;
    if (!alg) warnings.push('The header has no alg, which a valid JWT needs.');
    else if (alg.toLowerCase() === 'none') warnings.push('alg is "none": this token is unsigned, so anyone could have made it.');
    if (!parts[2]) warnings.push('The signature part is empty, so this token is unsigned.');
    if (!isObj(pl.value)) warnings.push('The payload isn’t a JSON object, so no standard claims are shown.');
    return { header: JSON.stringify(hd.value, null, 2), payload: JSON.stringify(pl.value, null, 2), sig: parts[2], sigBytes, alg, claims, warnings, expired: claims.some((c) => c.expired) };
  };
  (function () {
    const input = $('jwt-input'); if (!input) return;
    const msg = $('jwt-msg'), outEl = $('jwt-out'), warn = $('jwt-warn'), times = $('jwt-times');
    let payload = '';
    function render() {
      const r = pub.decodeJwt(input.value); payload = '';
      outEl.hidden = true; clearEl(times);
      if (r.empty) { setMsg(msg, ''); return; }
      if (r.error) { setMsg(msg, r.error, 'error'); return; }
      payload = r.payload; setMsg(msg, 'Decoded. The signature has not been checked.', r.expired ? 'warn' : 'ok');
      outEl.hidden = false;
      warn.hidden = !r.warnings.length; warn.textContent = r.warnings.join(' ');
      if (r.alg) times.appendChild(kvRow('Algorithm', r.alg, { plain: true }));
      r.claims.forEach((c) => times.appendChild(kvRow(c.label, c.utc + ' · ' + c.local + (c.note ? ' — ' + c.note : ''), { plain: true, kind: c.expired || c.early ? 'bad' : '' })));
      $('jwt-header').textContent = r.header; $('jwt-payload').textContent = r.payload;
      $('jwt-sig').textContent = r.sig ? r.sig + '\n(' + r.sigBytes + ' bytes)' : '(empty)';
    }
    input.addEventListener('input', render);
    $('jwt-copy-payload').addEventListener('click', () => { if (!payload) { toast('Nothing to copy yet'); return; } copy(payload); });
    $('jwt-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  })();

  /* ---------- 14. Number base converter ---------- */
  pub.convertBase = function (raw, from) {
    let s = (raw || '').trim().replace(/[_\s]/g, '');
    if (!s) return { empty: true };
    let neg = false; if (s[0] === '-' || s[0] === '+') { neg = s[0] === '-'; s = s.slice(1); }
    let base = from === 'auto' || !from ? 10 : parseInt(from, 10);
    const pre = s.slice(0, 2).toLowerCase(), map = { '0x': 16, '0b': 2, '0o': 8 };
    if (map[pre]) { if (from === 'auto' || !from || parseInt(from, 10) === map[pre]) { base = map[pre]; s = s.slice(2); } }
    if (!s) return { error: 'Add some digits after the prefix.' };
    const digits = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/i }[base];
    if (!digits.test(s)) return { error: 'That isn’t a valid ' + { 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hexadecimal' }[base] + ' number.' + (from === 'auto' || !from ? '' : ' Check the input base above.') };
    if (s.length > 4000) return { error: 'That number is too long (over 4000 digits).' };
    const v = BigInt((base === 16 ? '0x' : base === 2 ? '0b' : base === 8 ? '0o' : '') + s);
    const a = v, sign = neg && v !== 0n ? '-' : '';
    const bits = []; if (!sign) { let t = a, i = 0; while (t > 0n) { if (t & 1n) bits.push(i); t >>= 1n; i++; } }
    return { dec: sign + a.toString(10), hex: sign + a.toString(16).toUpperCase(), bin: sign + a.toString(2), oct: sign + a.toString(8), bitLength: a === 0n ? 0 : a.toString(2).length, negative: !!sign, bitsSet: bits, value: sign ? -a : a };
  };
  (function () {
    const input = $('base-input'); if (!input) return;
    const msg = $('base-msg'), out = $('base-out'), bitsBox = $('base-bits-box'), bitsEl = $('base-bits'), names = $('base-names'), from = $('base-from');
    const group = (str, n) => str.replace(new RegExp('(?=(?:.{' + n + '})+$)', 'g'), ' ').trim();
    function render() {
      const r = pub.convertBase(input.value, from.value);
      clearEl(out); bitsBox.hidden = true;
      if (r.empty) { setMsg(msg, ''); return; }
      if (r.error) { setMsg(msg, r.error, 'error'); return; }
      setMsg(msg, r.bitLength + ' bit' + (r.bitLength === 1 ? '' : 's') + (r.negative ? '. Negative numbers are shown with a minus sign, not as two’s complement.' : ''), r.negative ? 'warn' : '');
      const neg = r.negative ? '-' : '', body = (x) => (r.negative ? x.slice(1) : x);
      out.appendChild(kvRow('Decimal', r.dec, { copy: true }));
      out.appendChild(kvRow('Hex', neg + '0x' + body(r.hex), { copy: true }));
      out.appendChild(kvRow('Binary', neg + '0b' + body(r.bin), { copy: true }));
      if (body(r.bin).length > 4) out.appendChild(kvRow('Binary, grouped', neg + group(body(r.bin), 4), { copy: true }));
      out.appendChild(kvRow('Octal', neg + '0o' + body(r.oct), { copy: true }));
      if (r.bitsSet.length) {
        bitsBox.hidden = false; clearEl(bitsEl);
        const perms = names.checked ? (UI.permissions || []) : [];
        r.bitsSet.slice(0, 128).forEach((b) => { const n = perms.find(([x]) => x === b); bitsEl.appendChild(h('span', { class: 't10-chip' }, [String(b), n ? h('b', { text: ' ' + n[1] }) : null])); });
        if (r.bitsSet.length > 128) bitsEl.appendChild(h('span', { class: 't10-hint', text: ' and ' + (r.bitsSet.length - 128) + ' more' }));
      }
    }
    input.addEventListener('input', render); from.addEventListener('change', render); names.addEventListener('change', render);
  })();

  /* ---------- 15. URL parser ---------- */
  pub.parseUrl = function (raw) {
    let s = (raw || '').trim(); if (!s) return { empty: true };
    let assumed = false, u;
    try { u = new URL(s); } catch (e) {
      if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) { try { u = new URL('https://' + s); assumed = true; } catch (e2) { /* below */ } }
    }
    if (!u) return { error: 'That isn’t a valid URL. Include the start, like https://example.com/page.' };
    const params = []; u.searchParams.forEach((v, k) => params.push([k, v]));
    const safe = (x) => { try { return decodeURIComponent(x); } catch (e) { return x; } };
    const json = {}; params.forEach(([k, v]) => { if (k in json) { if (!Array.isArray(json[k])) json[k] = [json[k]]; json[k].push(v); } else json[k] = v; });
    return { assumed, href: u.href, protocol: u.protocol, username: safe(u.username), password: u.password ? '(set)' : '', hasCreds: !!(u.username || u.password), host: u.hostname, port: u.port, origin: u.origin === 'null' ? '' : u.origin, path: u.pathname, pathDecoded: safe(u.pathname), segments: u.pathname.split('/').filter(Boolean).map(safe), search: u.search, hash: u.hash, hashDecoded: safe(u.hash), params, json };
  };
  (function () {
    const input = $('urlp-input'); if (!input) return;
    const msg = $('urlp-msg'), parts = $('urlp-parts'), wrap = $('urlp-params-wrap'), tb = $('urlp-params'), cj = $('urlp-copy-json');
    let json = null;
    function render() {
      const r = pub.parseUrl(input.value); json = null;
      clearEl(parts); clearEl(tb); parts.hidden = true; wrap.hidden = true; cj.hidden = true;
      if (r.empty) { setMsg(msg, ''); return; }
      if (r.error) { setMsg(msg, r.error, 'error'); return; }
      const notes = [];
      if (r.assumed) notes.push('No scheme was given, so https:// was assumed.');
      if (r.hasCreds) notes.push('This URL contains a username or password. Avoid sharing links like that.');
      if (/(^|\.)xn--/.test(r.host)) notes.push('The host is an internationalised domain written in punycode (xn--).');
      setMsg(msg, notes.join(' '), notes.length ? 'warn' : '');
      parts.hidden = false;
      parts.appendChild(kvRow('Protocol', r.protocol, { copy: true }));
      if (r.username) parts.appendChild(kvRow('Username', r.username, { copy: true }));
      if (r.password) parts.appendChild(kvRow('Password', r.password, { plain: true }));
      parts.appendChild(kvRow('Host', r.host || '(none)', { copy: !!r.host }));
      parts.appendChild(kvRow('Port', r.port || 'default for ' + r.protocol.replace(':', ''), { plain: !r.port, copy: !!r.port }));
      parts.appendChild(kvRow('Path', r.path, { copy: true }));
      if (r.pathDecoded !== r.path) parts.appendChild(kvRow('Path, decoded', r.pathDecoded, { copy: true }));
      if (r.segments.length > 1) parts.appendChild(kvRow('Path segments', r.segments.join('  /  '), { plain: true }));
      if (r.search) parts.appendChild(kvRow('Query', r.search, { copy: true }));
      if (r.hash) parts.appendChild(kvRow('Fragment', r.hash, { copy: true }));
      if (r.params.length) {
        wrap.hidden = false; cj.hidden = false; json = r.json;
        r.params.forEach(([k, v]) => tb.appendChild(h('tr', null, [h('td', null, [h('code', { text: k })]), h('td', null, [h('code', { text: v === '' ? '(empty)' : v })])])));
      }
    }
    input.addEventListener('input', render);
    cj.addEventListener('click', () => { if (json) copy(JSON.stringify(json, null, 2)); });
    $('urlp-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  })();


  /* ---------- 16. Password generator ---------- */
  const PW_SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/~' };
  const PW_SIMILAR = /[O0Il1|]/g;
  // Unbiased random integer in [0, n): values that would favour small results are thrown away and redrawn.
  function randInt(n, src) {
    if (src) return src(n);
    const buf = new Uint32Array(1), limit = Math.floor(4294967296 / n) * n;
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % n;
  }
  pub.passwordPools = function (o) {
    const pools = [];
    ['lower', 'upper', 'digits', 'symbols'].forEach((k) => {
      if (!o[k]) return;
      let p = PW_SETS[k];
      if (o.avoidSimilar) p = p.replace(PW_SIMILAR, '');
      if (p) pools.push(p);
    });
    return pools;
  };
  pub.makePassword = function (o, src) {
    const pools = pub.passwordPools(o);
    const len = Math.floor(Number(o.length));
    if (!pools.length) return { error: 'Pick at least one kind of character.' };
    if (!Number.isFinite(len) || len < 4 || len > 128) return { error: 'Length must be a whole number from 4 to 128.' };
    if (len < pools.length) return { error: 'Length is too short to include every kind you picked.' };
    const all = pools.join('');
    const out = pools.map((p) => p[randInt(p.length, src)]);          // at least one from every kind picked
    while (out.length < len) out.push(all[randInt(all.length, src)]);
    for (let i = out.length - 1; i > 0; i--) { const j = randInt(i + 1, src); const t = out[i]; out[i] = out[j]; out[j] = t; }
    return { value: out.join(''), bits: len * Math.log2(all.length) };
  };
  (function () {
    const out = $('pw-output'); if (!out || !window.crypto || !crypto.getRandomValues) { if (out) setMsg($('pw-msg'), 'This browser has no secure random generator, so passwords cannot be made here.', 'error'); return; }
    const msg = $('pw-msg'), strength = $('pw-strength');
    const ids = { length: 'pw-length', count: 'pw-count', lower: 'pw-lower', upper: 'pw-upper', digits: 'pw-digits', symbols: 'pw-symbols', avoidSimilar: 'pw-similar' };
    let current = [];
    function read() {
      return { length: $(ids.length).value, count: $(ids.count).value, lower: $(ids.lower).checked, upper: $(ids.upper).checked, digits: $(ids.digits).checked, symbols: $(ids.symbols).checked, avoidSimilar: $(ids.avoidSimilar).checked };
    }
    function generate() {
      const o = read(), n = Math.floor(Number(o.count));
      current = []; out.textContent = ''; strength.textContent = '';
      if (!Number.isFinite(n) || n < 1 || n > 20) { setMsg(msg, 'How many must be a whole number from 1 to 20.', 'error'); return; }
      let bits = 0;
      for (let i = 0; i < n; i++) {
        const r = pub.makePassword(o);
        if (r.error) { setMsg(msg, r.error, 'error'); current = []; out.textContent = ''; return; }
        current.push(r.value); bits = r.bits;
      }
      setMsg(msg, '');
      out.textContent = current.join('\n');
      strength.textContent = '≈ ' + Math.round(bits) + ' bits';
    }
    $('pw-generate').addEventListener('click', generate);
    $('pw-copy').addEventListener('click', () => { if (!current.length) { toast('Nothing to copy yet'); return; } copy(current.join('\n'), current.length > 1 ? 'Copied all' : 'Copied!'); });
    Object.keys(ids).forEach((k) => $(ids[k]).addEventListener('change', generate));
    generate();
  })();

  /* ---------- 17. JSON to CSV ---------- */
  // JSON.parse turns 17-digit IDs into rounded numbers, so long whole numbers outside strings are quoted first.
  function protectBigInts(text) {
    let out = '', i = 0;
    const num = /-?\d+(\.\d+)?([eE][+-]?\d+)?/y;
    while (i < text.length) {
      const c = text[i];
      if (c === '"') {
        let j = i + 1;
        while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
        out += text.slice(i, j + 1); i = j + 1;
      } else if (c === '-' || (c >= '0' && c <= '9')) {
        num.lastIndex = i; const m = num.exec(text);
        if (!m) { out += c; i++; continue; }
        const t = m[0];
        out += (/^-?\d{16,}$/.test(t)) ? '"' + t + '"' : t; i += t.length;
      } else { out += c; i++; }
    }
    return out;
  }
  function flatten(v, prefix, into, flat) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && flat) {
      const keys = Object.keys(v);
      if (!keys.length) { if (prefix) into.push([prefix, '']); return; }
      keys.forEach((k) => flatten(v[k], prefix ? prefix + '.' + k : k, into, flat));
    } else into.push([prefix, v]);
  }
  function cell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
  pub.jsonToCsv = function (text, o) {
    o = o || {};
    const delim = o.delimiter || ',';
    if (!text || !text.trim()) return { empty: true };
    let data;
    try { data = JSON.parse(protectBigInts(text)); } catch (e) { return { error: 'That is not valid JSON: ' + String(e.message).replace(/^JSON\.parse: /, '') }; }
    if (data === null || typeof data !== 'object') return { error: 'Expected an array (or one object), but found a single value.' };
    const items = Array.isArray(data) ? data : [data];
    if (!items.length) return { error: 'The array is empty, so there is nothing to convert.' };
    const flat = o.flatten !== false;
    const allArrays = items.every(Array.isArray);
    let header = [], rows = [];
    if (allArrays) {
      const w = Math.max.apply(null, items.map((r) => r.length));
      rows = items.map((r) => { const a = r.map(cell); while (a.length < w) a.push(''); return a; });
      header = null;
    } else {
      const cols = [], seen = new Set();
      const recs = items.map((it) => {
        const pairs = [];
        if (it !== null && typeof it === 'object' && !Array.isArray(it)) Object.keys(it).forEach((k) => flatten(it[k], k, pairs, flat));
        else pairs.push(['value', it]);
        const m = new Map();
        pairs.forEach(([k, v]) => { if (!seen.has(k)) { seen.add(k); cols.push(k); } m.set(k, v); });
        return m;
      });
      header = cols;
      rows = recs.map((m) => cols.map((k) => cell(m.get(k))));
    }
    const esc = (s) => {
      if (o.formulaGuard && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return (s.indexOf(delim) >= 0 || /["\r\n]/.test(s) || /^\s|\s$/.test(s)) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [];
    if (header && o.header !== false) lines.push(header.map(esc).join(delim));
    rows.forEach((r) => lines.push(r.map(esc).join(delim)));
    return { csv: lines.join('\n'), rows: rows.length, cols: header ? header.length : (rows[0] || []).length };
  };
  (function () {
    const input = $('j2c-input'); if (!input) return;
    const msg = $('j2c-msg'), out = $('j2c-output'), count = $('j2c-count');
    let csv = '';
    function render() {
      const r = pub.jsonToCsv(input.value, { delimiter: $('j2c-delim').value, header: $('j2c-header').checked, flatten: $('j2c-flat').checked, formulaGuard: $('j2c-formula').checked });
      csv = ''; out.textContent = ''; count.textContent = '';
      if (r.empty) { setMsg(msg, ''); return; }
      if (r.error) { setMsg(msg, r.error, 'error'); return; }
      setMsg(msg, ''); csv = r.csv; out.textContent = csv;
      count.textContent = '· ' + r.rows + (r.rows === 1 ? ' row, ' : ' rows, ') + r.cols + (r.cols === 1 ? ' column' : ' columns');
    }
    ['input'].forEach((ev) => input.addEventListener(ev, render));
    ['j2c-delim', 'j2c-header', 'j2c-flat', 'j2c-formula'].forEach((id) => $(id).addEventListener('change', render));
    $('j2c-copy').addEventListener('click', () => { if (!csv) { toast('Nothing to copy yet'); return; } copy(csv, 'CSV copied'); });
    $('j2c-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
    render();
  })();

  /* ---------- 18. Cron explainer ---------- */
  const CRON_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const CRON_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const CRON_ALIASES = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
  const CRON_FIELDS = [
    { name: 'minute', min: 0, max: 59 }, { name: 'hour', min: 0, max: 23 }, { name: 'day of month', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12, names: CRON_MONTHS, offset: 1 }, { name: 'day of week', min: 0, max: 7, names: CRON_DAYS, offset: 0 },
  ];
  function cronValue(tok, f) {
    if (/^\d+$/.test(tok)) return Number(tok);
    if (f.names) { const i = f.names.indexOf(tok.toLowerCase()); if (i >= 0) return i + f.offset; }
    return NaN;
  }
  function parseCronField(text, f) {
    const set = new Set();
    const star = text[0] === '*';
    for (const part of text.split(',')) {
      if (!part) return { error: 'The ' + f.name + ' field has an empty item (check for a stray comma).' };
      const [range, stepTxt, extra] = part.split('/');
      if (extra !== undefined) return { error: 'The ' + f.name + ' field "' + part + '" has more than one "/".' };
      let step = 1;
      if (stepTxt !== undefined) {
        if (!/^\d+$/.test(stepTxt) || Number(stepTxt) < 1) return { error: 'The step after "/" in the ' + f.name + ' field must be a whole number of 1 or more.' };
        step = Number(stepTxt);
      }
      let a, b;
      if (range === '*') { a = f.min; b = f.name === 'day of week' ? 6 : f.max; }
      else if (range.indexOf('-') > 0) {
        const [x, y, z] = range.split('-');
        if (z !== undefined) return { error: 'The ' + f.name + ' range "' + range + '" is not valid.' };
        a = cronValue(x, f); b = cronValue(y, f);
      } else { a = cronValue(range, f); b = stepTxt !== undefined ? (f.name === 'day of week' ? 6 : f.max) : a; }
      if (!Number.isFinite(a) || !Number.isFinite(b)) return { error: '"' + part + '" is not a valid ' + f.name + ' value.' };
      if (a < f.min || a > f.max || b < f.min || b > f.max) return { error: 'The ' + f.name + ' field must be between ' + f.min + ' and ' + f.max + (f.names ? ' (or a name)' : '') + '.' };
      if (a > b) return { error: 'The range "' + range + '" in the ' + f.name + ' field runs backwards.' };
      for (let v = a; v <= b; v += step) set.add(f.name === 'day of week' && v === 7 ? 0 : v);
    }
    return { set, star, text };
  }
  pub.parseCron = function (expr) {
    let t = String(expr || '').trim();
    if (!t) return { empty: true };
    const al = CRON_ALIASES[t.toLowerCase()];
    if (al) t = al;
    else if (t[0] === '@') return { error: 'Unknown shortcut. Use @hourly, @daily, @weekly, @monthly or @yearly.' };
    const parts = t.split(/\s+/);
    if (/[?LW#]/.test(t.replace(/\b(?:mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, ''))) return { error: 'Characters such as ? L W and # belong to Quartz and Spring cron. Only the standard five-field format is supported here.' };
    if (parts.length === 6 || parts.length === 7) return { error: 'This has ' + parts.length + ' fields. Standard cron has five (minute, hour, day of month, month, day of week). A seconds field is not supported.' };
    if (parts.length !== 5) return { error: 'A cron expression needs five fields, separated by spaces. This has ' + parts.length + '.' };
    const f = [];
    for (let i = 0; i < 5; i++) { const r = parseCronField(parts[i], CRON_FIELDS[i]); if (r.error) return r; f.push(r); }
    return { fields: f, normal: parts.join(' ') };
  };
  const pad2 = (n) => String(n).padStart(2, '0');
  const joinList = (a) => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  function isAll(r, f) { const top = f.name === 'day of week' ? 7 : f.max + 1; return r.set.size >= top - f.min - (f.name === 'day of week' ? 1 : 0) && r.set.size === (f.name === 'day of week' ? 7 : f.max - f.min + 1); }
  function sortedSet(r) { return Array.from(r.set).sort((a, b) => a - b); }
  function stepOf(vals, f) {
    if (vals.length < 3) return 0;
    const d = vals[1] - vals[0];
    for (let i = 2; i < vals.length; i++) if (vals[i] - vals[i - 1] !== d) return 0;
    return vals[0] === f.min && d > 1 && (vals[vals.length - 1] + d > f.max) ? d : 0;
  }
  function ranges(vals, fmt) {
    const out = []; let i = 0;
    while (i < vals.length) {
      let j = i; while (j + 1 < vals.length && vals[j + 1] === vals[j] + 1) j++;
      if (j - i >= 2) out.push(fmt(vals[i]) + ' through ' + fmt(vals[j]));
      else for (let k = i; k <= j; k++) out.push(fmt(vals[k]));
      i = j + 1;
    }
    return out;
  }
  function hourPhrase(hv) {
    const seg = []; let i = 0;
    while (i < hv.length) {
      let j = i; while (j + 1 < hv.length && hv[j + 1] === hv[j] + 1) j++;
      if (j - i >= 2) seg.push('between ' + pad2(hv[i]) + ':00 and ' + pad2(hv[j]) + ':59');
      else for (let k = i; k <= j; k++) seg.push('during the ' + pad2(hv[k]) + ':00 hour');
      i = j + 1;
    }
    return joinList(seg);
  }
  pub.explainCron = function (p) {
    const [mi, ho, dom, mo, dow] = p.fields, F = CRON_FIELDS;
    const mAll = isAll(mi, F[0]), hAll = isAll(ho, F[1]);
    const mv = sortedSet(mi), hv = sortedSet(ho);
    let time;
    if (mAll && hAll) time = 'Every minute';
    else if (hAll && mv.length === 1) time = mv[0] === 0 ? 'At the start of every hour' : 'At minute ' + mv[0] + ' of every hour';
    else if (hAll && stepOf(mv, F[0])) time = 'Every ' + stepOf(mv, F[0]) + ' minutes';
    else if (mv.length === 1 && hv.length === 1) time = 'At ' + pad2(hv[0]) + ':' + pad2(mv[0]);
    else {
      const hp = hourPhrase(hv);
      if (mAll) time = 'Every minute, ' + hp;
      else {
        const st = stepOf(mv, F[0]);
        const mt = st ? 'Every ' + st + ' minutes' : 'At minute ' + joinList(ranges(mv, String));
        if (hAll) time = st ? mt : mt + ' of every hour';
        else if (hv.length === 1 && !st) time = mt + ' past ' + pad2(hv[0]) + ':00';
        else if (stepOf(hv, F[1]) && !st) time = mt + ', every ' + stepOf(hv, F[1]) + ' hours';
        else time = mt + ', ' + hp;
      }
    }
    const dAll = isAll(dom, F[2]), wAll = isAll(dow, F[4]), moAll = isAll(mo, F[3]);
    const parts = [time];
    const domTxt = 'on day ' + joinList(ranges(sortedSet(dom), String)) + ' of the month';
    const dowTxt = 'on ' + joinList(ranges(sortedSet(dow), (x) => DAY_NAMES[x]));
    if (!dAll && !wAll) parts.push(!dom.star && !dow.star ? domTxt + ' and ' + dowTxt + ' (a day matching either one counts)' : domTxt + ' that fall ' + dowTxt);
    else if (!dAll) parts.push(domTxt);
    else if (!wAll) parts.push(dowTxt);
    else if (moAll) parts.push('every day');
    if (!moAll) parts.push('in ' + joinList(ranges(sortedSet(mo), (x) => MONTH_NAMES[x - 1])));
    return parts.join(', ') + '.';
  };
  // Next runs, found a day at a time: skip days that cannot match, then try the allowed hours and minutes in order.
  pub.nextCronRuns = function (p, from, count, utc, years) {
    const [mi, ho, dom, mo, dow] = p.fields;
    const mins = sortedSet(mi), hrs = sortedSet(ho);
    const dayOk = (d, m, wd) => {
      const a = dom.set.has(d), b = dow.set.has(wd);
      if (dom.star || dow.star) return a && b;
      return a || b;
    };
    const get = utc
      ? (t) => ({ y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() })
      : (t) => ({ y: t.getFullYear(), m: t.getMonth(), d: t.getDate() });
    const make = utc
      ? (y, m, d, h, n) => new Date(Date.UTC(y, m, d, h, n))
      : (y, m, d, h, n) => { const t = new Date(y, m, d, h, n); return t.getHours() === h && t.getMinutes() === n ? t : null; };  // skips times a clock change removed
    const start = get(from), found = [];
    const limit = Math.round((years || 8) * 366);
    for (let i = 0; i < limit && found.length < count; i++) {
      const day = utc ? new Date(Date.UTC(start.y, start.m, start.d + i, 12)) : new Date(start.y, start.m, start.d + i, 12);
      const g = get(day), wd = utc ? day.getUTCDay() : day.getDay();
      if (!mo.set.has(g.m + 1) || !dayOk(g.d, g.m + 1, wd)) continue;
      for (const h of hrs) for (const n of mins) {
        const t = make(g.y, g.m, g.d, h, n);
        if (t && t.getTime() > from.getTime()) { found.push(t); if (found.length >= count) return found; }
      }
    }
    return found;
  };
  (function () {
    const input = $('cron-input'); if (!input) return;
    const msg = $('cron-msg'), words = $('cron-words'), next = $('cron-next'), zone = $('cron-zone');
    let text = '';
    function fmt(d, utc) {
      try { return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: utc ? 'UTC' : undefined }) + (utc ? ' UTC' : ''); }
      catch (e) { return d.toString(); }
    }
    function render() {
      const p = pub.parseCron(input.value); text = '';
      words.textContent = ''; next.textContent = '';
      if (p.empty) { setMsg(msg, ''); return; }
      if (p.error) { setMsg(msg, p.error, 'error'); return; }
      setMsg(msg, '');
      const utc = zone.value === 'utc';
      const w = pub.explainCron(p);
      const runs = pub.nextCronRuns(p, new Date(), 5, utc);
      words.textContent = w;
      next.textContent = runs.length ? runs.map((d) => fmt(d, utc)).join('\n') : 'No run found in the next 8 years. This schedule may never happen, for example 31 February.';
      text = w + (runs.length ? '\nNext runs:\n' + runs.map((d) => fmt(d, utc)).join('\n') : '');
    }
    input.addEventListener('input', render);
    zone.addEventListener('change', render);
    $('cron-copy').addEventListener('click', () => { if (!text) { toast('Nothing to copy yet'); return; } copy(text, 'Copied!'); });
    $('cron-clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
    render();
  })();

  window.LuTools10 = pub;
})();
