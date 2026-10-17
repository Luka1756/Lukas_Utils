/* Luka's Utils — Presets & Templates library (v9.8)
 *
 * One shared engine for every tool:
 *   - a registry of "kinds" (tool + type) that knows how to validate, capture, preview and apply data
 *   - built-in items, plus personal items kept in localStorage (never executed, never holding secrets)
 *   - a central library (#presets) and a compact in-tool picker mounted into each supporting panel
 *
 * Presets change only the settings they define. Templates load editable content.
 * Nothing here ever sends a webhook or publishes anything.
 */
(() => {
  'use strict';
  const B = window.LuBridge;
  if (!B) return;
  const { escapeHtml: esc, renderDiscordMarkdown: mdRender, showToast } = B;
  const $ = (id) => document.getElementById(id);

  const STORE_KEY = 'lu_library_v1';
  const APP_TAG = 'lukas-utils-library';
  const SCHEMA = 1;
  const LIM = { name: 80, desc: 300, category: 32, tag: 24, tags: 8, items: 500, file: 1500000, text: 4000, url: 2048 };

  /* ---------------------------------------------------------------- validation helpers */
  class DataError extends Error {}
  const bad = (msg) => { throw new DataError(msg); };
  const need = (cond, msg) => { if (!cond) bad(msg); };
  const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const stripCtl = (s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n');
  const cleanText = (s, max, multiline) => {
    let out = stripCtl(s);
    if (!multiline) out = out.replace(/[\n\t]+/g, ' ');
    return out.slice(0, max);
  };
  // Optional string: undefined when absent, an error when present but not text.
  const optStr = (o, key, max, multiline) => {
    const v = o[key];
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'string') bad(`"${key}" must be text`);
    return cleanText(v, max, multiline);
  };
  const optUrl = (o, key) => {
    const v = optStr(o, key, LIM.url, false);
    if (v === undefined || v === '') return v;
    if (!/^https?:\/\/[^\s]+$/i.test(v)) bad(`"${key}" must be a full http(s) link`);
    return v;
  };
  const HEX = /^#[0-9a-f]{6}$/i;

  // Webhook URLs and tokens are never stored or exported, whatever field they were typed into.
  const SECRET_PATTERNS = [
    /discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/\d{5,}/i,
    /\b[MNO][A-Za-z\d_-]{23,27}\.[A-Za-z\d_-]{6,7}\.[A-Za-z\d_-]{27,}\b/,
    /\bmfa\.[A-Za-z\d_-]{60,}/,
  ];
  const hasSecret = (value) => {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    return SECRET_PATTERNS.some(re => re.test(s));
  };

  /* ---------------------------------------------------------------- kinds */
  const TOOL_LABEL = {
    embed: 'Embed builder', webhook: 'Webhook builder', markdown: 'Markdown', permissions: 'Permissions',
    'role-color': 'Role color', colors: 'Color Lab', timestamp: 'Timestamp', styles: 'Text styles', mention: 'Mention',
  };
  const TYPE_LABEL = { preset: 'Preset', template: 'Template' };

  const permNames = new Map((B.permissions || []).map(([bit, name]) => [bit, name]));
  const permBits = (...n) => n.reduce((a, b) => a | (1n << BigInt(b)), 0n).toString();

  /* --- embed --- */
  const EMBED_PRESET_KEYS = ['color', 'footer', 'footerIcon', 'author', 'authorIcon', 'timestamp', 'senderName', 'senderAvatar'];
  function normEmbed(d, preset) {
    need(isPlain(d), 'Embed data is missing');
    const out = {};
    const S = (k, max, ml) => { const v = optStr(d, k, max, ml); if (v !== undefined) out[k] = v; };
    const U = (k) => { const v = optUrl(d, k); if (v !== undefined) out[k] = v; };
    S('content', 2000, true); S('author', 256); U('authorUrl'); U('authorIcon');
    S('title', 256); U('url'); S('description', 4096, true);
    S('footer', 2048); U('footerIcon'); U('thumbnail'); U('image');
    S('senderName', 80); U('senderAvatar');
    if (d.color !== undefined) {
      need(typeof d.color === 'string' && HEX.test(d.color), 'Color must look like #22D3EE');
      out.color = d.color.toUpperCase();
    }
    if (d.timestamp !== undefined) { need(typeof d.timestamp === 'boolean', '"timestamp" must be true or false'); out.timestamp = d.timestamp; }
    if (d.fields !== undefined) {
      need(Array.isArray(d.fields) && d.fields.length <= 25, 'An embed can have at most 25 fields');
      out.fields = d.fields.map((f, i) => {
        need(isPlain(f), `Field ${i + 1} is not valid`);
        const name = optStr(f, 'name', 256) || '';
        const value = optStr(f, 'value', 1024, true) || '';
        need(name || value, `Field ${i + 1} is empty`);
        if (f.inline !== undefined) need(typeof f.inline === 'boolean', `Field ${i + 1}: "inline" must be true or false`);
        return { name, value, inline: !!f.inline };
      });
    }
    const total = (out.title || '').length + (out.description || '').length + (out.footer || '').length + (out.author || '').length
      + (out.fields || []).reduce((n, f) => n + f.name.length + f.value.length, 0);
    need(total <= 6000, "Combined embed text is over Discord's 6000 character limit");
    if (preset) {
      Object.keys(out).forEach(k => { if (!EMBED_PRESET_KEYS.includes(k)) delete out[k]; });
      need(Object.keys(out).length > 0, 'An embed preset needs at least one setting (color, footer, author or timestamp)');
    } else {
      need(['content', 'title', 'description', 'author', 'footer'].some(k => out[k]) || (out.fields && out.fields.length), 'An embed template needs some content');
    }
    return out;
  }
  function captureEmbed(preset) {
    const e = B.embed.read();
    const out = {};
    const keep = (k) => { if (typeof e[k] === 'string' && e[k].trim()) out[k] = e[k].trim(); };
    if (preset) {
      keep('footer'); keep('footerIcon'); keep('author'); keep('authorIcon'); keep('senderName'); keep('senderAvatar');
      out.timestamp = !!e.timestamp;
      if (HEX.test(e.color)) out.color = e.color.toUpperCase();
      return out;
    }
    ['content', 'author', 'authorUrl', 'authorIcon', 'title', 'url', 'description', 'footer', 'footerIcon', 'thumbnail', 'image', 'senderName', 'senderAvatar'].forEach(keep);
    if (HEX.test(e.color)) out.color = e.color.toUpperCase();
    if (e.timestamp) out.timestamp = true;
    const fields = e.fields.filter(f => f.name.trim() || f.value.trim()).map(f => ({ name: f.name, value: f.value, inline: !!f.inline }));
    if (fields.length) out.fields = fields;
    if (!['content', 'title', 'description', 'author', 'footer'].some(k => out[k]) && !out.fields) bad('The Embed builder is empty — add some content first');
    return out;
  }
  function embedHtml(d, ghost) {
    const color = d.color && HEX.test(d.color) ? d.color : 'var(--accent)';
    let h = '';
    if (d.author) h += `<div class="ep-author">${esc(d.author)}</div>`;
    if (ghost && !d.title) h += `<div class="ep-title lib-ghost">Embed title</div>`;
    if (d.title) h += `<div class="ep-title">${esc(d.title)}</div>`;
    if (ghost && !d.description) h += `<div class="ep-desc lib-ghost">Your embed text goes here.</div>`;
    if (d.description) h += `<div class="ep-desc">${esc(d.description)}</div>`;
    if (d.fields && d.fields.length) {
      const allInline = d.fields.every(f => f.inline);
      h += `<div class="ep-fields ${allInline ? '' : 'ep-fields-stack'}">${d.fields.map(f => `<div class="ep-field"><div class="ep-field-name">${esc(f.name)}</div><div class="ep-field-value">${esc(f.value)}</div></div>`).join('')}</div>`;
    }
    const extras = [d.thumbnail && 'thumbnail', d.image && 'image'].filter(Boolean);
    if (extras.length) h += `<div class="ep-desc lib-ghost">+ ${extras.join(' and ')} (loaded when applied)</div>`;
    if (d.footer || d.timestamp) h += `<div class="ep-footer">${esc([d.footer, d.timestamp ? 'timestamp' : ''].filter(Boolean).join(' · '))}</div>`;
    const content = d.content ? `<div class="lib-msg-content">${mdRender(d.content)}</div>` : '';
    return `${content}<div class="embed-preview lib-embed" style="border-left-color:${esc(color)}">${h}</div>`;
  }
  const EMBED_LABELS = { color: 'accent color', footer: 'footer text', footerIcon: 'footer icon', author: 'author', authorIcon: 'author icon', timestamp: 'timestamp', senderName: 'bot name', senderAvatar: 'bot avatar' };

  /* --- the kind registry --- */
  const KINDS = {
    'embed/template': {
      tool: 'embed', type: 'template', slot: 'tool-embed', label: 'Embed template', defaultCategory: 'Embeds',
      norm: (d) => normEmbed(d, false), capture: () => captureEmbed(false),
      apply: (d) => B.embed.write({
        content: '', author: '', authorUrl: '', authorIcon: '', title: '', url: '', description: '', thumbnail: '', image: '',
        footer: '', footerIcon: '', timestamp: false, fields: [], color: '#22D3EE', senderName: '', senderAvatar: '', ...d,
      }),
      preview: (d) => embedHtml(d, false),
      effect: () => 'Replaces the content of the Embed builder. The webhook URL is never touched.',
    },
    'embed/preset': {
      tool: 'embed', type: 'preset', slot: 'tool-embed', label: 'Embed style preset', defaultCategory: 'Embed styles',
      norm: (d) => normEmbed(d, true), capture: () => captureEmbed(true),
      apply: (d) => B.embed.write(d),
      preview: (d) => embedHtml(d, true),
      effect: (d) => 'Changes only: ' + Object.keys(d).map(k => EMBED_LABELS[k] || k).join(', ') + '.',
    },
    'webhook/template': {
      tool: 'webhook', type: 'template', slot: 'tool-webhook-builder', label: 'Webhook message template', defaultCategory: 'Webhooks',
      norm(d) {
        need(isPlain(d), 'Webhook data is missing');
        const out = {};
        const name = optStr(d, 'username', 80); if (name !== undefined) out.username = name;
        const av = optUrl(d, 'avatar'); if (av !== undefined) out.avatar = av;
        const c = optStr(d, 'content', 2000, true); if (c !== undefined) out.content = c;
        need(out.username || out.content, 'A webhook template needs a name or message content');
        return out;
      },
      capture() {
        const out = {};
        const name = $('webhook-username-input').value.trim(); if (name) out.username = name;
        const av = $('webhook-avatar-input').value.trim(); if (av) out.avatar = av;
        const c = $('webhook-content-input').value; if (c.trim()) out.content = c;
        if (!out.username && !out.content) bad('The Webhook builder is empty — add a name or message first');
        return out;
      },
      apply(d) {
        setField('webhook-username-input', d.username || '');
        setField('webhook-avatar-input', d.avatar || '');
        setField('webhook-content-input', d.content || '');
      },
      preview: (d) => `<div class="lib-msg"><div class="lib-msg-head"><strong>${esc(d.username || 'Webhook')}</strong><span class="lib-bot">BOT</span></div><div class="lib-msg-content">${mdRender(d.content || '')}</div></div>`,
      effect: () => 'Replaces the name, avatar and message in the Webhook builder. Nothing is sent.',
      editText: 'content',
    },
    'markdown/template': {
      tool: 'markdown', type: 'template', slot: 'tool-markdown-preview', label: 'Markdown message template', defaultCategory: 'Messages',
      norm(d) {
        need(isPlain(d), 'Template text is missing');
        const text = optStr(d, 'text', LIM.text, true);
        need(text && text.trim(), 'A message template needs some text');
        return { text };
      },
      capture() {
        const t = $('md-preview-input').value;
        if (!t.trim()) bad('The Markdown preview is empty — write something first');
        return { text: t.slice(0, LIM.text) };
      },
      apply(d, slot) {
        if (slot === 'tool-webhook-builder') setField('webhook-content-input', d.text);
        else if (slot === 'templates') B.templates.set(d.text);
        else setField('md-preview-input', d.text);
      },
      preview: (d) => `<div class="md-preview-box lib-md">${mdRender(d.text)}</div>`,
      effect: (d, slot) => slot === 'tool-webhook-builder' ? 'Replaces the message content in the Webhook builder.'
        : slot === 'templates' ? 'Shows this text in the Selected template box, ready to copy.'
        : 'Replaces the text in the Markdown preview.',
      editText: 'text',
    },
    'permissions/preset': {
      tool: 'permissions', type: 'preset', slot: 'tool-permissions', label: 'Permissions preset', defaultCategory: 'Permissions',
      norm(d) {
        need(isPlain(d) && typeof d.value === 'string' && /^\d{1,20}$/.test(d.value), 'Permissions must be a whole number');
        need(BigInt(d.value) > 0n && BigInt(d.value) < (1n << 64n), 'Permissions must be between 1 and 2^64');
        return { value: BigInt(d.value).toString() };
      },
      capture() {
        const v = $('perm-integer-input').value.trim();
        if (!/^\d+$/.test(v) || BigInt(v) === 0n) bad('Tick some permissions first');
        return { value: BigInt(v).toString() };
      },
      apply: (d) => setField('perm-integer-input', d.value),
      preview(d) {
        const v = BigInt(d.value);
        const names = [];
        permNames.forEach((name, bit) => { if ((v >> BigInt(bit)) & 1n) names.push(name); });
        const extra = v >> 32n ? '<span class="lib-chip">+ higher bits</span>' : '';
        return `<div class="lib-chips">${names.map(n => `<span class="lib-chip">${esc(n)}</span>`).join('')}${extra}</div>`;
      },
      effect: (d) => `Sets the permission integer to ${d.value}.`,
    },
    'role-color/preset': {
      tool: 'role-color', type: 'preset', slot: 'tool-role-color', label: 'Role color preset', defaultCategory: 'Colors',
      norm(d) { need(isPlain(d) && typeof d.hex === 'string' && HEX.test(d.hex), 'Color must look like #22D3EE'); return { hex: d.hex.toUpperCase() }; },
      capture() {
        const v = $('role-color-hex').value.trim();
        if (!HEX.test(v)) bad('Enter a valid 6-digit hex color first');
        return { hex: v.toUpperCase() };
      },
      apply: (d) => setField('role-color-hex', d.hex),
      preview: (d) => `<div class="lib-color-row"><span class="lib-swatch" style="background:${esc(d.hex)}"></span><span class="role-pill" style="color:${esc(d.hex)}">role-name</span><code>${esc(d.hex)}</code></div>`,
      effect: (d) => `Sets the role color to ${d.hex}.`,
    },
    'colors/preset': {
      tool: 'colors', type: 'preset', slot: 'colors', label: 'Color Lab palette', defaultCategory: 'Palettes',
      norm(d) {
        need(isPlain(d), 'Palette is missing');
        const out = {};
        ['fg', 'bg', 'canvas'].forEach(k => { need(typeof d[k] === 'string' && HEX.test(d[k]), `"${k}" must look like #22D3EE`); out[k] = d[k].toUpperCase(); });
        return out;
      },
      capture: () => ({ ...B.colors.get() }),
      apply: (d) => B.colors.set(d),
      preview: (d) => `<div class="lib-palette" style="background:${esc(d.canvas)}"><div style="background:${esc(d.bg)};color:${esc(d.fg)}">${esc(B.sampleText())}</div></div>`,
      effect: () => 'Sets the foreground, background and canvas colors.',
    },
    'timestamp/preset': {
      tool: 'timestamp', type: 'preset', slot: 'tool-timestamp', label: 'Timestamp preset', defaultCategory: 'Time',
      norm(d) {
        need(isPlain(d), 'Timestamp settings are missing');
        const out = {};
        if (d.tzMode !== undefined) { need(d.tzMode === 'local' || d.tzMode === 'utc', 'Time mode must be local or utc'); out.tzMode = d.tzMode; }
        if (d.hourMode !== undefined) { need(d.hourMode === '12' || d.hourMode === '24', 'Hour format must be 12 or 24'); out.hourMode = d.hourMode; }
        if (d.zones !== undefined) {
          need(Array.isArray(d.zones) && d.zones.length <= 12, 'Up to 12 time zones');
          out.zones = d.zones.map(z => { need(typeof z === 'string' && z.length < 64 && B.timestamp.isZone(z), `"${String(z).slice(0, 30)}" is not a time zone this browser knows`); return z; });
        }
        need(Object.keys(out).length, 'A timestamp preset needs at least one setting');
        return out;
      },
      capture() {
        const t = B.timestamp.get();
        return { tzMode: t.tzMode, hourMode: t.hourMode, zones: t.zones };
      },
      apply: (d) => B.timestamp.set(d),
      preview(d) {
        const bits = [];
        if (d.tzMode) bits.push(d.tzMode === 'utc' ? 'UTC input' : 'Local input');
        if (d.hourMode) bits.push(d.hourMode + '-hour clock');
        const zones = d.zones ? `<div class="lib-chips">${d.zones.map(z => `<span class="lib-chip">${esc(z.replace(/_/g, ' '))}</span>`).join('')}</div>` : '';
        return `<p class="lib-line">${esc(bits.join(' · '))}</p>${zones}`;
      },
      effect: (d) => 'Changes only: ' + [d.tzMode && 'input time mode', d.hourMode && 'hour format', d.zones && 'the compared time zones (replaces your current list)'].filter(Boolean).join(', ') + '.',
    },
    'styles/preset': {
      tool: 'styles', type: 'preset', slot: 'styles', label: 'Text style preset', defaultCategory: 'Text',
      norm(d) {
        need(isPlain(d), 'Style settings are missing');
        const out = {};
        if (d.caseMode !== undefined) { need(['none', 'lower', 'title'].includes(d.caseMode), 'Case must be none, lower or title'); out.caseMode = d.caseMode; }
        if (d.size !== undefined) { need(Number.isInteger(d.size) && d.size >= 14 && d.size <= 34, 'Preview size must be 14–34'); out.size = d.size; }
        need(Object.keys(out).length, 'A text style preset needs a case or a size');
        return out;
      },
      capture: () => ({ ...B.styles.get() }),
      apply: (d) => B.styles.set(d),
      preview(d) {
        const t = d.caseMode === 'lower' ? 'example text' : d.caseMode === 'title' ? 'Example Text' : 'Example text';
        return `<p class="lib-line" style="font-size:${d.size || 22}px">${esc(t)}</p>`;
      },
      effect: (d) => 'Changes only: ' + [d.caseMode && 'text case', d.size && 'preview size'].filter(Boolean).join(' and ') + ". Your text isn't touched.",
    },
    'mention/preset': {
      tool: 'mention', type: 'preset', slot: 'tool-mention', label: 'Mention preset', defaultCategory: 'Mentions',
      norm(d) {
        need(isPlain(d) && ['user', 'role', 'channel'].includes(d.type), 'Mention type must be user, role or channel');
        need(typeof d.id === 'string' && /^\d{15,20}$/.test(d.id), 'ID must be 15–20 digits');
        return { type: d.type, id: d.id };
      },
      capture() {
        const id = $('mention-id-input').value.trim();
        if (!/^\d{15,20}$/.test(id)) bad('Enter a valid ID (15–20 digits) first');
        return { type: $('mention-type-select').value, id };
      },
      apply(d) { const s = $('mention-type-select'); s.value = d.type; setField('mention-id-input', d.id); },
      preview: (d) => `<p class="lib-line"><code>${esc(d.type === 'user' ? `<@${d.id}>` : d.type === 'role' ? `<@&${d.id}>` : `<#${d.id}>`)}</code></p>`,
      effect: (d) => `Sets the mention type to ${d.type} and the ID.`,
    },
  };

  function setField(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ---------------------------------------------------------------- slots (where tools live) */
  const SLOTS = {
    'tool-embed': {
      label: 'Embed builder', kinds: ['embed/template', 'embed/preset'], barLabel: 'Templates & presets',
      anchor: () => document.querySelector('#tool-embed > .panel-sub'),
      snapshot: () => B.embed.read(), restore: (s) => B.embed.write(s),
    },
    'tool-webhook-builder': {
      label: 'Webhook builder', kinds: ['webhook/template', 'markdown/template'], barLabel: 'Templates',
      saveKinds: ['webhook/template'],
      anchor: () => document.querySelector('#tool-webhook-builder > .panel-sub'),
      snapshot: () => ({ u: $('webhook-username-input').value, a: $('webhook-avatar-input').value, c: $('webhook-content-input').value }),
      restore: (s) => { setField('webhook-username-input', s.u); setField('webhook-avatar-input', s.a); setField('webhook-content-input', s.c); },
    },
    'tool-markdown-preview': {
      label: 'Markdown preview', kinds: ['markdown/template'], barLabel: 'Templates',
      anchor: () => document.querySelector('#tool-markdown-preview > .panel-sub'),
      snapshot: () => $('md-preview-input').value, restore: (s) => setField('md-preview-input', s),
    },
    templates: {
      label: 'Templates', kinds: ['markdown/template'], barLabel: 'Your library', saveKinds: [],
      anchor: () => document.querySelector('#templates > .panel-sub'),
      snapshot: () => B.templates.get(), restore: (s) => B.templates.set(s),
    },
    'tool-permissions': {
      label: 'Permissions calculator', kinds: ['permissions/preset'], barLabel: 'Presets',
      anchor: () => document.querySelector('#tool-permissions > .panel-sub'),
      snapshot: () => $('perm-integer-input').value, restore: (s) => setField('perm-integer-input', s),
    },
    'tool-role-color': {
      label: 'Role color converter', kinds: ['role-color/preset'], barLabel: 'Presets',
      anchor: () => document.querySelector('#tool-role-color > .panel-sub'),
      snapshot: () => $('role-color-hex').value, restore: (s) => setField('role-color-hex', s),
    },
    colors: {
      label: 'Color Lab', kinds: ['colors/preset'], barLabel: 'Presets',
      anchor: () => $('palette-grid') && $('palette-grid').parentElement.querySelector('.panel-title'),
      snapshot: () => B.colors.get(), restore: (s) => B.colors.set(s),
    },
    'tool-timestamp': {
      label: 'Timestamp builder', kinds: ['timestamp/preset'], barLabel: 'Presets',
      anchor: () => document.querySelector('#tool-timestamp > .panel-sub'),
      snapshot: () => B.timestamp.get(), restore: (s) => B.timestamp.set(s),
    },
    styles: {
      label: 'Text styles', kinds: ['styles/preset'], barLabel: 'Presets',
      anchor: () => document.querySelector('#styles > .section-note'),
      snapshot: () => B.styles.get(), restore: (s) => B.styles.set(s),
    },
    'tool-mention': {
      label: 'Mention formatter', kinds: ['mention/preset'], barLabel: 'Presets',
      anchor: () => document.querySelector('#tool-mention > .panel-sub'),
      snapshot: () => ({ t: $('mention-type-select').value, i: $('mention-id-input').value }),
      restore: (s) => { $('mention-type-select').value = s.t; setField('mention-id-input', s.i); },
    },
  };
  Object.values(SLOTS).forEach(s => { if (!s.saveKinds) s.saveKinds = s.kinds; });
  const kindKey = (item) => `${item.tool}/${item.type}`;
  const homeSlot = (item) => KINDS[kindKey(item)].slot;
  const slotAccepts = (slotId, item) => SLOTS[slotId].kinds.includes(kindKey(item));

  /* ---------------------------------------------------------------- built-in items */
  const builtins = [];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function def(tool, type, name, category, description, tags, data) {
    const item = { id: `b:${tool}-${slug(name)}`, builtin: true, tool, type, name, category, description, tags, data };
    const kind = KINDS[kindKey(item)];
    try { item.data = kind.norm(data); } catch (e) { console.warn('Bad built-in', item.id, e.message); return; }
    builtins.push(item);
  }

  // Embed templates
  def('embed', 'template', 'Announcement', 'Announcements', 'A server-wide notice with a date and place, signed by the staff team.', ['news', 'staff'], {
    color: '#5865F2', author: 'Server name', title: '📣 Announcement title',
    description: 'A short summary of the news and who it affects.\n\nKeep it to two or three sentences.',
    fields: [{ name: 'When', value: 'Date and time', inline: true }, { name: 'Where', value: 'Channel or link', inline: true }],
    footer: 'Posted by the staff team', timestamp: true,
  });
  def('embed', 'template', 'Server rules', 'Community', 'Four plain rules in a stacked layout, with a consequence line in the footer.', ['rules', 'moderation'], {
    color: '#FEE75C', title: '📜 Server rules', description: 'Please read and follow these so everyone can enjoy the server.',
    fields: [
      { name: '1. Be respectful', value: 'No harassment, hate speech or personal attacks.' },
      { name: '2. Stay on topic', value: 'Use the right channel for each conversation.' },
      { name: '3. No spam or self-promotion', value: 'Do not flood channels or advertise without permission.' },
      { name: "4. Follow Discord's rules", value: "Discord's Terms of Service and Community Guidelines apply here too." },
    ],
    footer: 'Breaking the rules may lead to a warning, mute or ban.',
  });
  def('embed', 'template', 'Changelog', 'Updates', 'Release notes with Added, Changed and Fixed sections.', ['update', 'release', 'patch notes'], {
    color: '#22D3EE', title: 'Update v1.0', description: 'A one-line summary of this release.',
    fields: [{ name: 'Added', value: '• New thing' }, { name: 'Changed', value: '• Improved thing' }, { name: 'Fixed', value: '• Bug that is gone' }],
    footer: 'Changelog', timestamp: true,
  });
  def('embed', 'template', 'Event invite', 'Events', 'When, where and how to join, for a community event.', ['event', 'rsvp'], {
    color: '#EB459E', title: '🎉 Event name', description: 'What the event is and why people should join.',
    fields: [{ name: 'When', value: 'Date and time (include a time zone)', inline: true }, { name: 'Where', value: 'Voice channel or link', inline: true }, { name: 'How to join', value: 'React to this message to RSVP.' }],
    footer: 'Hosted by the community team',
  });
  def('embed', 'template', 'Welcome', 'Community', 'A friendly first message that points new members to the right places.', ['welcome', 'onboarding'], {
    color: '#57F287', title: '👋 Welcome to the server', description: "Glad you're here! Here is how to get started.",
    fields: [{ name: 'Start here', value: 'Read the rules, pick your roles, then say hi.' }, { name: 'Need help?', value: 'Ask any staff member.' }],
  });
  def('embed', 'template', 'Status update', 'Updates', 'An incident or maintenance notice with status, impact and next update.', ['status', 'incident', 'maintenance'], {
    color: '#FEE75C', title: '🟡 Status update', description: "We're looking into the issue and will share more soon.",
    fields: [{ name: 'Status', value: 'Investigating', inline: true }, { name: 'Impact', value: 'What is affected', inline: true }, { name: 'Next update', value: 'Time', inline: true }],
    footer: 'Status', timestamp: true,
  });
  def('embed', 'template', 'Giveaway', 'Events', 'Prize, end time and entry steps.', ['giveaway', 'contest'], {
    color: '#F1C40F', title: '🎁 Giveaway', description: 'Enter for a chance to win.',
    fields: [{ name: 'Prize', value: 'What is being given away', inline: true }, { name: 'Ends', value: 'Date and time', inline: true }, { name: 'Winners', value: '1', inline: true }, { name: 'How to enter', value: 'React with 🎉 below.' }],
    footer: 'Winners are picked at random',
  });

  // Embed style presets (only the settings they list are changed)
  [['Info blue', '#5865F2', 'Blurple, for general information.'], ['Success green', '#57F287', 'For confirmations and good news.'],
   ['Warning amber', '#FEE75C', 'For cautions and notices.'], ['Danger red', '#ED4245', 'For errors, bans and urgent notices.'],
   ['Neutral grey', '#99AAB5', 'A quiet color that stays out of the way.'], ["Luka's cyan", '#22D3EE', 'The accent color used across this site.']]
    .forEach(([name, color, d]) => def('embed', 'preset', name, 'Embed colors', d + ' Changes only the accent color.', ['color', 'accent'], { color }));
  def('embed', 'preset', 'Staff footer + timestamp', 'Embed footers', 'Adds a staff footer and turns the timestamp on. Content is left alone.', ['footer', 'staff'], { footer: 'Posted by the staff team', timestamp: true });
  def('embed', 'preset', 'No timestamp', 'Embed footers', 'Turns the timestamp off and nothing else.', ['footer'], { timestamp: false });

  // Webhook templates
  def('webhook', 'template', 'Release bot', 'Updates', 'A release announcement from a bot-style sender.', ['release', 'update'], { username: 'Release Notes', content: '**v1.0 is out**\n\n- New: describe the headline feature\n- Fixed: describe the main fix\n\nFull notes are in the changelog.' });
  def('webhook', 'template', 'Status bot', 'Updates', 'A one-line service status.', ['status'], { username: 'Status', content: '🟢 **All systems operational**\nNo known issues right now.' });
  def('webhook', 'template', 'Event reminder', 'Events', 'A short reminder shortly before an event.', ['event', 'reminder'], { username: 'Event Reminder', content: '🎉 **Starting soon:** event name\n**Where:** channel or link\n\nSee you there!' });

  // Markdown message templates
  const MD = (name, category, description, tags, text) => def('markdown', 'template', name, category, description, tags, { text });
  MD('Announcement', 'Announcements', 'A headline, a short summary, a few points and a closing line.', ['news'],
    "# 📣 Announcement title\n\nA short summary of what's happening and who it affects.\n\n**What's changing**\n- First point\n- Second point\n\n**When:** date and time\n**Where:** channel or link\n\n> Questions? Ask in the help channel.");
  MD('Server rules', 'Community', 'Four numbered rules with a consequence line.', ['rules', 'moderation'],
    "# 📜 Server rules\n\n**1. Be respectful**\nNo harassment, hate speech or personal attacks.\n\n**2. Stay on topic**\nUse the right channel for each conversation.\n\n**3. No spam or self-promotion**\nDo not flood channels or advertise without permission.\n\n**4. Follow Discord's rules**\nDiscord's Terms of Service and Community Guidelines apply here too.\n\n> Breaking the rules may lead to a warning, mute or ban.");
  MD('Changelog', 'Updates', 'Release notes with Added, Changed and Fixed lists.', ['update', 'patch notes'],
    "# Update v1.0\nA one-line summary of this release.\n\n## Added\n- New thing\n\n## Changed\n- Improved thing\n\n## Fixed\n- Bug that is gone");
  MD('Welcome', 'Community', 'A friendly welcome with three first steps.', ['welcome', 'onboarding'],
    "# 👋 Welcome!\n\nGlad you're here. A few things to get you started:\n\n1. Read the rules channel.\n2. Pick your roles.\n3. Say hi in the general channel.\n\n> Need help? Ask a staff member any time.");
  MD('Event announcement', 'Events', 'What, when, where and how to join.', ['event', 'rsvp'],
    "# 🎉 Event name\n\n**What:** short description of the event\n**When:** date and time (include a time zone)\n**Where:** voice channel or link\n\n**How to join**\n- React to this message to RSVP\n- Be there a few minutes early\n\n> Everyone is welcome.");
  MD('FAQ', 'Community', 'Three question-and-answer pairs.', ['help', 'faq'],
    "# ❓ Frequently asked questions\n\n**How do I get started?**\nShort, direct answer.\n\n**Where do I report a problem?**\nShort, direct answer.\n\n**Who do I ask for help?**\nShort, direct answer.");
  MD('Giveaway', 'Events', 'Prize, deadline and entry steps.', ['giveaway', 'contest'],
    "# 🎁 Giveaway\n\n**Prize:** what is being given away\n**Ends:** date and time\n**Winners:** 1\n\n**How to enter**\n- React with 🎉 to this message\n- Be a member of the server\n\n> Winners are picked at random and announced here.");
  MD('Status update', 'Updates', 'A short incident or maintenance notice.', ['status', 'incident'],
    "## 🟡 Status update\n\n**Status:** investigating\n**Impact:** what is affected\n**Started:** time\n\nWe're looking into the issue and will post the next update by a stated time.");

  // Permission presets (integers are built from the bit numbers, so they cannot drift from the tool's list)
  const STD = [0, 6, 9, 10, 11, 14, 15, 16, 18, 20, 21, 25, 26, 31];
  const P = (name, desc, tags, bits) => def('permissions', 'preset', name, 'Roles', desc, tags, { value: permBits(...bits) });
  P('Read-only member', 'Can see channels and read history. Cannot send anything.', ['view', 'read'], [10, 16]);
  P('Standard member', 'Chat, embeds, files, reactions, voice and slash commands. No moderation.', ['member', 'default'], STD);
  P('Moderator', 'Standard member plus kick, ban, message management, voice moderation, nicknames and the audit log. Review before assigning.', ['moderation', 'staff'], [...STD, 1, 2, 7, 13, 22, 23, 24, 27]);
  P('Voice moderator', 'Connect, speak and priority speaker, plus mute, deafen and move.', ['voice', 'moderation'], [8, 10, 20, 21, 22, 23, 24, 25]);
  P('Announcer', 'Can post with embeds and files and mention @everyone. Does not moderate.', ['announcements', 'staff'], [6, 10, 11, 14, 15, 16, 17, 18]);
  P('Typical bot', 'Send messages, embeds, files, history, reactions, external emojis and slash commands.', ['bot', 'oauth'], [6, 10, 11, 14, 15, 16, 18, 31]);

  // Role colors
  [['Teal', '#1ABC9C'], ['Green', '#2ECC71'], ['Blue', '#3498DB'], ['Purple', '#9B59B6'], ['Magenta', '#E91E63'], ['Yellow', '#F1C40F'],
   ['Orange', '#E67E22'], ['Red', '#E74C3C'], ['Grey', '#95A5A6'], ['Blurple', '#5865F2']]
    .forEach(([n, hex]) => def('role-color', 'preset', n, 'Role colors', `${hex} — a common choice for Discord role colors.`, ['role', 'color'], { hex }));

  // Color Lab palettes (the five existing ones come from the tool itself, so they stay in sync)
  B.palettes.forEach(p => def('colors', 'preset', p.name, 'Palettes', 'A foreground, background and canvas set from the Color Lab.', ['palette', 'contrast'], { fg: p.fg, bg: p.bg, canvas: p.canvas }));
  def('colors', 'preset', 'Discord light', 'Palettes', 'Dark text on a white message background.', ['palette', 'light'], { fg: '#313338', bg: '#FFFFFF', canvas: '#E3E5E8' });
  def('colors', 'preset', 'Blurple', 'Palettes', 'White text on a blurple message background.', ['palette', 'brand'], { fg: '#FFFFFF', bg: '#5865F2', canvas: '#1E1F22' });
  def('colors', 'preset', 'High contrast', 'Palettes', 'White on black, the strongest contrast the tool can show.', ['palette', 'accessibility'], { fg: '#FFFFFF', bg: '#000000', canvas: '#111111' });

  // Timestamp presets
  def('timestamp', 'preset', 'UTC, 24-hour', 'Time', 'Enter times as UTC and show a 24-hour clock. Leaves your time zone list alone.', ['utc', '24h'], { tzMode: 'utc', hourMode: '24' });
  def('timestamp', 'preset', 'Local, 12-hour', 'Time', 'Enter times in your own time zone and show a 12-hour clock.', ['local', '12h'], { tzMode: 'local', hourMode: '12' });
  def('timestamp', 'preset', 'US time zones', 'Time zones', 'Compare Eastern, Central, Mountain and Pacific.', ['us', 'zones'], { zones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'] });
  def('timestamp', 'preset', 'Europe', 'Time zones', 'Compare London, Paris, Berlin and Helsinki.', ['europe', 'zones'], { zones: ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Helsinki'] });
  def('timestamp', 'preset', 'Asia-Pacific', 'Time zones', 'Compare India, Singapore, Tokyo and Sydney.', ['asia', 'zones'], { zones: ['Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'] });
  def('timestamp', 'preset', 'Global team', 'Time zones', 'A spread across the day: Los Angeles, New York, London, Berlin, Kolkata, Tokyo.', ['team', 'zones'], { zones: ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Tokyo'] });

  // Text style presets
  def('styles', 'preset', 'Default', 'Text', 'Original case at 22px — a quick way back to how the site starts.', ['reset'], { caseMode: 'none', size: 22 });
  def('styles', 'preset', 'Compact', 'Text', 'Smaller previews so more styles fit on screen.', ['small'], { size: 16 });
  def('styles', 'preset', 'Large', 'Text', 'Bigger previews for easier reading.', ['big'], { size: 30 });
  def('styles', 'preset', 'Lowercase', 'Text', 'Lowercases your text before styling it.', ['case'], { caseMode: 'lower' });
  def('styles', 'preset', 'Title case, large', 'Text', 'Capitalizes each word and enlarges the previews.', ['case', 'big'], { caseMode: 'title', size: 28 });

  /* ---------------------------------------------------------------- personal storage */
  const store = {
    items: [], persist: true, readOnly: false, dropped: 0, corrupt: false, backupRaw: null, backedUp: false,
  };
  const storage = {
    get() { try { return window.localStorage; } catch (e) { return null; } },
  };

  function newId() {
    let r;
    try { r = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { r = Math.random().toString(16).slice(2, 14).padEnd(12, '0'); }
    return `u_${Date.now().toString(36)}${r}`;
  }
  const cleanTags = (tags) => {
    if (tags === undefined || tags === null) return [];
    need(Array.isArray(tags), 'Tags must be a list');
    const out = [];
    tags.forEach(t => {
      if (typeof t !== 'string') return;
      const v = cleanText(t, LIM.tag, false).trim().toLowerCase();
      if (v && !out.includes(v) && out.length < LIM.tags) out.push(v);
    });
    return out;
  };

  // Turns untrusted input into a safe item, or explains why it cannot be used.
  function validateItem(raw, { keepId = true } = {}) {
    try {
      need(isPlain(raw), 'Not an item');
      need(raw.type === 'preset' || raw.type === 'template', 'Type must be "preset" or "template"');
      need(typeof raw.tool === 'string', 'Missing tool');
      const kind = KINDS[`${raw.tool}/${raw.type}`];
      need(kind, `This version has no ${raw.type} for "${String(raw.tool).slice(0, 30)}"`);
      need(typeof raw.name === 'string' && raw.name.trim(), 'Missing name');
      const item = {
        id: keepId && typeof raw.id === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(raw.id) ? raw.id : newId(),
        tool: raw.tool, type: raw.type,
        name: cleanText(raw.name, LIM.name, false).trim(),
        description: typeof raw.description === 'string' ? cleanText(raw.description, LIM.desc, false).trim() : '',
        category: typeof raw.category === 'string' && raw.category.trim() ? cleanText(raw.category, LIM.category, false).trim() : kind.defaultCategory,
        tags: cleanTags(raw.tags),
        data: kind.norm(raw.data),
        createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
        updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
      };
      need(item.name, 'Missing name');
      if (hasSecret([item.name, item.description, item.category, item.tags, item.data])) bad('Contains what looks like a webhook URL or token, which this library never stores');
      return { ok: true, item };
    } catch (e) {
      if (e instanceof DataError) return { ok: false, error: e.message };
      return { ok: false, error: 'Could not be read' };
    }
  }

  function loadStore() {
    store.items = []; store.persist = true; store.readOnly = false; store.dropped = 0; store.corrupt = false; store.backupRaw = null;
    const ls = storage.get();
    if (!ls) { store.persist = false; return; }
    let raw = null;
    try { raw = ls.getItem(STORE_KEY); } catch (e) { store.persist = false; return; }
    if (!raw) return;
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { store.corrupt = true; store.backupRaw = raw; return; }
    if (!isPlain(parsed) || !Array.isArray(parsed.items)) { store.corrupt = true; store.backupRaw = raw; return; }
    if (typeof parsed.version === 'number' && parsed.version > SCHEMA) { store.readOnly = true; return; }
    const seen = new Set();
    parsed.items.forEach(r => {
      const v = validateItem(r);
      if (!v.ok || seen.has(v.item.id) || v.item.id.startsWith('b:')) { store.dropped++; return; }
      seen.add(v.item.id);
      store.items.push(v.item);
    });
    if (store.dropped) store.backupRaw = raw;
  }

  // Returns true when the write reached localStorage. On failure the items stay in memory for this page.
  function saveStore() {
    if (store.readOnly) return false;
    const ls = storage.get();
    if (!ls) { store.persist = false; return false; }
    try {
      if (store.backupRaw && !store.backedUp) {
        try { ls.setItem(STORE_KEY + '_backup', store.backupRaw); store.backedUp = true; } catch (e) { /* the main write below decides */ }
      }
      ls.setItem(STORE_KEY, JSON.stringify({ version: SCHEMA, items: store.items }));
      store.persist = true;
      return true;
    } catch (e) {
      store.persist = false;
      return false;
    }
  }

  const personalItems = () => store.items.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const allItems = () => [...personalItems(), ...builtins];
  const findItem = (id) => allItems().find(i => i.id === id);

  function commit(message) {
    const ok = saveStore();
    refresh();
    if (!ok) {
      showToast(store.readOnly ? 'Library is read-only' : "Couldn't save to this browser");
    } else if (message) showToast(message);
    return ok;
  }

  /* ---------------------------------------------------------------- applying */
  let undoTimer = null;
  const undoBox = document.createElement('div');
  undoBox.className = 'lib-toast';
  undoBox.setAttribute('role', 'status');
  undoBox.setAttribute('aria-live', 'polite');
  undoBox.hidden = true;
  document.body.appendChild(undoBox);
  function hideUndo() { clearTimeout(undoTimer); undoBox.hidden = true; undoBox.innerHTML = ''; }
  function showUndo(message, undo) {
    clearTimeout(undoTimer);
    undoBox.innerHTML = `<span class="lib-toast-msg">${esc(message)}</span><button type="button" class="lib-toast-btn" data-undo>Undo</button><button type="button" class="lib-toast-x" data-close aria-label="Dismiss">×</button>`;
    undoBox.hidden = false;
    undoBox.querySelector('[data-undo]').onclick = () => { try { undo(); showToast('Restored'); } catch (e) { showToast("Couldn't undo"); } hideUndo(); };
    undoBox.querySelector('[data-close]').onclick = hideUndo;
    undoTimer = setTimeout(hideUndo, 9000);
  }

  function applyItem(item, slotId, { navigate } = {}) {
    const key = kindKey(item);
    const kind = KINDS[key];
    const slotKey = slotId || kind.slot;
    const slot = SLOTS[slotKey];
    if (!kind || !slot || !slotAccepts(slotKey, item)) { showToast("That item doesn't fit this tool"); return false; }
    const snap = slot.snapshot();
    try {
      kind.apply(item.data, slotKey);
    } catch (e) {
      try { slot.restore(snap); } catch (e2) { /* nothing more to do */ }
      showToast("Couldn't apply that item");
      return false;
    }
    if (navigate) B.openTool(slotKey);
    showUndo(`${item.type === 'preset' ? 'Applied' : 'Loaded'} “${item.name}” in ${slot.label}`, () => slot.restore(snap));
    return true;
  }

  /* ---------------------------------------------------------------- dialog plumbing */
  const dlg = document.createElement('dialog');
  dlg.className = 'lib-dialog';
  dlg.setAttribute('aria-labelledby', 'lib-dialog-title');
  document.body.appendChild(dlg);
  let dlgOpener = null;
  function openDialog(html, opener, mount) {
    dlgOpener = opener || document.activeElement;
    dlgReturn = selectorFor(dlgOpener);
    dlg.innerHTML = html;
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    if (mount) mount(dlg);
    const first = dlg.querySelector('[autofocus], input, textarea, select, button');
    if (first) first.focus();
  }
  function closeDialog() {
    if (typeof dlg.close === 'function') { if (dlg.open) dlg.close(); } else dlg.removeAttribute('open');
  }
  // The lists re-render after a save, which detaches the button that opened the dialog,
  // so remember how to find it again and give focus back to the same control.
  function selectorFor(el) {
    if (!el || !el.closest) return null;
    const bar = el.closest('.lib-bar');
    if (bar) {
      const row = el.closest('.lib-row');
      if (row && el.dataset.barAct) return `.lib-bar[data-slot="${bar.dataset.slot}"] .lib-row[data-id="${row.dataset.id}"] [data-bar-act="${el.dataset.barAct}"]`;
      const cls = [...el.classList].find(c => c.startsWith('lib-bar-'));
      return cls ? `.lib-bar[data-slot="${bar.dataset.slot}"] .${cls}` : null;
    }
    const card = el.closest('.lib-card');
    if (card && el.dataset.act) return `.lib-card[data-id="${card.dataset.id}"] [data-act="${el.dataset.act}"]`;
    if (el.dataset.top) return `#lib-root [data-top="${el.dataset.top}"]`;
    return null;
  }
  let dlgReturn = null;
  dlg.addEventListener('close', () => {
    dlg.innerHTML = '';
    const target = dlgOpener && dlgOpener.isConnected ? dlgOpener : (dlgReturn && document.querySelector(dlgReturn)) || $('lib-q');
    if (target && target.focus) target.focus({ preventScroll: true });
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(); });
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-dlg-close]')) closeDialog(); });

  const dlgHead = (title) => `<div class="lib-dlg-head"><h3 id="lib-dialog-title">${esc(title)}</h3><button type="button" class="lib-dlg-x" data-dlg-close aria-label="Close">×</button></div>`;

  /* ---------------------------------------------------------------- save / edit dialog */
  function metaFields(v) {
    const cats = [...new Set(allItems().map(i => i.category))].sort();
    return `
      <label class="lib-label" for="lib-f-name">Name</label>
      <input id="lib-f-name" class="text-input" type="text" maxlength="${LIM.name}" value="${esc(v.name || '')}" autocomplete="off" required>
      <label class="lib-label" for="lib-f-desc">Description <span class="optional-tag">optional</span></label>
      <textarea id="lib-f-desc" class="text-input textarea lib-textarea-sm" rows="2" maxlength="${LIM.desc}">${esc(v.description || '')}</textarea>
      <div class="lib-two">
        <div><label class="lib-label" for="lib-f-cat">Category</label>
          <input id="lib-f-cat" class="text-input" type="text" maxlength="${LIM.category}" value="${esc(v.category || '')}" list="lib-cats" autocomplete="off"></div>
        <div><label class="lib-label" for="lib-f-tags">Tags <span class="optional-tag">comma separated</span></label>
          <input id="lib-f-tags" class="text-input" type="text" value="${esc((v.tags || []).join(', '))}" autocomplete="off"></div>
      </div>
      <datalist id="lib-cats">${cats.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>`;
  }
  const readMeta = () => ({
    name: $('lib-f-name').value, description: $('lib-f-desc').value, category: $('lib-f-cat').value,
    tags: $('lib-f-tags').value.split(',').map(s => s.trim()).filter(Boolean),
  });

  // Save what is currently in a tool as a new personal item.
  function openSaveDialog({ slotId, opener }) {
    const slot = slotId ? SLOTS[slotId] : null;
    const kindKeys = slot ? slot.saveKinds : Object.keys(KINDS);
    if (!kindKeys.length) { showToast('Nothing to save from here'); return; }
    if (store.readOnly) { showToast('Library is read-only'); return; }
    if (store.items.length >= LIM.items) { showToast(`Your library is full (${LIM.items} items)`); return; }
    const options = kindKeys.map(k => `<option value="${esc(k)}">${esc(KINDS[k].label)}${slot ? '' : ' — from ' + esc(SLOTS[KINDS[k].slot].label)}</option>`).join('');
    openDialog(`
      ${dlgHead(slot ? `Save from ${slot.label}` : 'New personal item')}
      <form class="lib-form" id="lib-save-form" novalidate>
        <label class="lib-label" for="lib-f-kind">Save as</label>
        <select id="lib-f-kind" class="text-input select-input">${options}</select>
        <p class="lib-hint" id="lib-save-hint"></p>
        ${metaFields({})}
        <p class="lib-error" id="lib-form-error" role="alert" hidden></p>
        <div class="lib-dlg-actions"><button type="button" class="btn-outline" data-dlg-close>Cancel</button><button type="submit" class="copy-btn">Save</button></div>
      </form>`, opener, () => {
      const kindSel = $('lib-f-kind');
      const hint = () => {
        const k = KINDS[kindSel.value];
        $('lib-save-hint').textContent = (k.type === 'preset' ? 'Presets save the current settings of ' : 'Templates save the current content of ') + SLOTS[k.slot].label + '. Webhook URLs are never saved.';
      };
      kindSel.addEventListener('change', hint); hint();
      if (kindKeys.length === 1) kindSel.closest('.lib-form').querySelector('label[for="lib-f-kind"]').hidden = kindSel.hidden = true;
      $('lib-save-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const err = $('lib-form-error');
        const kind = KINDS[kindSel.value];
        let data;
        try { data = kind.capture(); } catch (ex) { err.textContent = ex instanceof DataError ? ex.message : "Couldn't read that tool"; err.hidden = false; return; }
        const meta = readMeta();
        const v = validateItem({ ...meta, tool: kind.tool, type: kind.type, data }, { keepId: false });
        if (!v.ok) { err.textContent = v.error; err.hidden = false; return; }
        store.items.push(v.item);
        closeDialog();
        commit(`Saved “${v.item.name}” to your library`);
      });
    });
  }

  function openEditDialog(item, opener) {
    if (item.builtin || store.readOnly) return;
    const kind = KINDS[kindKey(item)];
    const slot = SLOTS[kind.slot];
    const textField = kind.editText;
    const textArea = textField ? `
      <label class="lib-label" for="lib-f-text">${textField === 'text' ? 'Message text' : 'Message content'}</label>
      <textarea id="lib-f-text" class="text-input textarea" rows="7" maxlength="${LIM.text}">${esc(item.data[textField] || '')}</textarea>` : '';
    const refresh_ = `
      <label class="checkbox-row lib-check"><input type="checkbox" id="lib-f-recapture"> Replace the saved ${item.type === 'preset' ? 'settings' : 'content'} with what's currently in ${esc(slot.label)}</label>`;
    openDialog(`
      ${dlgHead('Edit ' + item.type)}
      <form class="lib-form" id="lib-edit-form" novalidate>
        ${metaFields(item)}
        ${textArea}
        ${slot.saveKinds.includes(kindKey(item)) ? refresh_ : ''}
        <p class="lib-error" id="lib-form-error" role="alert" hidden></p>
        <div class="lib-dlg-actions"><button type="button" class="btn-outline" data-dlg-close>Cancel</button><button type="submit" class="copy-btn">Save changes</button></div>
      </form>`, opener, () => {
      $('lib-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const err = $('lib-form-error');
        let data = item.data;
        try {
          if ($('lib-f-recapture') && $('lib-f-recapture').checked) data = kind.capture();
          else if (textField) data = { ...item.data, [textField]: $('lib-f-text').value };
        } catch (ex) { err.textContent = ex instanceof DataError ? ex.message : "Couldn't read that tool"; err.hidden = false; return; }
        const v = validateItem({ ...item, ...readMeta(), data, updatedAt: Date.now() });
        if (!v.ok) { err.textContent = v.error; err.hidden = false; return; }
        const idx = store.items.findIndex(i => i.id === item.id);
        if (idx < 0) { closeDialog(); return; }
        store.items[idx] = { ...v.item, id: item.id, createdAt: item.createdAt };
        closeDialog();
        commit(`Updated “${v.item.name}”`);
      });
    });
  }

  function duplicateItem(item) {
    if (store.readOnly) { showToast('Library is read-only'); return; }
    if (store.items.length >= LIM.items) { showToast(`Your library is full (${LIM.items} items)`); return; }
    const v = validateItem({ ...item, id: undefined, name: cleanText(item.name + ' (copy)', LIM.name, false), createdAt: Date.now(), updatedAt: Date.now() }, { keepId: false });
    if (!v.ok) { showToast("Couldn't copy that item"); return; }
    store.items.push(v.item);
    commit(item.builtin ? `Saved a copy of “${item.name}” to your library` : `Duplicated “${item.name}”`);
  }

  function openDeleteDialog(item, opener) {
    if (item.builtin || store.readOnly) return;
    openDialog(`
      ${dlgHead('Delete this item?')}
      <p class="lib-hint">“${esc(item.name)}” will be removed from this browser. This can't be undone — export a backup first if you might want it back.</p>
      <div class="lib-dlg-actions"><button type="button" class="btn-outline" data-dlg-close>Cancel</button><button type="button" class="copy-btn lib-danger" id="lib-confirm-delete">Delete</button></div>`, opener, () => {
      $('lib-confirm-delete').addEventListener('click', () => {
        store.items = store.items.filter(i => i.id !== item.id);
        closeDialog();
        commit(`Deleted “${item.name}”`);
      });
    });
  }

  /* ---------------------------------------------------------------- preview dialog */
  function openPreviewDialog(item, slotId, opener) {
    const kind = KINDS[kindKey(item)];
    const target = slotId && slotAccepts(slotId, item) ? slotId : kind.slot;
    const tags = item.tags.length ? `<p class="lib-tags">${item.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</p>` : '';
    openDialog(`
      ${dlgHead(item.name)}
      <p class="lib-badges">${badgesHtml(item)}</p>
      ${item.description ? `<p class="lib-desc">${esc(item.description)}</p>` : ''}
      <div class="lib-preview lib-preview-full">${kind.preview(item.data, target)}</div>
      <p class="lib-effect">${esc(kind.effect(item.data, target))}</p>
      ${tags}
      <div class="lib-dlg-actions"><button type="button" class="btn-outline" data-dlg-close>Close</button><button type="button" class="copy-btn" id="lib-prev-apply">${item.type === 'preset' ? 'Apply preset' : 'Load template'}</button></div>`, opener, () => {
      $('lib-prev-apply').addEventListener('click', () => { closeDialog(); applyItem(item, target, { navigate: !slotId }); });
    });
  }

  /* ---------------------------------------------------------------- import / export */
  const fingerprint = (i) => JSON.stringify([i.tool, i.type, i.name, i.data]);

  function parseImport(text) {
    if (typeof text !== 'string') return { error: 'Choose a file or paste some JSON first.' };
    if (text.length > LIM.file) return { error: 'That file is too large to import (limit 1.5 MB).' };
    if (!text.trim()) return { error: 'Choose a file or paste some JSON first.' };
    let data;
    try { data = JSON.parse(text); } catch (e) { return { error: "That isn't valid JSON." }; }
    let list;
    if (Array.isArray(data)) list = data;
    else if (isPlain(data) && Array.isArray(data.items)) {
      if (typeof data.version === 'number' && data.version > SCHEMA) return { error: "That backup was made by a newer version of Luka's Utils and can't be read safely here." };
      if (data.app !== undefined && data.app !== APP_TAG) return { error: "That file wasn't exported from the Presets & Templates library." };
      list = data.items;
    } else if (isPlain(data) && ('favorites' in data || 'colors' in data)) {
      return { error: 'That looks like a session snapshot. Use "Import JSON" under Session snapshot below for those.' };
    } else return { error: "That doesn't look like a library backup." };
    if (list.length === 0) return { error: 'That backup has no items.' };
    if (list.length > LIM.items) return { error: `Too many items (limit ${LIM.items} per import).` };

    const existingIds = new Set(store.items.map(i => i.id));
    const prints = new Set(store.items.map(fingerprint));
    const toAdd = [], skipped = [];
    list.forEach((raw, idx) => {
      const label = isPlain(raw) && typeof raw.name === 'string' ? `“${cleanText(raw.name, 40, false)}”` : `Item ${idx + 1}`;
      const v = validateItem(raw);
      if (!v.ok) { skipped.push({ label, reason: v.error, kind: 'invalid' }); return; }
      const item = v.item;
      if (prints.has(fingerprint(item))) { skipped.push({ label, reason: 'Already in your library', kind: 'duplicate' }); return; }
      let renamed = false;
      if (item.id.startsWith('b:') || existingIds.has(item.id)) {
        item.id = newId();
        item.name = cleanText(item.name + ' (imported)', LIM.name, false);
        renamed = true;
      }
      existingIds.add(item.id); prints.add(fingerprint(item));
      toAdd.push({ item, renamed, label });
    });
    return { toAdd, skipped };
  }

  function openImportDialog(opener) {
    if (store.readOnly) { showToast('Library is read-only'); return; }
    openDialog(`
      ${dlgHead('Import a backup')}
      <p class="lib-hint">Choose a file exported from this library, or paste its JSON. You'll see exactly what will be added before anything is saved. Existing items are never overwritten.</p>
      <input type="file" id="lib-import-file" accept="application/json,.json" class="lib-file">
      <label class="lib-label" for="lib-import-text">Or paste JSON</label>
      <textarea id="lib-import-text" class="text-input textarea" rows="5" spellcheck="false" placeholder='{"app":"${APP_TAG}","version":1,"items":[…]}'></textarea>
      <p class="lib-error" id="lib-import-error" role="alert" hidden></p>
      <div id="lib-import-review"></div>
      <div class="lib-dlg-actions"><button type="button" class="btn-outline" data-dlg-close>Cancel</button><button type="button" class="copy-btn" id="lib-import-review-btn">Review</button></div>`, opener, () => {
      const fileInput = $('lib-import-file');
      const ta = $('lib-import-text');
      const err = $('lib-import-error');
      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        if (f.size > LIM.file) { err.textContent = 'That file is too large to import (limit 1.5 MB).'; err.hidden = false; return; }
        const reader = new FileReader();
        reader.onload = () => { ta.value = String(reader.result || ''); err.hidden = true; review(); };
        reader.onerror = () => { err.textContent = "Couldn't read that file."; err.hidden = false; };
        reader.readAsText(f);
      });
      let pending = null;   // items waiting for the second click; null until a review has run
      $('lib-import-review-btn').addEventListener('click', () => { if (pending) importPending(); else review(); });
      function importPending() {
        const add = pending; pending = null;
        add.forEach(a => store.items.push(a.item));
        closeDialog();
        commit(`Imported ${add.length} item${add.length === 1 ? '' : 's'}`);
      }
      function review() {
        pending = null;
        const box = $('lib-import-review');
        box.innerHTML = '';
        const res = parseImport(ta.value);
        if (res.error) { err.textContent = res.error; err.hidden = false; return; }
        err.hidden = true;
        const room = LIM.items - store.items.length;
        const add = res.toAdd.slice(0, Math.max(0, room));
        const overflow = res.toAdd.length - add.length;
        const rows = [
          ...add.map(a => `<li class="ok">${esc(a.label)}${a.renamed ? ' <span>— new copy, the ID was already used</span>' : ''}</li>`),
          ...res.skipped.slice(0, 40).map(s => `<li class="skip">${esc(s.label)} <span>— ${esc(s.reason)}</span></li>`),
        ].join('');
        box.innerHTML = `
          <p class="lib-summary"><strong>${add.length}</strong> will be added · <strong>${res.skipped.length}</strong> skipped${overflow > 0 ? ` · <strong>${overflow}</strong> over the ${LIM.items}-item limit` : ''}</p>
          <ul class="lib-review-list">${rows}${res.skipped.length > 40 ? `<li class="skip">…and ${res.skipped.length - 40} more skipped</li>` : ''}</ul>`;
        const btn = $('lib-import-review-btn');
        btn.textContent = add.length ? `Import ${add.length} item${add.length === 1 ? '' : 's'}` : 'Nothing to import';
        btn.disabled = !add.length;
        pending = add.length ? add : null;
      }
      ta.addEventListener('input', () => { $('lib-import-review').innerHTML = ''; const b = $('lib-import-review-btn'); b.textContent = 'Review'; b.disabled = false; pending = null; });
    });
  }

  function buildExport(items) {
    const safe = items.filter(i => !i.builtin).map(i => validateItem(i)).filter(v => v.ok).map(v => {
      const { id, tool, type, name, description, category, tags, data, createdAt, updatedAt } = v.item;
      return { id, tool, type, name, description, category, tags, data, createdAt, updatedAt };
    });
    return JSON.stringify({ app: APP_TAG, version: SCHEMA, exportedAt: new Date().toISOString(), items: safe }, null, 2);
  }
  function openExportDialog(items, opener) {
    const mine = items.filter(i => !i.builtin);
    if (!mine.length) { showToast("You haven't saved anything yet"); return; }
    const json = buildExport(mine);
    const count = JSON.parse(json).items.length;
    openDialog(`
      ${dlgHead('Export ' + (count === 1 ? 'your item' : 'your library'))}
      <p class="lib-hint">${count} personal item${count === 1 ? '' : 's'} as a JSON backup. Built-in items aren't included, and webhook URLs and tokens are never exported.</p>
      <div class="lib-dlg-actions lib-dlg-actions-wide"><button type="button" class="btn-outline" data-dlg-close>Close</button><button type="button" class="btn-outline" id="lib-export-copy">Copy JSON</button><button type="button" class="copy-btn" id="lib-export-dl">Download</button></div>`, opener, () => {
      $('lib-export-dl').addEventListener('click', () => {
        try {
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `lukas-utils-library-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          showToast('Downloaded');
        } catch (e) { showToast("Couldn't download — try Copy JSON"); }
      });
      $('lib-export-copy').addEventListener('click', () => {
        const p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(json) : Promise.reject();
        p.then(() => showToast('Copied!'), () => showToast("Couldn't copy — use Download"));
      });
    });
  }

  /* ---------------------------------------------------------------- shared card pieces */
  function badgesHtml(item) {
    return `<span class="lib-badge lib-badge-${item.type}">${TYPE_LABEL[item.type]}</span><span class="lib-badge">${esc(TOOL_LABEL[item.tool])}</span><span class="lib-badge ${item.builtin ? '' : 'lib-badge-mine'}">${item.builtin ? 'Built-in' : 'Mine'}</span>`;
  }
  const matches = (item, q) => {
    if (!q) return true;
    const hay = [item.name, item.description, item.category, TOOL_LABEL[item.tool], item.type, ...item.tags].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
  };

  /* ---------------------------------------------------------------- central library */
  const ui = { q: '', type: 'all', source: 'all', tool: 'all', category: 'all' };
  const root = $('lib-root');

  function seg(name, options, current) {
    return `<div class="lib-seg" role="group" aria-label="${esc(name)}">${options.map(([v, l]) => `<button type="button" class="case-btn ${v === current ? 'active' : ''}" data-seg="${esc(name)}" data-value="${esc(v)}" aria-pressed="${v === current}">${esc(l)}</button>`).join('')}</div>`;
  }
  function noticeHtml() {
    const n = [];
    if (store.readOnly) n.push("Your saved library was made by a newer version of Luka's Utils, so editing is turned off to avoid damaging it.");
    if (store.corrupt) n.push("Your saved library couldn't be read. The original data has been kept in your browser as a backup and won't be deleted.");
    if (store.dropped) n.push(`${store.dropped} saved item${store.dropped === 1 ? ' was' : 's were'} skipped because ${store.dropped === 1 ? 'it is' : 'they are'} invalid or no longer supported. The original data was kept as a backup.`);
    if (!store.persist && !store.readOnly) n.push("This browser isn't letting the site save data, so personal items will be lost when you close or refresh this page. Export a backup to keep them.");
    return n.map(t => `<p class="lib-notice" role="status">${esc(t)}</p>`).join('');
  }

  function cardHtml(item) {
    const kind = KINDS[kindKey(item)];
    const label = esc(item.name);
    const mine = !item.builtin;
    return `
      <article class="lib-card" data-id="${esc(item.id)}">
        <header class="lib-card-head"><h4>${label}</h4></header>
        <p class="lib-badges">${badgesHtml(item)}</p>
        ${item.description ? `<p class="lib-desc">${esc(item.description)}</p>` : ''}
        <div class="lib-preview" aria-hidden="true">${kind.preview(item.data, kind.slot)}</div>
        <p class="lib-effect">${esc(kind.effect(item.data, kind.slot))}</p>
        <div class="lib-card-actions">
          <button type="button" class="copy-btn small" data-act="apply" aria-label="${item.type === 'preset' ? 'Apply' : 'Load'} ${label}">${item.type === 'preset' ? 'Apply' : 'Load'}</button>
          <button type="button" class="btn-outline small" data-act="preview" aria-label="Preview ${label}">Preview</button>
          ${mine ? `<button type="button" class="btn-outline small" data-act="edit" aria-label="Edit ${label}">Edit</button>` : ''}
          <button type="button" class="btn-outline small" data-act="duplicate" aria-label="${mine ? 'Duplicate' : 'Save a copy of'} ${label}">${mine ? 'Duplicate' : 'Save a copy'}</button>
          ${mine ? `<button type="button" class="btn-outline small" data-act="export" aria-label="Export ${label}">Export</button><button type="button" class="btn-outline small lib-del" data-act="delete" aria-label="Delete ${label}">Delete</button>` : ''}
        </div>
      </article>`;
  }

  function renderCentral() {
    if (!root) return;
    const all = allItems();
    const base = all.filter(i => (ui.type === 'all' || i.type === ui.type) && (ui.source === 'all' || (ui.source === 'mine') === !i.builtin));
    const tools = [...new Set(all.map(i => i.tool))];
    const cats = [...new Set(base.filter(i => ui.tool === 'all' || i.tool === ui.tool).map(i => i.category))].sort();
    if (ui.category !== 'all' && !cats.includes(ui.category)) ui.category = 'all';
    const shown = base.filter(i => (ui.tool === 'all' || i.tool === ui.tool) && (ui.category === 'all' || i.category === ui.category) && matches(i, ui.q));
    const focus = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id || null : null;
    const caret = focus === 'lib-q' ? $('lib-q').selectionStart : null;
    root.innerHTML = `
      ${noticeHtml()}
      <div class="lib-toolbar">
        <div class="tool-search-row lib-search">
          <svg class="search-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M20 20l-4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
          <input type="search" id="lib-q" placeholder="Search presets and templates" autocomplete="off" aria-label="Search presets and templates" value="${esc(ui.q)}">
        </div>
        <div class="lib-filters">
          ${seg('Type', [['all', 'All'], ['preset', 'Presets'], ['template', 'Templates']], ui.type)}
          ${seg('Source', [['all', 'All'], ['builtin', 'Built-in'], ['mine', 'Mine']], ui.source)}
          <select id="lib-tool" class="text-input select-input" aria-label="Filter by tool">
            <option value="all">All tools</option>${tools.map(t => `<option value="${esc(t)}" ${t === ui.tool ? 'selected' : ''}>${esc(TOOL_LABEL[t])}</option>`).join('')}
          </select>
          <select id="lib-cat" class="text-input select-input" aria-label="Filter by category">
            <option value="all">All categories</option>${cats.map(c => `<option value="${esc(c)}" ${c === ui.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="lib-manage">
          <button type="button" class="copy-btn small" data-top="new">New</button>
          <button type="button" class="btn-outline small" data-top="import">Import</button>
          <button type="button" class="btn-outline small" data-top="export">Export mine</button>
        </div>
      </div>
      <p class="lib-count" aria-live="polite">${shown.length} of ${all.length} shown · ${store.items.length} personal</p>
      <div class="lib-grid">${shown.length ? shown.map(cardHtml).join('') : `<p class="lib-empty">${ui.source === 'mine' && !store.items.length ? "You haven't saved anything yet. Use “Save current…” in any tool, or New here." : 'Nothing matches those filters.'}</p>`}</div>`;
    if (focus) { const el = $(focus); if (el) { el.focus(); if (caret !== null && el.setSelectionRange) try { el.setSelectionRange(caret, caret); } catch (e) {} } }
    const c = $('lib-count'); if (c) c.textContent = all.length;
  }

  if (root) {
    root.addEventListener('input', (e) => { if (e.target.id === 'lib-q') { ui.q = e.target.value; renderCentral(); } });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'lib-tool') { ui.tool = e.target.value; renderCentral(); }
      if (e.target.id === 'lib-cat') { ui.category = e.target.value; renderCentral(); }
    });
    root.addEventListener('click', (e) => {
      const segBtn = e.target.closest('[data-seg]');
      if (segBtn) { ui[segBtn.dataset.seg.toLowerCase()] = segBtn.dataset.value; renderCentral(); return; }
      const top = e.target.closest('[data-top]');
      if (top) {
        if (top.dataset.top === 'new') openSaveDialog({ opener: top });
        else if (top.dataset.top === 'import') openImportDialog(top);
        else openExportDialog(store.items, top);
        return;
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const item = findItem(act.closest('.lib-card').dataset.id);
      if (!item) return;
      const a = act.dataset.act;
      if (a === 'apply') applyItem(item, null, { navigate: true });
      else if (a === 'preview') openPreviewDialog(item, null, act);
      else if (a === 'edit') openEditDialog(item, act);
      else if (a === 'duplicate') duplicateItem(item);
      else if (a === 'export') openExportDialog([item], act);
      else if (a === 'delete') openDeleteDialog(item, act);
    });
  }

  /* ---------------------------------------------------------------- compact in-tool access */
  const bars = {};
  function mountBars() {
    Object.entries(SLOTS).forEach(([slotId, slot]) => {
      const anchor = slot.anchor();
      if (!anchor) return;
      const el = document.createElement('div');
      el.className = 'lib-bar';
      el.dataset.slot = slotId;
      anchor.insertAdjacentElement('afterend', el);
      bars[slotId] = { el, open: false, q: '', tab: 'all', all: false };
      el.addEventListener('click', (e) => onBarClick(slotId, e));
      el.addEventListener('input', (e) => { if (e.target.matches('.lib-bar-q')) { bars[slotId].q = e.target.value; renderBar(slotId); } });
      el.addEventListener('change', (e) => { if (e.target.matches('.lib-bar-all')) { bars[slotId].all = e.target.checked; renderBar(slotId); } });
      el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bars[slotId].open) { bars[slotId].open = false; renderBar(slotId); el.querySelector('.lib-bar-toggle').focus(); e.stopPropagation(); } });
    });
  }

  function renderBar(slotId) {
    const b = bars[slotId];
    if (!b) return;
    const slot = SLOTS[slotId];
    const compatible = allItems().filter(i => slotAccepts(slotId, i));
    const types = [...new Set(slot.kinds.map(k => KINDS[k].type))];
    const pool = b.all ? allItems() : compatible;
    const list = pool.filter(i => (b.tab === 'all' || i.type === b.tab) && matches(i, b.q));
    const hadFocus = b.el.contains(document.activeElement) ? document.activeElement.className : '';
    const id = `lib-bar-${slotId}`;
    const canSave = slot.saveKinds.length > 0;
    b.el.innerHTML = `
      <div class="lib-bar-row">
        <button type="button" class="btn-outline small lib-bar-toggle" aria-expanded="${b.open}" aria-controls="${id}">${esc(slot.barLabel)} <span class="lib-bar-n">${compatible.length}</span><span class="lib-caret" aria-hidden="true">${b.open ? '▴' : '▾'}</span></button>
        ${canSave ? `<button type="button" class="btn-outline small lib-bar-save">Save current…</button>` : ''}
      </div>
      <div class="lib-bar-body" id="${id}" ${b.open ? '' : 'hidden'}>
        <input type="search" class="text-input lib-bar-q" placeholder="Search" aria-label="Search ${esc(slot.label)} library" value="${esc(b.q)}" autocomplete="off">
        <div class="lib-bar-opts">
          ${types.length > 1 ? seg('Type ' + slotId, [['all', 'All'], ...types.map(t => [t, TYPE_LABEL[t] + 's'])], b.tab) : ''}
          <label class="checkbox-row lib-bar-showall"><input type="checkbox" class="lib-bar-all" ${b.all ? 'checked' : ''}> Show items for other tools</label>
        </div>
        <ul class="lib-list">
          ${list.length ? list.map(i => barRow(i, slotId)).join('') : `<li class="lib-list-empty">${b.q ? 'Nothing matches.' : 'Nothing here yet. Use “Save current…” to add your own.'}</li>`}
        </ul>
        <a class="lib-bar-link" href="#presets">Open the full library →</a>
      </div>`;
    if (hadFocus && hadFocus.includes('lib-bar-q')) { const q = b.el.querySelector('.lib-bar-q'); q.focus(); const n = q.value.length; try { q.setSelectionRange(n, n); } catch (e) {} }
  }
  function barRow(item, slotId) {
    const fits = slotAccepts(slotId, item);
    const label = esc(item.name);
    const verb = item.type === 'preset' ? 'Apply' : 'Load';
    return `
      <li class="lib-row" data-id="${esc(item.id)}">
        <div class="lib-row-main">
          <span class="lib-row-name">${label}</span>
          <span class="lib-row-sub"><span class="lib-badge lib-badge-${item.type}">${TYPE_LABEL[item.type]}</span>${item.builtin ? '' : '<span class="lib-badge lib-badge-mine">Mine</span>'}${fits ? '' : `<span class="lib-badge">${esc(TOOL_LABEL[item.tool])}</span>`}${item.description ? `<span class="lib-row-desc">${esc(item.description)}</span>` : ''}</span>
        </div>
        <div class="lib-row-actions">
          <button type="button" class="btn-outline small" data-bar-act="preview" aria-label="Preview ${label}">Preview</button>
          ${fits ? `<button type="button" class="copy-btn small" data-bar-act="apply" aria-label="${verb} ${label}">${verb}</button>` : `<button type="button" class="btn-outline small" data-bar-act="goto" aria-label="Open ${esc(SLOTS[homeSlot(item)].label)} for ${label}">Open tool</button>`}
        </div>
      </li>`;
  }
  function onBarClick(slotId, e) {
    const b = bars[slotId];
    if (e.target.closest('.lib-bar-toggle')) { b.open = !b.open; renderBar(slotId); if (b.open) b.el.querySelector('.lib-bar-q').focus(); return; }
    if (e.target.closest('.lib-bar-save')) { openSaveDialog({ slotId, opener: e.target.closest('.lib-bar-save') }); return; }
    const segBtn = e.target.closest('[data-seg]');
    if (segBtn) { b.tab = segBtn.dataset.value; renderBar(slotId); return; }
    const act = e.target.closest('[data-bar-act]');
    if (!act) return;
    const item = findItem(act.closest('.lib-row').dataset.id);
    if (!item) return;
    if (act.dataset.barAct === 'apply') applyItem(item, slotId);
    else if (act.dataset.barAct === 'preview') openPreviewDialog(item, slotAccepts(slotId, item) ? slotId : null, act);
    else if (act.dataset.barAct === 'goto') B.openTool(homeSlot(item));
  }

  /* ---------------------------------------------------------------- wiring */
  function refresh() {
    renderCentral();
    Object.keys(bars).forEach(renderBar);
  }

  // Another tab changed the library: pick it up.
  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY || e.key === null) { loadStore(); refresh(); }
  });

  loadStore();
  mountBars();
  refresh();

  // Small, read-only surface for tests and debugging; it exposes no way around validation.
  window.LuLibrary = {
    version: SCHEMA,
    builtinCount: builtins.length,
    kinds: Object.keys(KINDS),
    validateItem, parseImport, buildExport,
  };
})();
