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
    { id:'double-struck', name:'Double Struck', desc:'Academic outline energy', kind:'unicode', badge:'unicode', fn:'doubleStruck', keywords:'blackboard hollow outline math' },
    { id:'small-caps', name:'Small Caps', desc:'Compact uppercase rhythm', kind:'unicode', badge:'unicode', fn:'smallCaps' },
    { id:'script', name:'Script', desc:'Handwritten flourish', kind:'unicode', badge:'unicode', fn:'script', keywords:'cursive handwriting fancy' },
    { id:'fraktur', name:'Fraktur', desc:'Gothic blackletter mood', kind:'unicode', badge:'unicode', fn:'fraktur', keywords:'gothic old english medieval' },
    { id:'monospace', name:'Monospace', desc:'Even, typewriter spacing', kind:'unicode', badge:'unicode', fn:'monospace', mono:true, keywords:'code typewriter mono fixed-width' },
    { id:'emoji-safe-bold', name:'Emoji-safe Bold', desc:'Styles letters, leaves emoji clusters alone', kind:'unicode', badge:'discord', fn:'emojiSafeBold' },

    { id:'circled', name:'Circled', desc:'Every character gets a halo', kind:'symbols', badge:'varies', fn:'circled', keywords:'circle round bubble' },
    { id:'squared', name:'Squared', desc:'Boxed-out display type', kind:'symbols', badge:'varies', fn:'squared', keywords:'square box block' },
    { id:'fullwidth', name:'Fullwidth', desc:'Vaporwave terminal spacing', kind:'symbols', badge:'unicode', fn:'fullwidth', keywords:'wide aesthetic spaced' },
    { id:'regional-letters', name:'Regional Letters', desc:'Flag-style letter signals', kind:'symbols', badge:'varies', fn:'regionalLetters', keywords:'flag emoji letters' },

    { id:'ascii-frame', name:'ASCII Frame', desc:'Compatibility-friendly bracket frame', kind:'decorative', badge:'discord', fn:'asciiFrame', keywords:'brackets border frame' },
    { id:'upside-down', name:'Upside Down', desc:'Flips and reverses your text', kind:'decorative', badge:'discord', fn:'upsideDown', keywords:'flip mirror reverse' },
    { id:'strike-line', name:'Strike Line', desc:'Crossed-out with combining marks', kind:'decorative', badge:'discord', fn:'strikeLine', keywords:'strikethrough cross out' },
    { id:'underline-deco', name:'Underline', desc:'A quiet underline accent', kind:'decorative', badge:'discord', fn:'underlineDeco' },
    { id:'zalgo', name:'Zalgo', desc:'Glitched signal texture', kind:'decorative', badge:'varies', fn:'zalgo', keywords:'glitch corrupted creepy cursed' },
    { id:'sparkline', name:'Sparkline', desc:'Symbols around your text', kind:'decorative', badge:'discord', fn:'sparkline', keywords:'sparkle star decorative' },

    { id:'discord-bold', name:'Discord Bold', desc:'Native markdown emphasis', kind:'discord', badge:'discord', fn:'discordBold', mono:true },
    { id:'discord-italic', name:'Discord Italic', desc:'Native markdown emphasis', kind:'discord', badge:'discord', fn:'discordItalic', mono:true },
    { id:'discord-bold-italic', name:'Discord Bold Italic', desc:'Both at once', kind:'discord', badge:'discord', fn:'discordBoldItalic', mono:true },
    { id:'discord-strike', name:'Discord Strikethrough', desc:'Crosses it out', kind:'discord', badge:'discord', fn:'discordStrike', mono:true, keywords:'strikethrough cross out' },
    { id:'discord-spoiler', name:'Discord Spoiler', desc:'Hides text until tapped', kind:'discord', badge:'discord', fn:'discordSpoiler', mono:true, keywords:'hide blur censor' },
    { id:'discord-code', name:'Discord Code', desc:'Inline code formatting', kind:'discord', badge:'discord', fn:'discordCode', mono:true, keywords:'inline code snippet' },
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
    return style.name.toLowerCase().includes(q) || style.desc.toLowerCase().includes(q)
      || style.kind.includes(q) || (style.keywords && style.keywords.toLowerCase().includes(q));
  }
  function syncFilterPillsForSearch(q){
    const pills = document.querySelectorAll('#filter-row .filter-pill');
    if (q) {
      pills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));
    } else {
      pills.forEach(p => p.classList.toggle('active', p.dataset.filter === state.filter));
    }
  }

  function render(){
    const q = state.query.trim();
    const list = STYLES.filter(s => {
      if (state.onlyFavorites && !state.favorites.has(s.id)) return false;
      // While actively searching, search spans every category — the active filter
      // pill is bypassed rather than silently hiding otherwise-matching results.
      if (!q && state.filter !== 'all' && s.kind !== state.filter) return false;
      return matchesQuery(s, q);
    });

    syncFilterPillsForSearch(q);

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

  document.querySelectorAll('#filter-row .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#filter-row .filter-pill').forEach(p => p.classList.remove('active'));
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
    renderMessagePreview();
    renderWebhookPayload();
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

  // 2. Timestamp generator (builder)
  const timestampInput = document.getElementById('timestamp-input');
  const timestampGrid = document.getElementById('timestamp-grid');
  const tsHighlightRow = document.getElementById('ts-highlight-row');
  const tsHourToggle = document.getElementById('ts-hour-toggle');
  const tsTzToggle = document.getElementById('ts-tz-toggle');
  const tsPresetRow = document.getElementById('ts-preset-row');
  let tsHourMode = '12';
  let tsTzMode = 'local';
  const TS_FORMATS = [
    { code:'t', label:'Short time', desc:'Just the time' },
    { code:'T', label:'Long time', desc:'Time, with seconds' },
    { code:'d', label:'Short date', desc:'Numeric date' },
    { code:'D', label:'Long date', desc:'Date, spelled out' },
    { code:'f', label:'Short date/time', desc:'Date and time together' },
    { code:'F', label:'Long date/time', desc:'Full date, weekday and time' },
    { code:'R', label:'Relative', desc:"Counts automatically — \"in 2 hours\", then \"1 hour ago\", etc." },
  ];
  function getTimestampDate(){
    if (!timestampInput.value) return null;
    if (tsTzMode === 'utc') {
      const d = new Date(timestampInput.value + 'Z');
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(timestampInput.value);
    return isNaN(d.getTime()) ? null : d;
  }
  function tsPreviewText(date, code){
    const hour12 = tsHourMode === '12';
    if (code === 't') return date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit', hour12 });
    if (code === 'T') return date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit', second:'2-digit', hour12 });
    if (code === 'd') return date.toLocaleDateString();
    if (code === 'D') return date.toLocaleDateString([], { day:'numeric', month:'long', year:'numeric' });
    if (code === 'f') return date.toLocaleDateString([], { day:'numeric', month:'long', year:'numeric' }) + ' ' + date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit', hour12 });
    if (code === 'F') return date.toLocaleDateString([], { weekday:'long', day:'numeric', month:'long', year:'numeric' }) + ' ' + date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit', hour12 });
    if (code === 'R') return relativeTimeText(date);
    return '';
  }
  function relativeTimeText(date){
    const diffMs = date.getTime() - Date.now();
    const abs = Math.abs(diffMs);
    const mins = Math.round(abs / 60000);
    let unit, val;
    if (mins < 1) return 'just now';
    if (mins < 60) { val = mins; unit = 'minute'; }
    else if (mins < 1440) { val = Math.round(mins / 60); unit = 'hour'; }
    else if (mins < 43200) { val = Math.round(mins / 1440); unit = 'day'; }
    else { val = Math.round(mins / 43200); unit = 'month'; }
    const plural = val === 1 ? '' : 's';
    return diffMs >= 0 ? `in ${val} ${unit}${plural}` : `${val} ${unit}${plural} ago`;
  }
  function renderTimestamps(){
    const date = getTimestampDate();
    if (!date) { timestampGrid.innerHTML = ''; tsHighlightRow.innerHTML = ''; return; }
    const unix = Math.floor(date.getTime() / 1000);

    tsHighlightRow.innerHTML = `
      <div class="ts-highlight-item">
        <span class="ts-highlight-label">Unix timestamp</span>
        <span class="ts-highlight-value">${unix}</span>
      </div>
      <div class="ts-highlight-item">
        <span class="ts-highlight-label">Relative, right now</span>
        <span class="ts-highlight-value">${escapeHtml(relativeTimeText(date))}</span>
      </div>`;

    timestampGrid.innerHTML = TS_FORMATS.map(f => `
      <button type="button" class="ts-row" data-ts-copy="<t:${unix}:${f.code}>">
        <span class="ts-label"><strong>${f.label}</strong> — ${escapeHtml(f.desc)}<br>${escapeHtml(tsPreviewText(date, f.code))}</span>
        <span class="ts-code">&lt;t:${unix}:${f.code}&gt;</span>
      </button>
    `).join('');

    renderTzRows(date);
  }
  timestampInput?.addEventListener('input', renderTimestamps);
  timestampGrid?.addEventListener('click', (e) => {
    const row = e.target.closest('[data-ts-copy]');
    if (!row) return;
    navigator.clipboard?.writeText(row.dataset.tsCopy).catch(() => {});
    showToast('Copied!');
  });
  tsHighlightRow?.addEventListener('click', () => {
    const date = getTimestampDate();
    if (date) { navigator.clipboard?.writeText(String(Math.floor(date.getTime()/1000))).catch(() => {}); showToast('Copied!'); }
  });
  tsHourToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hour-mode]');
    if (!btn) return;
    tsHourToggle.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tsHourMode = btn.dataset.hourMode;
    renderTimestamps();
  });
  tsTzToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tz-mode]');
    if (!btn) return;
    tsTzToggle.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tsTzMode = btn.dataset.tzMode;
    renderTimestamps();
  });
  function setTimestampFromDate(date){
    let value;
    if (tsTzMode === 'utc') {
      value = date.toISOString().slice(0, 16);
    } else {
      const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      value = adjusted.toISOString().slice(0, 16);
    }
    timestampInput.value = value;
    renderTimestamps();
  }
  tsPresetRow?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ts-preset]');
    if (!btn) return;
    const now = new Date();
    const map = { now: 0, '1h': 3600000, '1d': 86400000, '1w': 604800000 };
    setTimestampFromDate(new Date(now.getTime() + (map[btn.dataset.tsPreset] || 0)));
  });

  /* ---- Timezone comparison ---- */
  const tzSearchInput = document.getElementById('tz-search-input');
  const tzSearchResults = document.getElementById('tz-search-results');
  const tzRowsContainer = document.getElementById('tz-rows');
  const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const FALLBACK_TIMEZONES = [
    'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'America/Sao_Paulo','America/Mexico_City','America/Toronto','Europe/London','Europe/Paris',
    'Europe/Berlin','Europe/Madrid','Europe/Moscow','Africa/Cairo','Africa/Johannesburg',
    'Asia/Dubai','Asia/Karachi','Asia/Kolkata','Asia/Dhaka','Asia/Bangkok','Asia/Singapore',
    'Asia/Hong_Kong','Asia/Shanghai','Asia/Tokyo','Asia/Seoul','Australia/Sydney',
    'Australia/Perth','Pacific/Auckland',
  ];
  let ALL_TIMEZONES = FALLBACK_TIMEZONES;
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const supported = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(supported) && supported.length) ALL_TIMEZONES = supported;
    }
  } catch {}

  function tzDisplayName(tz){
    const parts = tz.split('/');
    return (parts[parts.length - 1] || tz).replace(/_/g, ' ');
  }
  function tzRegion(tz){
    const parts = tz.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join(' / ').replace(/_/g, ' ') : '';
  }
  function tzOffsetLabel(date, tz){
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(date);
      const part = parts.find(p => p.type === 'timeZoneName');
      return part ? part.value.replace('GMT', 'UTC').replace('UTC0', 'UTC') || 'UTC' : '';
    } catch { return ''; }
  }
  function tzTimeLabel(date, tz){
    try {
      return new Intl.DateTimeFormat([], { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: tsHourMode === '12' }).format(date);
    } catch { return '—'; }
  }
  function tzDateKey(date, tz){
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    } catch { return ''; }
  }
  function tzDayDiff(date, tz){
    const a = tzDateKey(date, tz);
    const b = tzDateKey(date, BROWSER_TZ);
    if (!a || !b || a === b) return null;
    const diff = Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000);
    if (diff === 0) return null;
    return diff > 0 ? `+${diff}d` : `${diff}d`;
  }

  function loadSavedZones(){
    try {
      const raw = localStorage.getItem('lu_timezones');
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr; }
    } catch {}
    return [BROWSER_TZ];
  }
  function saveZones(){
    try { localStorage.setItem('lu_timezones', JSON.stringify(tzState.zones)); } catch {}
  }
  const tzState = { zones: loadSavedZones() };

  function renderTzRows(date){
    if (!tzRowsContainer) return;
    if (!date || !tzState.zones.length) {
      tzRowsContainer.innerHTML = `<p class="tz-empty-note">No timezones added yet — search above to add one.</p>`;
      return;
    }
    tzRowsContainer.innerHTML = tzState.zones.map(tz => {
      const dayDiff = tzDayDiff(date, tz);
      return `
        <div class="tz-row" data-tz="${escapeHtml(tz)}">
          <div class="tz-row-main">
            <span class="tz-city">${escapeHtml(tzDisplayName(tz))}</span>
            <span class="tz-offset">${escapeHtml(tzOffsetLabel(date, tz))}</span>
          </div>
          <div class="tz-row-time">
            <span class="tz-time">${escapeHtml(tzTimeLabel(date, tz))}</span>
            ${dayDiff ? `<span class="tz-date-badge" title="${escapeHtml(tzDateKey(date, tz))}">${dayDiff}</span>` : ''}
          </div>
          <button type="button" class="tz-remove" data-remove-tz="${escapeHtml(tz)}" aria-label="Remove ${escapeHtml(tzDisplayName(tz))}">×</button>
        </div>`;
    }).join('');
  }
  tzRowsContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-tz]');
    if (!btn) return;
    tzState.zones = tzState.zones.filter(z => z !== btn.dataset.removeTz);
    saveZones();
    renderTimestamps();
  });

  function renderTzSearch(query){
    if (!query) { tzSearchResults.hidden = true; tzSearchResults.innerHTML = ''; return; }
    const q = query.toLowerCase();
    const matches = ALL_TIMEZONES
      .filter(tz => !tzState.zones.includes(tz))
      .filter(tz => tz.toLowerCase().replace(/_/g, ' ').includes(q))
      .slice(0, 8);
    if (!matches.length) {
      tzSearchResults.innerHTML = `<div class="tz-search-empty">No matching city or timezone.</div>`;
      tzSearchResults.hidden = false;
      return;
    }
    const refDate = getTimestampDate() || new Date();
    tzSearchResults.innerHTML = matches.map(tz => `
      <button type="button" class="tz-result" data-add-tz="${escapeHtml(tz)}">
        ${escapeHtml(tzDisplayName(tz))}${tzRegion(tz) ? ` <span style="color:var(--text-dimmer)">— ${escapeHtml(tzRegion(tz))}</span>` : ''}
        <span class="tz-result-offset">${escapeHtml(tzOffsetLabel(refDate, tz))}</span>
      </button>
    `).join('');
    tzSearchResults.hidden = false;
  }
  tzSearchInput?.addEventListener('input', () => renderTzSearch(tzSearchInput.value.trim()));
  tzSearchInput?.addEventListener('focus', () => { if (tzSearchInput.value.trim()) renderTzSearch(tzSearchInput.value.trim()); });
  tzSearchResults?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-tz]');
    if (!btn) return;
    const tz = btn.dataset.addTz;
    if (!tzState.zones.includes(tz)) { tzState.zones.push(tz); saveZones(); }
    tzSearchInput.value = '';
    tzSearchResults.hidden = true;
    tzSearchResults.innerHTML = '';
    renderTimestamps();
  });
  document.addEventListener('click', (e) => {
    if (tzSearchResults && !tzSearchResults.hidden && !e.target.closest('.tz-search-wrap')) {
      tzSearchResults.hidden = true;
    }
  });
  tzSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { tzSearchResults.hidden = true; tzSearchInput.blur(); }
  });

  (function initTimestampDefault(){
    if (!timestampInput) return;
    setTimestampFromDate(new Date());
  })();
  // Keep the relative-time preview (and live timezone rows) fresh while the tool is open
  setInterval(() => { if (timestampInput?.value) renderTimestamps(); }, 30000);

  // 3. Role color converter
  const roleColorSwatch = document.getElementById('role-color-swatch');
  const roleColorHex = document.getElementById('role-color-hex');
  const roleColorOutput = document.getElementById('role-color-output');
  const roleColorPreview = document.getElementById('role-color-preview');
  function renderRoleColor(){
    const v = roleColorHex.value.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) {
      roleColorOutput.innerHTML = `<span class="err">Enter a 6-digit hex color.</span>`;
      if (roleColorPreview) roleColorPreview.innerHTML = '';
      return;
    }
    const { r, g, b } = hexToRgb(v);
    const decimal = parseInt(v.slice(1), 16);
    roleColorOutput.innerHTML = `
      <div class="row"><span>Hex</span><span>${v.toUpperCase()}</span></div>
      <div class="row"><span>Decimal</span><span>${decimal}</span></div>
      <div class="row"><span>RGB</span><span>${r}, ${g}, ${b}</span></div>`;
    if (roleColorPreview) roleColorPreview.innerHTML = `<span class="role-pill" style="color:${v}">role-name</span>`;
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
    const lines = lengthInput.value.length ? lengthInput.value.split('\n').length : 0;
    const bars = LENGTH_LIMITS.map(l => {
      const pct = Math.min(100, (len / l.max) * 100);
      const over = len > l.max;
      return `
        <div class="length-bar-item">
          <div class="row"><span>${l.label}</span><span>${len} / ${l.max}${over ? ' — over' : ''}</span></div>
          <div class="length-bar-track"><div class="length-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
    lengthBars.innerHTML = bars + `<div class="row" style="margin-top:2px"><span>Lines</span><span>${lines}</span></div>`;
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

  /* ============ Discord Tools search ============ */
  const toolSearchInput = document.getElementById('tool-search-input');
  const toolSearchEmpty = document.getElementById('tool-search-empty');
  const allToolGroups = document.querySelectorAll('.discord-tools .tool-group');
  function filterTools(){
    const q = toolSearchInput.value.trim().toLowerCase();
    let anyVisible = false;
    allToolGroups.forEach(group => {
      let groupHasVisible = false;
      group.querySelectorAll('.tool-grid > .panel').forEach(panel => {
        const title = panel.querySelector('.panel-title')?.textContent.toLowerCase() || '';
        const sub = panel.querySelector('.panel-sub')?.textContent.toLowerCase() || '';
        const keywords = (panel.dataset.keywords || '').toLowerCase();
        const match = !q || title.includes(q) || sub.includes(q) || keywords.includes(q);
        panel.style.display = match ? '' : 'none';
        if (match) groupHasVisible = true;
      });
      group.style.display = groupHasVisible ? '' : 'none';
      if (groupHasVisible) anyVisible = true;
    });
    toolSearchEmpty.hidden = anyVisible || !q;
  }
  toolSearchInput?.addEventListener('input', filterTools);

  /* ============ Discord Tools group nav (scroll-spy) ============ */
  const groupNavPills = document.querySelectorAll('.group-nav-pill');
  const toolGroups = document.querySelectorAll('.tool-group');
  if (groupNavPills.length && toolGroups.length && 'IntersectionObserver' in window) {
    const setActiveGroup = (id) => {
      groupNavPills.forEach(p => p.classList.toggle('active', p.dataset.group === id));
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveGroup(entry.target.id);
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    toolGroups.forEach(g => observer.observe(g));
  }

  /* ============ Embed Builder ============ */
  const embedInputs = {
    author: document.getElementById('embed-author-input'),
    title: document.getElementById('embed-title-input'),
    description: document.getElementById('embed-description-input'),
    colorSwatch: document.getElementById('embed-color-swatch'),
    colorHex: document.getElementById('embed-color-hex'),
    thumbnail: document.getElementById('embed-thumbnail-input'),
    image: document.getElementById('embed-image-input'),
    footer: document.getElementById('embed-footer-input'),
    timestampToggle: document.getElementById('embed-timestamp-toggle'),
  };
  const embedFieldsList = document.getElementById('embed-fields-list');
  const embedPreviewEl = document.getElementById('embed-preview');
  const embedJsonOutput = document.getElementById('embed-json-output');
  const messagePreviewBox = document.getElementById('message-preview-box');
  const webhookPayloadOutput = document.getElementById('webhook-payload-output');
  let embedFields = [];
  let embedFieldIdSeq = 0;

  function addEmbedFieldRow(name = '', value = ''){
    const id = ++embedFieldIdSeq;
    embedFields.push({ id, name, value });
    renderEmbedFields();
  }
  function renderEmbedFields(){
    if (!embedFieldsList) return;
    embedFieldsList.innerHTML = embedFields.map(f => `
      <div class="embed-field-row" data-field-id="${f.id}">
        <input type="text" class="text-input field-name" placeholder="Field name" value="${escapeHtml(f.name)}" data-field-part="name">
        <input type="text" class="text-input field-value" placeholder="Field value" value="${escapeHtml(f.value)}" data-field-part="value">
        <button type="button" class="embed-field-remove" data-remove-field="${f.id}" aria-label="Remove field">×</button>
      </div>
    `).join('');
  }
  embedFieldsList?.addEventListener('input', (e) => {
    const row = e.target.closest('[data-field-id]');
    if (!row) return;
    const field = embedFields.find(f => f.id === Number(row.dataset.fieldId));
    if (!field) return;
    field[e.target.dataset.fieldPart] = e.target.value;
    renderEmbedOutput();
  });
  embedFieldsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-field]');
    if (!btn) return;
    embedFields = embedFields.filter(f => f.id !== Number(btn.dataset.removeField));
    renderEmbedFields();
    renderEmbedOutput();
  });
  document.getElementById('embed-add-field')?.addEventListener('click', () => addEmbedFieldRow());

  function currentEmbedObject(){
    const embed = {};
    if (embedInputs.author.value.trim()) embed.author = { name: embedInputs.author.value.trim() };
    if (embedInputs.title.value.trim()) embed.title = embedInputs.title.value.trim();
    if (embedInputs.description.value.trim()) embed.description = embedInputs.description.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(embedInputs.colorHex.value.trim())) embed.color = parseInt(embedInputs.colorHex.value.trim().slice(1), 16);
    if (embedInputs.thumbnail.value.trim()) embed.thumbnail = { url: embedInputs.thumbnail.value.trim() };
    if (embedInputs.image.value.trim()) embed.image = { url: embedInputs.image.value.trim() };
    if (embedInputs.footer.value.trim()) embed.footer = { text: embedInputs.footer.value.trim() };
    if (embedInputs.timestampToggle.checked) embed.timestamp = new Date().toISOString();
    const fields = embedFields.filter(f => f.name.trim() || f.value.trim()).map(f => ({ name: f.name || '\u200b', value: f.value || '\u200b' }));
    if (fields.length) embed.fields = fields;
    return embed;
  }
  function renderEmbedOutput(){
    if (!embedPreviewEl) return;
    const embed = currentEmbedObject();
    embedJsonOutput.textContent = JSON.stringify(embed, null, 2);

    const color = /^#[0-9a-fA-F]{6}$/.test(embedInputs.colorHex.value.trim()) ? embedInputs.colorHex.value.trim() : 'var(--accent)';
    embedPreviewEl.style.borderLeftColor = color;
    let html = '';
    if (embed.author) html += `<div class="ep-author">${escapeHtml(embed.author.name)}</div>`;
    if (embed.thumbnail) html += `<img class="ep-thumb" src="${escapeHtml(embed.thumbnail.url)}" alt="" onerror="this.style.display='none'">`;
    if (embed.title) html += `<div class="ep-title">${escapeHtml(embed.title)}</div>`;
    if (embed.description) html += `<div class="ep-desc">${escapeHtml(embed.description)}</div>`;
    if (embed.fields?.length) {
      html += `<div class="ep-fields">${embed.fields.map(f => `<div><div class="ep-field-name">${escapeHtml(f.name)}</div><div class="ep-field-value">${escapeHtml(f.value)}</div></div>`).join('')}</div>`;
    }
    if (embed.image) html += `<img class="ep-image" src="${escapeHtml(embed.image.url)}" alt="" onerror="this.style.display='none'">`;
    if (embed.footer || embed.timestamp) {
      const parts = [embed.footer?.text, embed.timestamp ? new Date(embed.timestamp).toLocaleString() : null].filter(Boolean);
      html += `<div class="ep-footer">${escapeHtml(parts.join(' · '))}</div>`;
    }
    embedPreviewEl.innerHTML = html;
    renderMessagePreview();
    renderWebhookPayload();
  }
  Object.values(embedInputs).forEach(el => el?.addEventListener('input', renderEmbedOutput));
  embedInputs.colorSwatch?.addEventListener('input', () => { embedInputs.colorHex.value = embedInputs.colorSwatch.value; renderEmbedOutput(); });
  embedInputs.colorHex?.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(embedInputs.colorHex.value.trim())) embedInputs.colorSwatch.value = embedInputs.colorHex.value.trim();
  });
  document.getElementById('copy-embed-json')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(embedJsonOutput.textContent).catch(() => {});
    showToast('Copied!');
  });
  if (embedInputs.colorHex) embedInputs.colorHex.value = '#22D3EE';
  if (embedInputs.colorSwatch) embedInputs.colorSwatch.value = '#22D3EE';
  renderEmbedOutput();

  /* ============ Markdown preview ============ */
  const mdPreviewInput = document.getElementById('md-preview-input');
  const mdPreviewOutput = document.getElementById('md-preview-output');
  function renderMarkdownPreview(){
    if (!mdPreviewOutput) return;
    let html = escapeHtml(mdPreviewInput.value);
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre>${code}</pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<u>$1</u>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
    html = html.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" data-spoiler>$1</span>');
    html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/\n/g, '<br>');
    mdPreviewOutput.innerHTML = html;
  }
  mdPreviewInput?.addEventListener('input', renderMarkdownPreview);
  mdPreviewOutput?.addEventListener('click', (e) => {
    const spoiler = e.target.closest('[data-spoiler]');
    if (spoiler) spoiler.classList.toggle('revealed');
  });
  renderMarkdownPreview();

  /* ============ Mention formatter ============ */
  const mentionTypeSelect = document.getElementById('mention-type-select');
  const mentionIdInput = document.getElementById('mention-id-input');
  const mentionOutput = document.getElementById('mention-output');
  function renderMention(){
    const id = mentionIdInput.value.trim();
    if (!/^\d{15,20}$/.test(id)) { mentionOutput.innerHTML = `<span class="err">Enter a valid ID (15-20 digits).</span>`; return; }
    const type = mentionTypeSelect.value;
    const tag = type === 'user' ? `<@${id}>` : type === 'role' ? `<@&${id}>` : `<#${id}>`;
    mentionOutput.innerHTML = `
      <div class="row"><span>Mention</span><span>${escapeHtml(tag)}</span></div>
      <button type="button" class="copy-link" data-copy-url="${escapeHtml(tag)}">Copy</button>`;
  }
  [mentionTypeSelect, mentionIdInput].forEach(el => el?.addEventListener('input', renderMention));
  mentionOutput?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    navigator.clipboard?.writeText(btn.dataset.copyUrl).catch(() => {});
    showToast('Copied!');
  });

  /* ============ Message preview ============ */
  function discordMarkdownToHtml(str){
    let html = escapeHtml(str);
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre>${code}</pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<u>$1</u>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
    html = html.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" data-spoiler>$1</span>');
    html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }
  function renderMessagePreview(){
    if (!messagePreviewBox) return;
    const text = applyCase(state.text) || '';
    const now = new Date();
    const embed = currentEmbedObject();
    const hasEmbed = Object.keys(embed).length > 0;
    let embedHtml = '';
    if (hasEmbed) embedHtml = `<div class="mp-embed-wrap">${embedPreviewEl.innerHTML}</div>`;
    messagePreviewBox.innerHTML = `
      <div class="mp-avatar">L</div>
      <div class="mp-body">
        <div class="mp-head"><span class="mp-username">Luka's Utils</span><span class="mp-time">Today at ${now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}</span></div>
        <div class="mp-content">${discordMarkdownToHtml(text)}</div>
        ${embedHtml}
      </div>`;
  }

  /* ============ Invites ============ */
  const inviteInput = document.getElementById('invite-input');
  const inviteOutput = document.getElementById('invite-output');
  function extractInviteCode(raw){
    const trimmed = raw.trim().replace(/\/+$/, '');
    const match = trimmed.match(/(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)?([\w-]{2,32})$/);
    return match ? match[1] : null;
  }
  function renderInviteFormat(){
    const code = extractInviteCode(inviteInput.value);
    if (!code) { inviteOutput.innerHTML = ''; return; }
    const url = `https://discord.gg/${code}`;
    inviteOutput.innerHTML = `
      <div class="row"><span>Code</span><span>${escapeHtml(code)}</span></div>
      <div class="row"><span>Link</span><span>${escapeHtml(url)}</span></div>
      <button type="button" class="copy-link" data-copy-url="${url}">Copy link</button>`;
  }
  inviteInput?.addEventListener('input', renderInviteFormat);
  inviteOutput?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    navigator.clipboard?.writeText(btn.dataset.copyUrl).catch(() => {});
    showToast('Copied!');
  });

  const inviteLookupInput = document.getElementById('invite-lookup-input');
  const inviteLookupBtn = document.getElementById('invite-lookup-btn');
  const inviteLookupOutput = document.getElementById('invite-lookup-output');
  inviteLookupBtn?.addEventListener('click', async () => {
    const code = extractInviteCode(inviteLookupInput.value);
    if (!code) { inviteLookupOutput.innerHTML = `<span class="err">Enter an invite code or link first.</span>`; return; }
    inviteLookupOutput.innerHTML = `<span>Looking up…</span>`;
    try {
      const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`);
      if (!res.ok) { inviteLookupOutput.innerHTML = `<span class="err">That invite doesn't seem to exist, or has expired.</span>`; return; }
      const data = await res.json();
      const guild = data.guild || {};
      inviteLookupOutput.innerHTML = `
        <div class="row"><span>Server</span><span>${escapeHtml(guild.name || '—')}</span></div>
        <div class="row"><span>Members</span><span>${data.approximate_member_count ?? '—'}</span></div>
        <div class="row"><span>Online</span><span>${data.approximate_presence_count ?? '—'}</span></div>
        <div class="row"><span>Channel</span><span>${escapeHtml(data.channel?.name || '—')}</span></div>`;
    } catch {
      inviteLookupOutput.innerHTML = `<span class="err">Couldn't reach Discord's API from here — this can happen due to browser restrictions. The invite formatter above still works fully offline.</span>`;
    }
  });

  /* ============ Developer tools ============ */
  // JSON formatter
  const jsonFmtInput = document.getElementById('json-fmt-input');
  const jsonFmtOutput = document.getElementById('json-fmt-output');
  function renderJsonFmt(){
    const raw = jsonFmtInput.value.trim();
    if (!raw) { jsonFmtOutput.textContent = ''; return; }
    try {
      jsonFmtOutput.textContent = JSON.stringify(JSON.parse(raw), null, 2);
    } catch (err) {
      jsonFmtOutput.textContent = `Invalid JSON: ${err.message}`;
    }
  }
  jsonFmtInput?.addEventListener('input', renderJsonFmt);
  document.getElementById('copy-json-fmt')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(jsonFmtOutput.textContent).catch(() => {});
    showToast('Copied!');
  });

  // Base64
  const base64Input = document.getElementById('base64-input');
  const base64Output = document.getElementById('base64-output');
  const base64ModeToggle = document.getElementById('base64-mode-toggle');
  let base64Mode = 'encode';
  function renderBase64(){
    const raw = base64Input.value;
    if (!raw) { base64Output.textContent = ''; return; }
    try {
      if (base64Mode === 'encode') {
        base64Output.textContent = btoa(unescape(encodeURIComponent(raw)));
      } else {
        base64Output.textContent = decodeURIComponent(escape(atob(raw.trim())));
      }
    } catch {
      base64Output.textContent = base64Mode === 'decode' ? "That doesn't look like valid Base64." : 'Could not encode that text.';
    }
  }
  base64Input?.addEventListener('input', renderBase64);
  base64ModeToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-b64-mode]');
    if (!btn) return;
    base64ModeToggle.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    base64Mode = btn.dataset.b64Mode;
    base64Input.placeholder = base64Mode === 'encode' ? 'Text to encode' : 'Base64 to decode';
    renderBase64();
  });
  document.getElementById('copy-base64')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(base64Output.textContent).catch(() => {});
    showToast('Copied!');
  });

  // UUID generator
  const uuidOutput = document.getElementById('uuid-output');
  function renderUuid(){
    const id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    }));
    uuidOutput.innerHTML = `<div class="row"><span>UUID</span><span>${id}</span></div><button type="button" class="copy-link" data-copy-url="${id}">Copy</button>`;
  }
  document.getElementById('generate-uuid')?.addEventListener('click', renderUuid);
  uuidOutput?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    navigator.clipboard?.writeText(btn.dataset.copyUrl).catch(() => {});
    showToast('Copied!');
  });
  renderUuid();

  // Unix timestamp converter
  const unixInput = document.getElementById('unix-input');
  const unixOutput = document.getElementById('unix-output');
  function renderUnix(){
    const raw = unixInput.value.trim();
    if (!raw) { unixOutput.innerHTML = ''; return; }
    let date;
    if (/^\d{10}$/.test(raw)) date = new Date(Number(raw) * 1000);
    else if (/^\d{13}$/.test(raw)) date = new Date(Number(raw));
    else date = new Date(raw);
    if (isNaN(date?.getTime())) { unixOutput.innerHTML = `<span class="err">Couldn't parse that as a timestamp or date.</span>`; return; }
    unixOutput.innerHTML = `
      <div class="row"><span>Unix (s)</span><span>${Math.floor(date.getTime() / 1000)}</span></div>
      <div class="row"><span>Unix (ms)</span><span>${date.getTime()}</span></div>
      <div class="row"><span>UTC</span><span>${date.toUTCString()}</span></div>
      <div class="row"><span>Local</span><span>${date.toLocaleString()}</span></div>`;
  }
  unixInput?.addEventListener('input', renderUnix);

  // Webhook payload builder
  function renderWebhookPayload(){
    if (!webhookPayloadOutput) return;
    const payload = {};
    if (state.text?.trim()) payload.content = applyCase(state.text);
    const embed = currentEmbedObject();
    if (Object.keys(embed).length) payload.embeds = [embed];
    webhookPayloadOutput.textContent = JSON.stringify(payload, null, 2);
  }
  document.getElementById('copy-webhook-payload')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(webhookPayloadOutput.textContent).catch(() => {});
    showToast('Copied!');
  });
  renderMessagePreview();
  renderWebhookPayload();

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
