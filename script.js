(() => {
  'use strict';

  /* ============ Unicode transform engine ============ */
  // Maps a plain-ASCII string into a Mathematical Alphanumeric Symbols
  // (or related) block, honoring the block's real gaps/exceptions.
  function mapAlpha(str, { upperStart, lowerStart, digitStart, exceptions = {} }) {
    let out = '';
    for (const ch of str) {
      if (exceptions[ch]) { out += exceptions[ch]; continue; }
      const code = ch.codePointAt(0);
      if (ch >= 'A' && ch <= 'Z' && upperStart != null) {
        out += String.fromCodePoint(upperStart + (code - 65));
      } else if (ch >= 'a' && ch <= 'z' && lowerStart != null) {
        out += String.fromCodePoint(lowerStart + (code - 97));
      } else if (ch >= '0' && ch <= '9' && digitStart != null) {
        out += String.fromCodePoint(digitStart + (code - 48));
      } else {
        out += ch;
      }
    }
    return out;
  }

  const SMALL_CAPS = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
  const UPSIDE_DOWN = { a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'ʅ',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',
    A:'∀',B:'ᙠ',C:'Ɔ',D:'ᗡ',E:'Ǝ',F:'Ⅎ',G:'⅁',H:'H',I:'I',J:'ſ',K:'ʞ',L:'˥',M:'W',N:'N',O:'O',P:'Ԁ',Q:'Ό',R:'ᴚ',S:'S',T:'⊥',U:'∩',V:'Λ',W:'M',X:'X',Y:'⅄',Z:'Z',
    '.':'˙',',':"'",'?':'¿','!':'¡',"'":',','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'ㄣ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6','0':'0' };

  function smallCaps(str){ return [...str].map(c => SMALL_CAPS[c.toLowerCase()] ? (c === c.toUpperCase() && c !== c.toLowerCase() ? c : SMALL_CAPS[c]) : c).join(''); }
  function upsideDown(str){ return [...str].reverse().map(c => UPSIDE_DOWN[c] || c).join(''); }
  function enclose(str, fn){ return [...str].map(c => fn(c) || c).join(''); }

  function circled(ch){
    if (ch >= 'A' && ch <= 'Z') return String.fromCodePoint(0x24B6 + (ch.codePointAt(0) - 65));
    if (ch >= 'a' && ch <= 'z') return String.fromCodePoint(0x24D0 + (ch.codePointAt(0) - 97));
    if (ch === '0') return 'Ⓞ';
    if (ch >= '1' && ch <= '9') return String.fromCodePoint(0x2460 + (ch.codePointAt(0) - 49));
    return ch;
  }
  function squared(ch){
    if (/[A-Za-z0-9]/.test(ch)) return ch + '\u20DE';
    return ch;
  }

  const TRANSFORMS = {
    plain: s => s,
    boldSerif: s => mapAlpha(s, { upperStart:0x1D400, lowerStart:0x1D41A, digitStart:0x1D7CE }),
    boldSans: s => mapAlpha(s, { upperStart:0x1D5D4, lowerStart:0x1D5EE, digitStart:0x1D7EC }),
    softItalic: s => mapAlpha(s, { upperStart:0x1D434, lowerStart:0x1D44E }),
    boldItalic: s => mapAlpha(s, { upperStart:0x1D468, lowerStart:0x1D482 }),
    sansItalic: s => mapAlpha(s, { upperStart:0x1D608, lowerStart:0x1D622 }),
    doubleStruck: s => mapAlpha(s, { upperStart:0x1D538, lowerStart:0x1D552, digitStart:0x1D7D8,
      exceptions:{ C:'ℂ', H:'ℍ', N:'ℕ', P:'ℙ', Q:'ℚ', R:'ℝ', Z:'ℤ' } }),
    script: s => mapAlpha(s, { upperStart:0x1D49C, lowerStart:0x1D4B6,
      exceptions:{ B:'ℬ', E:'ℰ', F:'ℱ', H:'ℋ', I:'ℐ', L:'ℒ', M:'ℳ', R:'ℛ', e:'ℯ', g:'ℊ', o:'ℴ' } }),
    fraktur: s => mapAlpha(s, { upperStart:0x1D504, lowerStart:0x1D51E,
      exceptions:{ C:'ℭ', H:'ℌ', I:'ℑ', R:'ℜ', Z:'ℨ' } }),
    monospace: s => mapAlpha(s, { upperStart:0x1D670, lowerStart:0x1D68A, digitStart:0x1D7F6 }),
    smallCaps: s => smallCaps(s),
    fullwidth: s => [...s].map(c => c === ' ' ? '\u3000' : mapAlpha(c, { upperStart:0xFF21, lowerStart:0xFF41, digitStart:0xFF10 })).join(''),
    circled: s => enclose(s, circled),
    squared: s => enclose(s, squared),
    upsideDown: s => upsideDown(s),
    regionalLetters: s => enclose(s, regionalLetter),
    emojiSafeBold: s => mapAlpha(s, { upperStart:0x1D5D4, lowerStart:0x1D5EE, digitStart:0x1D7EC }),
    asciiFrame: s => `[ ${s} ]`,
    strikeLine: s => [...s].map(c => c + '\u0336').join(''),
    underlineDeco: s => [...s].map(c => c + '\u0332').join(''),
    zalgo: s => zalgoify(s),
    sparkline: s => `✦ ${s} ✦`,
    discordBold: s => `**${s}**`,
    discordItalic: s => `*${s}*`,
    discordBoldItalic: s => `***${s}***`,
    discordUnderline: s => `__${s}__`,
    discordStrike: s => `~~${s}~~`,
    discordSpoiler: s => `||${s}||`,
    discordCode: s => `\`${s}\``,
    discordCodeBlock: s => '```\n' + s + '\n```',
    discordQuote: s => s.split('\n').map(l => `> ${l}`).join('\n'),
    discordHeader: s => `## ${s}`,
    secretLabel: s => `\u200b||${s}||\u200b`,
    hiddenDots: s => [...s].join('\u2800'),
    zeroWidth: s => [...s].join('\u200b'),
    secretCode: s => `||\`${s}\`||`,
  };

  function regionalLetter(ch){
    const upper = ch.toUpperCase();
    if (upper >= 'A' && upper <= 'Z') return String.fromCodePoint(0x1F1E6 + (upper.codePointAt(0) - 65));
    return ch;
  }
  const ZALGO_MARKS = ['\u0301','\u0304','\u0308','\u0303','\u030c','\u0330','\u0323','\u035f','\u0327'];
  function zalgoify(str){
    let out = '';
    let i = 0;
    for (const ch of str) {
      out += ch;
      if (ch !== ' ') {
        const count = (i % 3) + 1;
        for (let k = 0; k < count; k++) out += ZALGO_MARKS[(i + k) % ZALGO_MARKS.length];
      }
      i++;
    }
    return out;
  }

  /* ============ Style catalog ============ */
  const STYLES = [
    { id:'bold-serif', name:'Bold Serif', desc:'Weighty mathematical serif', kind:'unicode', badge:'unicode', fn:'boldSerif' },
    { id:'bold-sans', name:'Bold Sans', desc:'Clean and confidently loud', kind:'unicode', badge:'unicode', fn:'boldSans' },
    { id:'soft-italic', name:'Soft Italic', desc:'A little lift, no noise', kind:'unicode', badge:'unicode', fn:'softItalic' },
    { id:'bold-italic', name:'Bold Italic', desc:'Editorial emphasis', kind:'unicode', badge:'unicode', fn:'boldItalic' },
    { id:'double-struck', name:'Double Struck', desc:'Academic outline energy', kind:'unicode', badge:'unicode', fn:'doubleStruck' },
    { id:'small-caps', name:'Small Caps', desc:'Compact uppercase rhythm', kind:'unicode', badge:'unicode', fn:'smallCaps' },
    { id:'script', name:'Script', desc:'Handwritten flourish', kind:'unicode', badge:'unicode', fn:'script' },
    { id:'fraktur', name:'Fraktur', desc:'Gothic blackletter mood', kind:'unicode', badge:'unicode', fn:'fraktur' },
    { id:'monospace', name:'Monospace', desc:'Even, typewriter spacing', kind:'unicode', badge:'unicode', fn:'monospace', mono:true },
    { id:'emoji-safe-bold', name:'Emoji-safe Bold', desc:'Styles letters, leaves emoji clusters alone', kind:'unicode', badge:'discord', fn:'emojiSafeBold' },

    { id:'circled', name:'Circled', desc:'Every character gets a halo', kind:'symbols', badge:'varies', fn:'circled' },
    { id:'squared', name:'Squared', desc:'Boxed-out display type', kind:'symbols', badge:'varies', fn:'squared' },
    { id:'fullwidth', name:'Fullwidth', desc:'Vaporwave terminal spacing', kind:'symbols', badge:'unicode', fn:'fullwidth' },
    { id:'regional-letters', name:'Regional Letters', desc:'Flag-style letter signals', kind:'symbols', badge:'varies', fn:'regionalLetters' },

    { id:'ascii-frame', name:'ASCII Frame', desc:'Compatibility-friendly bracket frame', kind:'decorative', badge:'discord', fn:'asciiFrame' },
    { id:'upside-down', name:'Upside Down', desc:'Flips and reverses your text', kind:'decorative', badge:'discord', fn:'upsideDown' },
    { id:'strike-line', name:'Strike Line', desc:'Crossed-out with combining marks', kind:'decorative', badge:'discord', fn:'strikeLine' },
    { id:'underline-deco', name:'Underline', desc:'A quiet underline accent', kind:'decorative', badge:'discord', fn:'underlineDeco' },
    { id:'zalgo', name:'Zalgo', desc:'Glitched signal texture', kind:'decorative', badge:'varies', fn:'zalgo' },
    { id:'sparkline', name:'Sparkline', desc:'Symbols around your text', kind:'decorative', badge:'discord', fn:'sparkline' },

    { id:'discord-bold', name:'Discord Bold', desc:'Native markdown emphasis', kind:'discord', badge:'discord', fn:'discordBold', mono:true },
    { id:'discord-italic', name:'Discord Italic', desc:'Native markdown emphasis', kind:'discord', badge:'discord', fn:'discordItalic', mono:true },
    { id:'discord-bold-italic', name:'Discord Bold Italic', desc:'Both at once', kind:'discord', badge:'discord', fn:'discordBoldItalic', mono:true },
    { id:'discord-strike', name:'Discord Strikethrough', desc:'Crosses it out', kind:'discord', badge:'discord', fn:'discordStrike', mono:true },
    { id:'discord-spoiler', name:'Discord Spoiler', desc:'Hides text until tapped', kind:'discord', badge:'discord', fn:'discordSpoiler', mono:true },
    { id:'discord-code', name:'Discord Code', desc:'Inline code formatting', kind:'discord', badge:'discord', fn:'discordCode', mono:true },
  ];

  /* ============ Discord Lab: markdown + secret formats ============ */
  const DISCORD_FORMATS = [
    { id:'inline-code', name:'Inline code', fn:'discordCode' },
    { id:'spoiler', name:'Spoiler', fn:'discordSpoiler' },
    { id:'secret-label', name:'Secret label', fn:'secretLabel' },
    { id:'hidden-dots', name:'Hidden dots', fn:'hiddenDots' },
    { id:'zero-width', name:'Zero-width', fn:'zeroWidth' },
    { id:'secret-code', name:'Secret code', fn:'secretCode' },
    { id:'bold', name:'Bold', fn:'discordBold' },
    { id:'italic', name:'Italic', fn:'discordItalic' },
    { id:'bold-italic', name:'Bold italic', fn:'discordBoldItalic' },
    { id:'strikethrough', name:'Strikethrough', fn:'discordStrike' },
    { id:'blockquote', name:'Blockquote', fn:'discordQuote' },
    { id:'header', name:'Header', fn:'discordHeader' },
    { id:'code-block', name:'Code block', fn:'discordCodeBlock' },
  ];

  /* ============ Templates ============ */
  const TEMPLATES = [
    { id:'announcement', name:'Announcement', desc:'A clean server-wide notice',
      build: t => `## 📣 Announcement\n**${t}**\n\n> Please read carefully.` },
    { id:'rules', name:'Rules', desc:'A compact rules post',
      build: t => `## 📜 Rules\n1. Be respectful to everyone.\n2. ${t}\n3. No spam or self-promo.` },
    { id:'status', name:'Status', desc:'A bot or profile status',
      build: t => `🟢 Status: ${t}` },
    { id:'code-block', name:'Code block', desc:'A readable technical snippet',
      build: t => '```\n' + t + '\n```' },
  ];

  /* ============ ANSI colors ============ */
  const ANSI_COLORS = [
    { id:'cyan', name:'Cyan', code:36, hex:'#22d3ee' },
    { id:'green', name:'Green', code:32, hex:'#34d399' },
    { id:'yellow', name:'Yellow', code:33, hex:'#fbbf24' },
    { id:'red', name:'Red', code:31, hex:'#f87171' },
    { id:'purple', name:'Purple', code:35, hex:'#a78bfa' },
    { id:'cream', name:'Cream', code:37, hex:'#f3f1ea' },
  ];

  /* ============ Color Lab palette presets ============ */
  const PALETTES = [
    { id:'discord-dark', name:'Discord dark', fg:'#FBF8EF', bg:'#313338', canvas:'#0D0F12' },
    { id:'oat-ink', name:'Oat & ink', fg:'#2B2620', bg:'#EDE3CF', canvas:'#181512' },
    { id:'soft-cyan', name:'Soft cyan', fg:'#EAFBFF', bg:'#0E7490', canvas:'#062A31' },
    { id:'quiet-terminal', name:'Quiet terminal', fg:'#3FFA7A', bg:'#062B12', canvas:'#020803' },
    { id:'lavender-dusk', name:'Lavender dusk', fg:'#F2E9FF', bg:'#241B35', canvas:'#120C1B' },
  ];



  /* ============ State ============ */
  const state = {
    text: 'Example',
    caseMode: 'none',
    filter: 'all',
    query: '',
    favorites: new Set(JSON.parse(localStorage.getItem('lu_favorites') || '[]')),
    onlyFavorites: false,
  };

  function applyCase(str){
    if (state.caseMode === 'lower') return str.toLowerCase();
    if (state.caseMode === 'title') return str.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    return str;
  }

  /* ============ DOM refs ============ */
  const grid = document.getElementById('card-grid');
  const emptyMsg = document.getElementById('results-empty');
  const emptyQuery = document.getElementById('empty-query');
  const liveInput = document.getElementById('live-input');
  const charCurrent = document.getElementById('char-current');
  const favCountEl = document.getElementById('fav-count');
  const toast = document.getElementById('toast');
  const stylesTotalCount = document.getElementById('styles-total-count');

  stylesTotalCount.textContent = STYLES.length;

  /* ============ Rendering ============ */
  function badgeMarkup(badge){
    const label = badge === 'discord' ? 'discord syntax' : badge === 'unicode' ? 'text-safe' : 'client varies';
    return `<span class="badge ${badge}"><svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 5-3.2 8-7 9-3.8-1-7-4-7-9V6z" fill="none" stroke="currentColor" stroke-width="2"/></svg>${label}</span>`;
  }

  function cardMarkup(style){
    const input = applyCase(state.text);
    const output = TRANSFORMS[style.fn](input);
    const isFav = state.favorites.has(style.id);
    const kindLabel = style.kind === 'discord' ? 'discord' : style.kind === 'unicode' ? 'unicode' : style.kind === 'symbols' ? 'symbols' : 'decorative';
    return `
      <article class="style-card ${isFav ? 'is-fav' : ''}" data-id="${style.id}">
        <div class="card-top">
          <div class="card-meta">
            <span class="kind-label">${kindLabel}</span>
            ${badgeMarkup(style.badge)}
          </div>
          <button class="fav-heart ${isFav ? 'active' : ''}" data-fav="${style.id}" aria-label="Toggle favorite" aria-pressed="${isFav}">
            <svg viewBox="0 0 24 24"><path d="M12 20s-6.7-4.2-9.3-8.4C1 8.6 2 5.4 5 4.4c2-.6 3.9.2 5 1.8 1.1-1.6 3-2.4 5-1.8 3 1 4 4.2 2.3 7.2C18.7 15.8 12 20 12 20z" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <h3 class="style-name">${style.name}</h3>
        <p class="style-desc">${style.desc}</p>
        <div class="style-preview ${style.mono ? 'mono-preview' : ''}" data-preview="${style.id}">${escapeHtml(output) || '&nbsp;'}</div>
        <div class="card-bottom">
          <span class="preview-chars">${[...output].length} chars</span>
          <button class="copy-btn" data-copy="${style.id}" type="button">
            <svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 15V6a1 1 0 0 1 1-1h9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
            Copy
          </button>
        </div>
      </article>`;
  }

  function escapeHtml(str){
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function matchesQuery(style, q){
    if (!q) return true;
    q = q.toLowerCase();
    return style.name.toLowerCase().includes(q) || style.desc.toLowerCase().includes(q) || style.kind.includes(q);
  }

  function render(){
    const q = state.query.trim();
    const list = STYLES.filter(s => {
      if (state.onlyFavorites && !state.favorites.has(s.id)) return false;
      if (state.filter !== 'all' && s.kind !== state.filter) return false;
      return matchesQuery(s, q);
    });

    if (list.length === 0) {
      grid.innerHTML = '';
      emptyQuery.textContent = q || (state.onlyFavorites ? 'your favorites' : '');
      emptyMsg.hidden = false;
    } else {
      emptyMsg.hidden = true;
      grid.innerHTML = list.map(cardMarkup).join('');
    }

    favCountEl.textContent = state.favorites.size;
  }

  /* ============ Events ============ */
  document.getElementById('menu-toggle').addEventListener('click', (e) => {
    const menu = document.getElementById('mobile-menu');
    const open = menu.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', open);
  });

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (next === 'light') html.setAttribute('data-theme', 'light'); else html.removeAttribute('data-theme');
    localStorage.setItem('lu_theme', next);
  });
  (function initTheme(){
    const saved = localStorage.getItem('lu_theme');
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  })();

  document.getElementById('fav-toggle').addEventListener('click', () => {
    state.onlyFavorites = !state.onlyFavorites;
    document.getElementById('fav-toggle').classList.toggle('active-filter', state.onlyFavorites);
    document.getElementById('styles').scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderAll();
  });

  liveInput.addEventListener('input', (e) => {
    state.text = e.target.value;
    charCurrent.textContent = state.text.length;
    renderAll();
  });
  charCurrent.textContent = state.text.length;

  document.getElementById('live-clear').addEventListener('click', () => {
    state.text = '';
    liveInput.value = '';
    charCurrent.textContent = '0';
    liveInput.focus();
    renderAll();
  });

  document.querySelectorAll('.case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.caseMode = btn.dataset.case;
      renderAll();
    });
  });

  const sizeRange = document.getElementById('size-range');
  const sizeLabel = document.getElementById('size-label');
  sizeRange.addEventListener('input', () => {
    sizeLabel.textContent = sizeRange.value + 'px';
    document.documentElement.style.setProperty('--preview-size', sizeRange.value + 'px');
    document.querySelectorAll('.style-preview').forEach(el => el.style.fontSize = sizeRange.value + 'px');
  });

  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filter = pill.dataset.filter;
      renderAll();
    });
  });

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    state.query = e.target.value;
    renderAll();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      document.getElementById('mobile-menu').classList.remove('open');
      if (document.activeElement) document.activeElement.blur();
    }
  });

  grid.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-copy]');
    const favBtn = e.target.closest('[data-fav]');
    const previewEl = e.target.closest('[data-preview]');

    if (copyBtn) doCopy(copyBtn.dataset.copy, copyBtn);
    else if (favBtn) toggleFav(favBtn.dataset.fav);
    else if (previewEl) doCopy(previewEl.dataset.preview);
  });

  function toggleFav(id){
    if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
    localStorage.setItem('lu_favorites', JSON.stringify([...state.favorites]));
    renderAll();
  }

  function doCopy(id, btnEl){
    const style = STYLES.find(s => s.id === id);
    if (!style) return;
    const output = TRANSFORMS[style.fn](applyCase(state.text));
    navigator.clipboard?.writeText(output).catch(() => {});
    showToast('Copied!');
    if (btnEl) {
      btnEl.classList.add('copied');
      setTimeout(() => btnEl.classList.remove('copied'), 900);
    }
  }

  let toastTimer;
  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1400);
  }

  /* ============ Compatibility table ============ */
  function renderCompatTable(){
    const table = document.getElementById('compat-table');
    if (!table) return;
    const rows = [];
    STYLES.forEach(s => rows.push({ name:s.name, badge:s.badge }));
    DISCORD_FORMATS.forEach(f => rows.push({ name:f.name, badge:'discord' }));
    const notesFor = (badge) => badge === 'discord' ? 'Native Markdown wrapper' : badge === 'unicode' ? 'Pastes as Unicode text' : 'May render differently by device';
    const discordFor = (badge) => badge === 'discord' ? 'Native syntax' : 'Broad support';
    const browserFor = (badge) => badge === 'varies' ? 'Font / emoji support varies' : 'Unicode support broad';
    table.innerHTML = `
      <thead><tr><th>Style / format</th><th>Discord</th><th>Browser / device safety</th><th>Notes</th></tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="name-cell">${r.name}</td>
            <td>${discordFor(r.badge)}</td>
            <td>${browserFor(r.badge)}</td>
            <td>${notesFor(r.badge)}</td>
          </tr>`).join('')}
      </tbody>`;
  }

  /* ============ Discord Lab: format grid ============ */
  const discordLabState = { formatId: 'inline-code' };
  const formatGrid = document.getElementById('format-grid');
  const discordOutputEl = document.getElementById('discord-output');

  function renderFormatGrid(){
    if (!formatGrid) return;
    formatGrid.innerHTML = DISCORD_FORMATS.map(f => `
      <button type="button" class="format-btn ${f.id === discordLabState.formatId ? 'active' : ''}" data-format="${f.id}">${f.name}</button>
    `).join('');
  }
  function renderDiscordOutput(){
    if (!discordOutputEl) return;
    const fmt = DISCORD_FORMATS.find(f => f.id === discordLabState.formatId) || DISCORD_FORMATS[0];
    discordOutputEl.textContent = TRANSFORMS[fmt.fn](applyCase(state.text));
  }
  formatGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-format]');
    if (!btn) return;
    discordLabState.formatId = btn.dataset.format;
    renderFormatGrid();
    renderDiscordOutput();
  });
  document.getElementById('copy-discord-format')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(discordOutputEl.textContent).catch(() => {});
    showToast('Copied!');
  });

  /* ============ Templates ============ */
  const templateState = { id: 'announcement' };
  const templateGrid = document.getElementById('template-grid');
  const templateOutputEl = document.getElementById('template-output');

  function renderTemplateGrid(){
    if (!templateGrid) return;
    templateGrid.innerHTML = TEMPLATES.map(t => `
      <button type="button" class="template-card ${t.id === templateState.id ? 'active' : ''}" data-template="${t.id}">
        <div><h4>${t.name}</h4><p>${t.desc}</p></div>
        <svg viewBox="0 0 24 24" width="16" height="16"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 15V6a1 1 0 0 1 1-1h9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </button>
    `).join('');
  }
  function renderTemplateOutput(){
    if (!templateOutputEl) return;
    const t = TEMPLATES.find(t => t.id === templateState.id) || TEMPLATES[0];
    templateOutputEl.textContent = t.build(applyCase(state.text));
  }
  templateGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-template]');
    if (!btn) return;
    templateState.id = btn.dataset.template;
    renderTemplateGrid();
    renderTemplateOutput();
  });
  document.getElementById('copy-template')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(templateOutputEl.textContent).catch(() => {});
    showToast('Copied!');
  });
  const templateCountEl = document.getElementById('template-count');
  if (templateCountEl) templateCountEl.textContent = TEMPLATES.length;
  const discordFormatCountEl = document.getElementById('discord-format-count');
  if (discordFormatCountEl) discordFormatCountEl.textContent = DISCORD_FORMATS.length;

  /* ============ ANSI colors ============ */
  const ansiState = { id: 'cyan' };
  const ansiSwatches = document.getElementById('ansi-swatches');
  const ansiOutputEl = document.getElementById('ansi-output');

  function renderAnsiSwatches(){
    if (!ansiSwatches) return;
    ansiSwatches.innerHTML = ANSI_COLORS.map(c => `
      <button type="button" class="ansi-btn ${c.id === ansiState.id ? 'active' : ''}" data-ansi="${c.id}">
        <span class="swatch-dot" style="background:${c.hex}"></span>${c.name}
      </button>
    `).join('');
  }
  function ansiString(){
    const c = ANSI_COLORS.find(c => c.id === ansiState.id) || ANSI_COLORS[0];
    return `\\u001b[${c.code}m${applyCase(state.text)}\\u001b[0m`;
  }
  function renderAnsiOutput(){
    if (!ansiOutputEl) return;
    const box = ansiOutputEl.querySelector('.output-text') ? ansiOutputEl : ansiOutputEl;
    ansiOutputEl.innerHTML = `<span class="output-label">Ansi output</span><div class="output-text">${escapeHtml(ansiString())}</div>`;
  }
  ansiSwatches?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ansi]');
    if (!btn) return;
    ansiState.id = btn.dataset.ansi;
    renderAnsiSwatches();
    renderAnsiOutput();
  });
  document.getElementById('copy-ansi')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(ansiString()).catch(() => {});
    showToast('Copied!');
  });

  /* ============ Color Lab ============ */
  const colorState = {
    fg: '#FBF8EF', bg: '#313338', canvas: '#0D0F12', activePreset: 'discord-dark',
  };
  const paletteGrid = document.getElementById('palette-grid');
  const fgSwatch = document.getElementById('color-fg-swatch');
  const fgHex = document.getElementById('color-fg-hex');
  const bgSwatch = document.getElementById('color-bg-swatch');
  const bgHex = document.getElementById('color-bg-hex');
  const canvasSwatch = document.getElementById('color-canvas-swatch');
  const canvasHex = document.getElementById('color-canvas-hex');
  const contrastPill = document.getElementById('contrast-pill');
  const colorPreviewBox = document.getElementById('color-preview-box');

  function renderPaletteGrid(){
    if (!paletteGrid) return;
    paletteGrid.innerHTML = PALETTES.map(p => `
      <button type="button" class="palette-card ${p.id === colorState.activePreset ? 'active' : ''}" data-palette="${p.id}">
        <div class="palette-swatches">
          <span style="background:${p.fg}"></span><span style="background:${p.bg}"></span><span style="background:${p.canvas}"></span>
        </div>
        <span class="palette-card-name">${p.name}</span>
      </button>
    `).join('');
  }
  paletteGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-palette]');
    if (!btn) return;
    const p = PALETTES.find(p => p.id === btn.dataset.palette);
    if (!p) return;
    colorState.activePreset = p.id;
    colorState.fg = p.fg; colorState.bg = p.bg; colorState.canvas = p.canvas;
    syncColorInputs();
    renderPaletteGrid();
    renderColorLab();
  });

  function syncColorInputs(){
    fgSwatch.value = colorState.fg; fgHex.value = colorState.fg;
    bgSwatch.value = colorState.bg; bgHex.value = colorState.bg;
    canvasSwatch.value = colorState.canvas; canvasHex.value = colorState.canvas;
  }
  function wireColorInput(swatchEl, hexEl, key){
    swatchEl?.addEventListener('input', () => {
      colorState[key] = swatchEl.value.toUpperCase();
      hexEl.value = colorState[key];
      colorState.activePreset = null;
      renderPaletteGrid();
      renderColorLab();
    });
    hexEl?.addEventListener('input', () => {
      const v = hexEl.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        colorState[key] = v.toUpperCase();
        swatchEl.value = v;
        colorState.activePreset = null;
        renderPaletteGrid();
        renderColorLab();
      }
    });
  }
  wireColorInput(fgSwatch, fgHex, 'fg');
  wireColorInput(bgSwatch, bgHex, 'bg');
  wireColorInput(canvasSwatch, canvasHex, 'canvas');

  function hexToRgb(hex){
    const h = hex.replace('#', '');
    return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
  }
  function relLuminance({ r, g, b }){
    const chan = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  }
  function contrastRatio(hex1, hex2){
    const l1 = relLuminance(hexToRgb(hex1));
    const l2 = relLuminance(hexToRgb(hex2));
    const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  function renderColorLab(){
    if (!colorPreviewBox) return;
    colorPreviewBox.style.background = colorState.bg;
    colorPreviewBox.style.color = colorState.fg;
    colorPreviewBox.textContent = applyCase(state.text);
    const ratio = contrastRatio(colorState.fg, colorState.bg);
    contrastPill.textContent = ratio.toFixed(2) + ':1 contrast';
    contrastPill.classList.remove('low', 'mid');
    if (ratio < 4.5) contrastPill.classList.add('low');
    else if (ratio < 7) contrastPill.classList.add('mid');
  }
  document.getElementById('copy-css-values')?.addEventListener('click', () => {
    const css = `--foreground: ${colorState.fg};\n--preview: ${colorState.bg};\n--canvas: ${colorState.canvas};`;
    navigator.clipboard?.writeText(css).catch(() => {});
    showToast('Copied!');
  });
  document.getElementById('copy-pair')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(`${colorState.fg} on ${colorState.bg}`).catch(() => {});
    showToast('Copied!');
  });

  /* ============ Presets / JSON ============ */
  const jsonOutputEl = document.getElementById('json-output');
  function currentPresetObject(){
    return {
      name: "Luka's Utils preset",
      theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
      text: state.text,
      favorites: [...state.favorites],
      recent: [],
      colors: { foreground: colorState.fg, background: colorState.bg, canvas: colorState.canvas },
    };
  }
  function renderJson(){
    if (!jsonOutputEl) return;
    jsonOutputEl.textContent = JSON.stringify(currentPresetObject(), null, 2);
  }
  document.getElementById('copy-json')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(JSON.stringify(currentPresetObject(), null, 2)).catch(() => {});
    showToast('Copied!');
  });
  document.getElementById('download-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(currentPresetObject(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lukas-utils-preset.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded');
  });
  const importFileInput = document.getElementById('import-json-file');
  document.getElementById('import-json-btn')?.addEventListener('click', () => importFileInput.click());
  importFileInput?.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data.text === 'string') { state.text = data.text; liveInput.value = data.text; charCurrent.textContent = data.text.length; }
        if (Array.isArray(data.favorites)) { state.favorites = new Set(data.favorites); localStorage.setItem('lu_favorites', JSON.stringify(data.favorites)); }
        if (data.colors) {
          if (data.colors.foreground) colorState.fg = data.colors.foreground;
          if (data.colors.background) colorState.bg = data.colors.background;
          if (data.colors.canvas) colorState.canvas = data.colors.canvas;
          colorState.activePreset = null;
          syncColorInputs();
        }
        renderAll();
        showToast('Imported!');
      } catch {
        showToast('Invalid JSON');
      }
    };
    reader.readAsText(file);
  });

  /* ============ renderAll ============ */
  function renderAll(){
    render();
    renderDiscordOutput();
    renderTemplateOutput();
    renderAnsiOutput();
    renderColorLab();
    renderJson();
  }

  /* ============ Extra keyboard shortcuts ============ */
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      const firstCard = grid.querySelector('[data-copy]');
      if (firstCard) doCopy(firstCard.dataset.copy, firstCard);
    }
    if (e.key === 'Escape' && state.onlyFavorites) {
      state.onlyFavorites = false;
      document.getElementById('fav-toggle')?.classList.remove('active-filter');
      renderAll();
    }
  });
  /* ============ Discord Tools ============ */
  const DISCORD_EPOCH = 1420070400000n;

  // 1. Snowflake decoder
  const snowflakeInput = document.getElementById('snowflake-input');
  const snowflakeOutput = document.getElementById('snowflake-output');
  function renderSnowflake(){
    const raw = snowflakeInput.value.trim();
    if (!raw) { snowflakeOutput.innerHTML = ''; return; }
    if (!/^\d{15,20}$/.test(raw)) { snowflakeOutput.innerHTML = `<span class="err">Doesn't look like a valid snowflake — should be 15-20 digits.</span>`; return; }
    try {
      const id = BigInt(raw);
      const ms = Number((id >> 22n) + DISCORD_EPOCH);
      const date = new Date(ms);
      snowflakeOutput.innerHTML = `
        <div class="row"><span>Created</span><span>${date.toUTCString()}</span></div>
        <div class="row"><span>Unix (ms)</span><span>${ms}</span></div>
        <div class="row"><span>Unix (s)</span><span>${Math.floor(ms / 1000)}</span></div>`;
    } catch {
      snowflakeOutput.innerHTML = `<span class="err">Couldn't parse that as a snowflake.</span>`;
    }
  }
  snowflakeInput?.addEventListener('input', renderSnowflake);

  // 2. Timestamp generator
  const timestampInput = document.getElementById('timestamp-input');
  const timestampGrid = document.getElementById('timestamp-grid');
  const TS_FORMATS = [
    { code:'t', label:'Short time' },
    { code:'T', label:'Long time' },
    { code:'d', label:'Short date' },
    { code:'D', label:'Long date' },
    { code:'f', label:'Short date/time' },
    { code:'F', label:'Long date/time' },
    { code:'R', label:'Relative' },
  ];
  function renderTimestamps(){
    if (!timestampInput.value) { timestampGrid.innerHTML = ''; return; }
    const date = new Date(timestampInput.value);
    if (isNaN(date.getTime())) { timestampGrid.innerHTML = ''; return; }
    const unix = Math.floor(date.getTime() / 1000);
    timestampGrid.innerHTML = TS_FORMATS.map(f => `
      <button type="button" class="ts-row" data-ts-copy="<t:${unix}:${f.code}>">
        <span class="ts-label">${f.label}</span>
        <span class="ts-code">&lt;t:${unix}:${f.code}&gt;</span>
      </button>
    `).join('');
  }
  timestampInput?.addEventListener('input', renderTimestamps);
  timestampGrid?.addEventListener('click', (e) => {
    const row = e.target.closest('[data-ts-copy]');
    if (!row) return;
    navigator.clipboard?.writeText(row.dataset.tsCopy).catch(() => {});
    showToast('Copied!');
  });
  (function initTimestampDefault(){
    if (!timestampInput) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    timestampInput.value = now.toISOString().slice(0, 16);
    renderTimestamps();
  })();

  // 3. Role color converter
  const roleColorSwatch = document.getElementById('role-color-swatch');
  const roleColorHex = document.getElementById('role-color-hex');
  const roleColorOutput = document.getElementById('role-color-output');
  function renderRoleColor(){
    const v = roleColorHex.value.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) { roleColorOutput.innerHTML = `<span class="err">Enter a 6-digit hex color.</span>`; return; }
    const { r, g, b } = hexToRgb(v);
    const decimal = parseInt(v.slice(1), 16);
    roleColorOutput.innerHTML = `
      <div class="row"><span>Hex</span><span>${v.toUpperCase()}</span></div>
      <div class="row"><span>Decimal</span><span>${decimal}</span></div>
      <div class="row"><span>RGB</span><span>${r}, ${g}, ${b}</span></div>`;
  }
  roleColorSwatch?.addEventListener('input', () => { roleColorHex.value = roleColorSwatch.value; renderRoleColor(); });
  roleColorHex?.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(roleColorHex.value.trim())) roleColorSwatch.value = roleColorHex.value.trim();
    renderRoleColor();
  });
  if (roleColorHex) { roleColorHex.value = '#22D3EE'; roleColorSwatch.value = '#22D3EE'; renderRoleColor(); }

  // 4. Message length checker
  const lengthInput = document.getElementById('length-input');
  const lengthBars = document.getElementById('length-bars');
  const LENGTH_LIMITS = [
    { label:'Message', max: 2000 },
    { label:'Message (Nitro)', max: 4000 },
    { label:'Embed description', max: 4096 },
    { label:'Embed title', max: 256 },
  ];
  function renderLength(){
    const len = [...lengthInput.value].length;
    lengthBars.innerHTML = LENGTH_LIMITS.map(l => {
      const pct = Math.min(100, (len / l.max) * 100);
      const over = len > l.max;
      return `
        <div class="length-bar-item">
          <div class="row"><span>${l.label}</span><span>${len} / ${l.max}${over ? ' — over' : ''}</span></div>
          <div class="length-bar-track"><div class="length-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
  }
  lengthInput?.addEventListener('input', renderLength);
  renderLength();

  // 5. Text cleaner
  const cleanerInput = document.getElementById('cleaner-input');
  const cleanerOutput = document.getElementById('cleaner-output');
  const cleanerStripMd = document.getElementById('cleaner-strip-markdown');
  function stripDiscordMarkdown(str){
    return str
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\|\|(.*?)\|\|/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^#{1,3}\s*/gm, '');
  }
  function renderCleaner(){
    let out = cleanerInput.value;
    if (cleanerStripMd.checked) out = stripDiscordMarkdown(out);
    out = out.split('\n').map(l => l.replace(/[ \t]+$/g, '')).join('\n');
    out = out.replace(/\n{3,}/g, '\n\n');
    out = out.replace(/ {2,}/g, ' ');
    out = out.trim();
    cleanerOutput.textContent = out;
  }
  cleanerInput?.addEventListener('input', renderCleaner);
  cleanerStripMd?.addEventListener('change', renderCleaner);
  document.getElementById('copy-cleaner')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(cleanerOutput.textContent).catch(() => {});
    showToast('Copied!');
  });

  // 6. Emoji tag converter
  const emojiTagInput = document.getElementById('emoji-tag-input');
  const emojiTagOutput = document.getElementById('emoji-tag-output');
  function renderEmojiTag(){
    const raw = emojiTagInput.value.trim();
    if (!raw) { emojiTagOutput.innerHTML = ''; return; }
    let match = raw.match(/^<(a)?:(\w+):(\d+)>$/);
    let animated, name, id;
    if (match) {
      animated = !!match[1]; name = match[2]; id = match[3];
    } else {
      const parts = raw.split(':').filter(Boolean);
      if (parts.length === 2 && /^\d+$/.test(parts[1])) {
        name = parts[0]; id = parts[1]; animated = false;
      }
    }
    if (!name || !id) { emojiTagOutput.innerHTML = `<span class="err">Couldn't parse that — try &lt;:name:id&gt; or name:id.</span>`; return; }
    const tag = `<${animated ? 'a' : ''}:${name}:${id}>`;
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
    emojiTagOutput.innerHTML = `
      <div class="row"><span>Tag</span><span>${escapeHtml(tag)}</span></div>
      <div class="row"><span>Name</span><span>${escapeHtml(name)}</span></div>
      <div class="row"><span>ID</span><span>${escapeHtml(id)}</span></div>
      <div class="row"><span>Animated</span><span>${animated ? 'yes' : 'no'}</span></div>
      <button type="button" class="copy-link" data-copy-url="${url}">Copy image URL</button>
      <img class="emoji-preview" src="${url}" alt="" loading="lazy" onerror="this.style.display='none'">`;
  }
  emojiTagInput?.addEventListener('input', renderEmojiTag);
  emojiTagOutput?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    navigator.clipboard?.writeText(btn.dataset.copyUrl).catch(() => {});
    showToast('Copied!');
  });

  // 7. Permissions calculator
  const PERMISSIONS = [
    [0,'Create invite'],[1,'Kick members'],[2,'Ban members'],[3,'Administrator'],
    [4,'Manage channels'],[5,'Manage server'],[6,'Add reactions'],[7,'View audit log'],
    [8,'Priority speaker'],[9,'Video'],[10,'View channel'],[11,'Send messages'],
    [12,'Send TTS messages'],[13,'Manage messages'],[14,'Embed links'],[15,'Attach files'],
    [16,'Read message history'],[17,'Mention everyone'],[18,'Use external emojis'],[19,'View server insights'],
    [20,'Connect'],[21,'Speak'],[22,'Mute members'],[23,'Deafen members'],
    [24,'Move members'],[25,'Use voice activity'],[26,'Change nickname'],[27,'Manage nicknames'],
    [28,'Manage roles'],[29,'Manage webhooks'],[30,'Manage emojis/stickers'],[31,'Use application commands'],
  ];
  const permGrid = document.getElementById('perm-grid');
  const permIntegerInput = document.getElementById('perm-integer-input');
  let permSyncing = false;
  function renderPermGrid(){
    if (!permGrid) return;
    permGrid.innerHTML = PERMISSIONS.map(([bit, name]) => `
      <label class="perm-item"><input type="checkbox" data-perm-bit="${bit}"> ${name}</label>
    `).join('');
  }
  function permsToInteger(){
    let total = 0n;
    permGrid.querySelectorAll('[data-perm-bit]').forEach(cb => {
      if (cb.checked) total |= (1n << BigInt(cb.dataset.permBit));
    });
    return total;
  }
  function syncPermsFromCheckboxes(){
    if (permSyncing) return;
    permSyncing = true;
    permIntegerInput.value = permsToInteger().toString();
    permSyncing = false;
  }
  function syncCheckboxesFromInteger(){
    if (permSyncing) return;
    const raw = permIntegerInput.value.trim();
    if (!/^\d+$/.test(raw)) return;
    permSyncing = true;
    const value = BigInt(raw);
    permGrid.querySelectorAll('[data-perm-bit]').forEach(cb => {
      cb.checked = ((value >> BigInt(cb.dataset.permBit)) & 1n) === 1n;
    });
    permSyncing = false;
  }
  permGrid?.addEventListener('change', (e) => {
    if (e.target.matches('[data-perm-bit]')) syncPermsFromCheckboxes();
  });
  permIntegerInput?.addEventListener('input', syncCheckboxesFromInteger);
  renderPermGrid();

  // 8. CDN image URL builder
  const cdnIdInput = document.getElementById('cdn-id-input');
  const cdnHashInput = document.getElementById('cdn-hash-input');
  const cdnTypeSelect = document.getElementById('cdn-type-select');
  const cdnSizeSelect = document.getElementById('cdn-size-select');
  const cdnOutput = document.getElementById('cdn-output');
  function renderCdn(){
    const id = cdnIdInput.value.trim();
    const hash = cdnHashInput.value.trim();
    const type = cdnTypeSelect.value;
    const size = cdnSizeSelect.value;
    if (!/^\d{15,20}$/.test(id)) { cdnOutput.innerHTML = `<span class="err">Enter a valid ID (15-20 digits).</span>`; return; }
    let url;
    if (hash) {
      const ext = hash.startsWith('a_') ? 'gif' : 'png';
      const folder = type === 'avatar' ? 'avatars' : type === 'icon' ? 'icons' : 'banners';
      url = `https://cdn.discordapp.com/${folder}/${id}/${hash}.${ext}?size=${size}`;
    } else if (type === 'avatar') {
      try {
        const index = Number((BigInt(id) >> 22n) % 6n);
        url = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
      } catch { cdnOutput.innerHTML = `<span class="err">Couldn't compute a default avatar from that ID.</span>`; return; }
    } else {
      cdnOutput.innerHTML = `<span class="err">Server icons and banners need a hash — there's no default for those.</span>`;
      return;
    }
    cdnOutput.innerHTML = `
      <div class="row"><span>URL</span><span>${escapeHtml(url)}</span></div>
      <button type="button" class="copy-link" data-copy-url="${url}">Copy URL</button>`;
  }
  [cdnIdInput, cdnHashInput, cdnTypeSelect, cdnSizeSelect].forEach(el => el?.addEventListener('input', renderCdn));
  cdnOutput?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    navigator.clipboard?.writeText(btn.dataset.copyUrl).catch(() => {});
    showToast('Copied!');
  });

  /* ============ Init ============ */
  liveInput.value = state.text;
  renderCompatTable();
  renderFormatGrid();
  renderTemplateGrid();
  renderAnsiSwatches();
  renderPaletteGrid();
  syncColorInputs();
  renderAll();
})();
