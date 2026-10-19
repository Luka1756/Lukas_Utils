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
    '.':'˙',',':"'",'?':'¿','!':'¡',"'":',','(':')',')':'(','[':']',']':'[','{':'}','}':'{','<':'>','>':'<','&':'⅋','_':'‾',';':'؛','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'ㄣ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6','0':'0' };

  // Anything that reverses, joins or decorates text works on whole visible characters ("grapheme clusters"),
  // so an emoji family, a flag or a letter with its accent is never split. Falls back to code points where
  // Intl.Segmenter is missing.
  const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const graphemes = (str) => segmenter ? Array.from(segmenter.segment(str), x => x.segment) : [...str];
  function smallCaps(str){ return [...str].map(c => SMALL_CAPS[c.toLowerCase()] ? (c === c.toUpperCase() && c !== c.toLowerCase() ? c : SMALL_CAPS[c]) : c).join(''); }
  function upsideDown(str){ return graphemes(str).reverse().map(c => UPSIDE_DOWN[c] || c).join(''); }
  function enclose(str, fn){ return [...str].map(c => fn(c) || c).join(''); }

  function circled(ch){
    if (ch >= 'A' && ch <= 'Z') return String.fromCodePoint(0x24B6 + (ch.codePointAt(0) - 65));
    if (ch >= 'a' && ch <= 'z') return String.fromCodePoint(0x24D0 + (ch.codePointAt(0) - 97));
    if (ch === '0') return '\u24EA';   // ⓪ CIRCLED DIGIT ZERO (the old value was the letter Ⓞ)
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
    strikeLine: s => graphemes(s).map(c => c + '\u0336').join(''),
    underlineDeco: s => graphemes(s).map(c => c + '\u0332').join(''),
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
    hiddenDots: s => graphemes(s).join('\u2800'),
    zeroWidth: s => graphemes(s).join('\u200b'),
    secretCode: s => `||\`${s}\`||`,
    superscript: s => enclose(s, ch => SUPERSCRIPT_MAP[ch]),
    subscript: s => enclose(s, ch => SUBSCRIPT_MAP[ch]),
    boldFraktur: s => mapAlpha(s, { upperStart:0x1D56C, lowerStart:0x1D586 }),
    sansBoldItalic: s => mapAlpha(s, { upperStart:0x1D63C, lowerStart:0x1D656 }),
  };

  const SUPERSCRIPT_MAP = {
    a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',
    n:'ⁿ',o:'ᵒ',p:'ᵖ',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ',
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
    '+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾',
  };
  const SUBSCRIPT_MAP = {
    a:'ₐ',e:'ₑ',h:'ₕ',i:'ᵢ',j:'ⱼ',k:'ₖ',l:'ₗ',m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',r:'ᵣ',s:'ₛ',t:'ₜ',u:'ᵤ',v:'ᵥ',x:'ₓ',
    '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
    '+':'₊','-':'₋','=':'₌','(':'₍',')':'₎',
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
    for (const ch of graphemes(str)) {
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
    { id:'superscript', name:'Superscript', desc:'Small raised characters', kind:'unicode', badge:'varies', fn:'superscript', keywords:'exponent power small raised' },
    { id:'subscript', name:'Subscript', desc:'Small lowered characters', kind:'unicode', badge:'varies', fn:'subscript', keywords:'chemistry formula small lowered' },
    { id:'bold-fraktur', name:'Bold Fraktur', desc:'Heavier gothic blackletter', kind:'unicode', badge:'unicode', fn:'boldFraktur', keywords:'gothic old english medieval heavy' },
    { id:'sans-bold-italic', name:'Sans Bold Italic', desc:'Loud and leaning', kind:'unicode', badge:'unicode', fn:'sansBoldItalic' },
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



  /* ============ Safe browser storage ============ */
  // localStorage can be missing, blocked or full. Every access goes through these two helpers,
  // so a storage problem never stops the page from starting and never throws inside a click handler.
  const lsafe = {
    get(key){ try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value){ try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; } },
  };
  let storageWarned = false;
  function warnStorage(what){
    if (storageWarned) return;
    storageWarned = true;
    showToast(`Couldn't save ${what} in this browser. It will last until you leave this page.`, 3600);
  }
  // Saved favourites are untrusted: keep only ids of real styles. An unreadable value is parked under a
  // _backup key instead of being thrown away.
  function loadFavorites(){
    const raw = lsafe.get('lu_favorites');
    if (!raw) return new Set();
    let list = null;
    try { list = JSON.parse(raw); } catch (e) { list = null; }
    if (!Array.isArray(list)) { lsafe.set('lu_favorites_backup', raw); return new Set(); }
    const known = new Set(STYLES.map(s => s.id));
    return new Set(list.filter(id => typeof id === 'string' && known.has(id)));
  }
  // Characters are counted as Unicode code points everywhere (an emoji is one, not two UTF-16 units).
  const charLen = (str) => { let n = 0; for (const _ of str) n++; return n; };
  const EXAMPLE_MAX = 1000;
  const clampExample = (str) => {
    if (str.length <= EXAMPLE_MAX) return str;
    const points = Array.from(str);
    return points.length > EXAMPLE_MAX ? points.slice(0, EXAMPLE_MAX).join('') : str;
  };

  /* ============ State ============ */
  const state = {
    text: '',
    caseMode: 'none',
    filter: 'all',
    query: '',
    favorites: loadFavorites(),
    onlyFavorites: false,
  };

  // Word starts are found with Unicode letters, not \w, so accented words ("élan") are capitalised
  // from their first letter instead of from the first ASCII letter inside them.
  function titleCase(str){
    return str.replace(/[\p{L}\p{N}_]\S*/gu, w => { const cp = Array.from(w); return cp[0].toUpperCase() + cp.slice(1).join('').toLowerCase(); });
  }
  function sentenceCase(str){
    return str.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, lead, ch) => lead + ch.toUpperCase());
  }
  function applyCase(str){
    if (state.caseMode === 'lower') return str.toLowerCase();
    if (state.caseMode === 'title') return titleCase(str);
    return str;
  }

  // The Example box is empty by default and only shows "Example" as a placeholder. Style previews
  // and copy buttons fall back to that word when it is empty; real text is never replaced by it.
  const sampleText = () => state.text || 'Example';

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
    const input = applyCase(sampleText());
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
          <span class="preview-chars">${(() => { const n = [...output].length; return `${n} ${n === 1 ? 'char' : 'chars'}`; })()}</span>
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
    if (!lsafe.set('lu_theme', next)) warnStorage('your theme choice');
  });
  (function initTheme(){
    const saved = lsafe.get('lu_theme');
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  })();

  document.getElementById('fav-toggle').addEventListener('click', () => {
    state.onlyFavorites = !state.onlyFavorites;
    document.getElementById('fav-toggle').classList.toggle('active-filter', state.onlyFavorites);
    document.getElementById('styles').scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderAll();
  });

  liveInput.addEventListener('input', (e) => {
    const clamped = clampExample(e.target.value);
    if (clamped !== e.target.value) e.target.value = clamped;
    state.text = clamped;
    charCurrent.textContent = charLen(state.text);
    refreshCaseFromState();
    renderAll();
  });
  charCurrent.textContent = charLen(state.text);

  document.getElementById('live-clear').addEventListener('click', () => {
    state.text = '';
    liveInput.value = '';
    charCurrent.textContent = '0';
    refreshCaseFromState();
    liveInput.focus();
    renderAll();
  });

  // Scoped to the Example box's own AA/aa/Aa group. Unscoped, clicking any other toggle (UTC, 24h,
  // Minify, a hash algorithm…) cleared this highlight and set the case mode to undefined.
  document.querySelectorAll('.live-controls .case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.live-controls .case-btn').forEach(b => b.classList.remove('active'));
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
    if (!lsafe.set('lu_favorites', JSON.stringify([...state.favorites]))) warnStorage('your favourites');
    renderAll();
  }

  async function doCopy(id, btnEl){
    const style = STYLES.find(s => s.id === id);
    if (!style) return;
    const output = TRANSFORMS[style.fn](applyCase(sampleText()));
    if (!(await copyText(output))) return;
    showToast('Copied!');
    if (btnEl) {
      btnEl.classList.add('copied');
      setTimeout(() => btnEl.classList.remove('copied'), 900);
    }
  }

  let toastTimer;
  // The toast is a manual popover where the browser supports it, which puts it in the top layer. A modal
  // dialog (Export, Import, Save) would otherwise cover it and "Copied!" would never be seen.
  const toastPopover = !!(toast && typeof toast.showPopover === 'function');
  if (toastPopover) toast.setAttribute('popover', 'manual');
  let toastHideTimer;
  function showToast(msg, ms){
    toast.textContent = msg;
    clearTimeout(toastHideTimer);
    if (toastPopover) { try { if (!toast.matches(':popover-open')) toast.showPopover(); } catch (e) {} }
    // one frame after it is displayed, so the fade-in still plays
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      if (toastPopover) toastHideTimer = setTimeout(() => { try { toast.hidePopover(); } catch (e) {} }, 220);
    }, ms || 1400);
  }

  // Copies text and reports the truth: resolves true only when something was really copied.
  // Tries the async Clipboard API first, then a hidden-textarea fallback for older or restricted browsers.
  // On failure it shows its own message, so callers simply stop instead of showing "Copied!".
  async function copyText(text){
    const value = text == null ? '' : String(text);
    if (!value.trim()) { showToast('Nothing to copy'); return false; }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (e) { /* fall through to the fallback */ }
    const previous = document.activeElement;
    const ta = document.createElement('textarea');
    try {
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.setAttribute('aria-hidden', 'true');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      // An open modal dialog makes everything outside it inert, so the helper has to live inside it.
      (document.querySelector('dialog[open]') || document.body).appendChild(ta);
      ta.focus({ preventScroll: true });
      ta.select();
      ta.setSelectionRange(0, value.length);
      if (document.execCommand('copy')) return true;
    } catch (e) { /* reported below */ }
    finally {
      ta.remove();
      if (previous && previous.focus) { try { previous.focus({ preventScroll: true }); } catch (e) {} }
    }
    showToast("Couldn't copy — select the text and copy it manually", 3200);
    return false;
  }
  // Output boxes that can show an error message mark themselves with data-state="error". Copying then
  // says there is nothing to copy instead of putting the error text on the clipboard.
  function setOutput(el, text, isError){
    el.textContent = text;
    if (isError) el.dataset.state = 'error'; else delete el.dataset.state;
  }
  async function copyOutput(el){
    if (el.dataset.state === 'error') { showToast('Nothing to copy — fix the input first'); return false; }
    return copyText(el.textContent);
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
    discordOutputEl.textContent = TRANSFORMS[fmt.fn](applyCase(sampleText()));
  }
  formatGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-format]');
    if (!btn) return;
    discordLabState.formatId = btn.dataset.format;
    renderFormatGrid();
    renderDiscordOutput();
  });
  document.getElementById('copy-discord-format')?.addEventListener('click', async () => {
    if (!(await copyText(discordOutputEl.textContent))) return;
    showToast('Copied!');
  });

  /* ============ Templates ============ */
  const templateState = { id: 'announcement', custom: '' };
  const templateGrid = document.getElementById('template-grid');
  const templateOutputEl = document.getElementById('template-output');

  function renderTemplateGrid(){
    if (!templateGrid) return;
    templateGrid.innerHTML = TEMPLATES.map(t => `
      <button type="button" class="template-card ${!templateState.custom && t.id === templateState.id ? 'active' : ''}" data-template="${t.id}">
        <div><h4>${t.name}</h4><p>${t.desc}</p></div>
        <svg viewBox="0 0 24 24" width="16" height="16"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 15V6a1 1 0 0 1 1-1h9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </button>
    `).join('');
  }
  function renderTemplateOutput(){
    if (!templateOutputEl) return;
    if (templateState.custom) { templateOutputEl.textContent = templateState.custom; return; }
    const t = TEMPLATES.find(t => t.id === templateState.id) || TEMPLATES[0];
    templateOutputEl.textContent = t.build(applyCase(sampleText()));
  }
  templateGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-template]');
    if (!btn) return;
    templateState.id = btn.dataset.template;
    templateState.custom = '';
    renderTemplateGrid();
    renderTemplateOutput();
  });
  document.getElementById('copy-template')?.addEventListener('click', async () => {
    if (!(await copyText(templateOutputEl.textContent))) return;
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
  // Discord only colours text when the real escape character (U+001B) sits inside a code block marked "ansi".
  // The literal characters "\u001b" do nothing, so the copied text carries the real character, and the page
  // shows it as the visible symbol ␛ so the output stays readable.
  const ANSI_ESC = '\u001b';
  function ansiString(){
    const c = ANSI_COLORS.find(c => c.id === ansiState.id) || ANSI_COLORS[0];
    return '```ansi\n' + `${ANSI_ESC}[${c.code}m${applyCase(sampleText())}${ANSI_ESC}[0m` + '\n```';
  }
  function renderAnsiOutput(){
    if (!ansiOutputEl) return;
    ansiOutputEl.innerHTML = `<span class="output-label">Ansi output</span><div class="output-text ansi-code">${escapeHtml(ansiString().split(ANSI_ESC).join('\u241B'))}</div><p class="ansi-note">␛ is the invisible escape character. Copy includes the real one, so paste it straight into Discord.</p>`;
  }
  ansiSwatches?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ansi]');
    if (!btn) return;
    ansiState.id = btn.dataset.ansi;
    renderAnsiSwatches();
    renderAnsiOutput();
  });
  document.getElementById('copy-ansi')?.addEventListener('click', async () => {
    if (!(await copyText(ansiString()))) return;
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
    colorPreviewBox.textContent = applyCase(sampleText());
    const ratio = contrastRatio(colorState.fg, colorState.bg);
    contrastPill.textContent = ratio.toFixed(2) + ':1 contrast';
    contrastPill.classList.remove('low', 'mid');
    if (ratio < 4.5) contrastPill.classList.add('low');
    else if (ratio < 7) contrastPill.classList.add('mid');
  }
  document.getElementById('copy-css-values')?.addEventListener('click', async () => {
    const css = `--foreground: ${colorState.fg};\n--preview: ${colorState.bg};\n--canvas: ${colorState.canvas};`;
    if (!(await copyText(css))) return;
    showToast('Copied!');
  });
  document.getElementById('copy-pair')?.addEventListener('click', async () => {
    if (!(await copyText(`${colorState.fg} on ${colorState.bg}`))) return;
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
  document.getElementById('copy-json')?.addEventListener('click', async () => {
    if (!(await copyText(JSON.stringify(currentPresetObject(), null, 2)))) return;
    showToast('Copied!');
  });
  document.getElementById('download-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(currentPresetObject(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lukas-utils-preset.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Downloaded');
  });
  const importFileInput = document.getElementById('import-json-file');
  document.getElementById('import-json-btn')?.addEventListener('click', () => importFileInput.click());
  // Session snapshot import. The file is untrusted, so everything is checked first and only valid parts are
  // applied: favourites must be real style ids, colours must be #RRGGBB, text is clamped like typed text.
  const SNAPSHOT_MAX_BYTES = 1000000;
  const HEX6 = /^#[0-9a-fA-F]{6}$/;
  importFileInput?.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (!file) return;
    // Clearing the input lets the same file be chosen again (browsers fire no change event otherwise).
    const release = () => { try { importFileInput.value = ''; } catch (e) {} };
    if (file.size > SNAPSHOT_MAX_BYTES) { showToast('That file is too large to import', 2600); release(); return; }
    const reader = new FileReader();
    reader.onerror = () => { release(); showToast("Couldn't read that file", 2600); };
    reader.onload = () => {
      release();
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { showToast("That isn't valid JSON", 2600); return; }
      if (!data || typeof data !== 'object' || Array.isArray(data)) { showToast("That isn't a session snapshot", 2600); return; }
      const applied = [], skipped = [];
      if (data.text !== undefined) {
        if (typeof data.text === 'string') {
          state.text = clampExample(data.text); liveInput.value = state.text; charCurrent.textContent = charLen(state.text);
          refreshCaseFromState(); applied.push('text');
        } else skipped.push('text');
      }
      if (data.favorites !== undefined) {
        if (Array.isArray(data.favorites)) {
          const known = new Set(STYLES.map(s => s.id));
          const keep = [...new Set(data.favorites.filter(id => typeof id === 'string' && known.has(id)))];
          if (keep.length < data.favorites.length) skipped.push('some favorites');
          state.favorites = new Set(keep);
          if (!lsafe.set('lu_favorites', JSON.stringify(keep))) warnStorage('your favorites');
          applied.push('favorites');
        } else skipped.push('favorites');
      }
      if (data.colors !== undefined) {
        const c = data.colors && typeof data.colors === 'object' && !Array.isArray(data.colors) ? data.colors : null;
        const next = {};
        if (c) [['foreground', 'fg'], ['background', 'bg'], ['canvas', 'canvas']].forEach(([from, to]) => { if (typeof c[from] === 'string' && HEX6.test(c[from].trim())) next[to] = c[from].trim().toUpperCase(); });
        if (Object.keys(next).length) { Object.assign(colorState, next); colorState.activePreset = null; syncColorInputs(); applied.push('colors'); }
        else skipped.push('colors');
      }
      renderAll();
      if (!applied.length) showToast('Nothing usable in that file', 2800);
      else showToast(skipped.length ? `Imported ${applied.join(', ')} — skipped ${skipped.join(', ')}` : 'Imported!', skipped.length ? 3200 : 1400);
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
  // A snowflake is an unsigned 64-bit number. Twenty digits is not enough on its own: 99999999999999999999 is
  // twenty digits and far too big to be an ID.
  const isSnowflake = (str) => /^\d{15,20}$/.test(str) && BigInt(str) <= 18446744073709551615n;

  // 1. Snowflake decoder
  const snowflakeInput = document.getElementById('snowflake-input');
  const snowflakeOutput = document.getElementById('snowflake-output');
  function renderSnowflake(){
    const raw = snowflakeInput.value.trim();
    if (!raw) { snowflakeOutput.innerHTML = ''; return; }
    if (!isSnowflake(raw)) { snowflakeOutput.innerHTML = `<span class="err">Doesn't look like a valid snowflake — it should be 15 to 20 digits and no larger than 18446744073709551615.</span>`; return; }
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
    else if (mins < 525600) { val = Math.min(11, Math.round(mins / 43200)); unit = 'month'; }   // never "12 months"
    else { val = Math.round(mins / 525600); unit = 'year'; }
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
        <span class="ts-highlight-value" data-ts-rel="${date.getTime()}">${escapeHtml(relativeTimeText(date))}</span>
      </div>`;

    timestampGrid.innerHTML = TS_FORMATS.map(f => `
      <button type="button" class="ts-row" data-ts-copy="<t:${unix}:${f.code}>">
        <span class="ts-label"><strong>${f.label}</strong> — ${escapeHtml(f.desc)}<br>${f.code === 'R' ? `<span data-ts-rel="${date.getTime()}">${escapeHtml(tsPreviewText(date, f.code))}</span>` : escapeHtml(tsPreviewText(date, f.code))}</span>
        <span class="ts-code">&lt;t:${unix}:${f.code}&gt;</span>
      </button>
    `).join('');

    renderTzRows(date);
  }
  timestampInput?.addEventListener('input', renderTimestamps);
  // "Relative" is measured from right now, so it has to keep moving while the page stays open. Only the text
  // is updated (not the buttons), so keyboard focus and text selection are never disturbed.
  function refreshRelativeTimes(){
    document.querySelectorAll('[data-ts-rel]').forEach(el => {
      const next = relativeTimeText(new Date(Number(el.dataset.tsRel)));
      if (el.textContent !== next) el.textContent = next;
    });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRelativeTimes(); });
  timestampGrid?.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-ts-copy]');
    if (!row) return;
    if (!(await copyText(row.dataset.tsCopy))) return;
    showToast('Copied!');
  });
  tsHighlightRow?.addEventListener('click', async () => {
    const date = getTimestampDate();
    if (date) { if (!(await copyText(String(Math.floor(date.getTime()/1000))))) return; showToast('Copied!'); }
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
  // Browsers leave plain UTC out of their zone lists, but it is the one people most often want to compare against.
  if (!ALL_TIMEZONES.includes('UTC')) ALL_TIMEZONES = [...ALL_TIMEZONES, 'UTC'];

  // Browsers still report some zones under their old names (Chrome says Asia/Calcutta for a Kolkata clock).
  // Only the label changes; the stored zone name stays whatever the browser gave.
  const TZ_LABELS = { Calcutta:'Kolkata', Kiev:'Kyiv', Katmandu:'Kathmandu', Rangoon:'Yangon', Saigon:'Ho Chi Minh City', Godthab:'Nuuk', Faeroe:'Faroe' };
  function tzDisplayName(tz){
    const parts = tz.split('/');
    const city = (parts[parts.length - 1] || tz).replace(/_/g, ' ');
    return TZ_LABELS[city] || city;
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

  // Saved zones are untrusted: keep only real, unique IANA names (at most 24). Anything unreadable is parked
  // under a _backup key rather than thrown away, and the page falls back to the browser's own zone.
  function isValidZone(tz){
    if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
  }
  function cleanZones(list){ return [...new Set((Array.isArray(list) ? list : []).filter(isValidZone))].slice(0, 24); }
  function loadSavedZones(){
    const raw = lsafe.get('lu_timezones');
    if (raw) {
      let arr = null;
      try { arr = JSON.parse(raw); } catch { arr = null; }
      const clean = cleanZones(arr);
      if (!Array.isArray(arr) || clean.length !== arr.length) lsafe.set('lu_timezones_backup', raw);
      if (clean.length) return clean;
    }
    return [BROWSER_TZ];
  }
  function saveZones(){
    if (!lsafe.set('lu_timezones', JSON.stringify(tzState.zones))) warnStorage('your time zones');
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
      .filter(tz => (tz.replace(/_/g, ' ') + ' ' + tzDisplayName(tz)).toLowerCase().includes(q))   // so "Kolkata" finds Asia/Calcutta
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
  // Rebuilding the grid would drop keyboard focus from the button being used, so while the person is working inside
  // it (or the timezone list) only the relative text is refreshed and the rows are left alone.
  setInterval(() => {
    if (!timestampInput?.value || document.hidden) return;
    const active = document.activeElement;
    const busy = active && [timestampGrid, tzRowsContainer, tzSearchResults, tsHighlightRow].some(box => box && box.contains(active));
    if (busy) refreshRelativeTimes(); else renderTimestamps();
  }, 30000);

  // 3. Role color converter
  const roleColorSwatch = document.getElementById('role-color-swatch');
  const roleColorHex = document.getElementById('role-color-hex');
  const roleColorOutput = document.getElementById('role-color-output');
  const roleColorPreview = document.getElementById('role-color-preview');
  function renderRoleColor(){
    // "22d3ee" is a perfectly good 6-digit hex colour, so the leading # is optional.
    let v = roleColorHex.value.trim();
    if (/^[0-9a-fA-F]{6}$/.test(v)) v = '#' + v;
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) {
      roleColorOutput.innerHTML = v ? `<span class="err">Enter a 6-digit hex color, like #22D3EE.</span>` : `<span class="muted">Type a 6-digit hex color, like #22D3EE.</span>`;
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
    const typed = roleColorHex.value.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(typed)) roleColorSwatch.value = typed.startsWith('#') ? typed : '#' + typed;
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
    const raw = lengthInput.value;
    const len = charLen(raw);
    const lines = raw.length ? raw.split('\n').length : 0;
    const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
    // Every row is "label: value" with a real separator in the text (hidden visually), so the label and the
    // number never run together when the text is read aloud or copied.
    const row = (label, value, cls) => `<div class="length-row${cls ? ' ' + cls : ''}"><span class="length-label">${label}</span><span class="length-sep">: </span><span class="length-value">${value}</span></div>`;
    const bars = LENGTH_LIMITS.map(l => {
      const pct = Math.min(100, (len / l.max) * 100);
      const over = len > l.max;
      return `
        <div class="length-bar-item${over ? ' is-over' : ''}">
          ${row(l.label, `${len} / ${l.max}${over ? ` · over by ${len - l.max}` : ''}`)}
          <div class="length-bar-track"><div class="length-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
    lengthBars.innerHTML = bars
      + `<div class="length-stats">${row('Characters', len)}${row('Words', words)}${row('Lines', lines)}</div>`;
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
      .replace(/(^|[^\w])_([^_\n]+?)_(?!\w)/g, '$1$2')   // _italic_ only at word edges: snake_case_name stays as it is
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
  document.getElementById('copy-cleaner')?.addEventListener('click', async () => {
    if (!(await copyText(cleanerOutput.textContent))) return;
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
  emojiTagOutput?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copyUrl))) return;
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
  // Discord has permission bits above 31 that this grid has no checkbox for. They are remembered when an
  // integer is typed or pasted, and added back when the number is rebuilt, so ticking a box never drops them.
  const PERM_KNOWN_MASK = PERMISSIONS.reduce((m, [bit]) => m | (1n << BigInt(bit)), 0n);
  let permExtra = 0n;
  let permNote = null;
  function setPermNote(msg, isError){
    if (!permIntegerInput) return;
    if (!permNote) {
      permNote = document.createElement('p');
      permNote.className = 'perm-note';
      permNote.setAttribute('role', 'status');
      permIntegerInput.insertAdjacentElement('afterend', permNote);
    }
    permNote.textContent = msg;
    permNote.hidden = !msg;
    permNote.classList.toggle('is-error', !!isError);
    permIntegerInput.setAttribute('aria-invalid', isError ? 'true' : 'false');
  }
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
    return total | permExtra;
  }
  function syncPermsFromCheckboxes(){
    if (permSyncing) return;
    permSyncing = true;
    permIntegerInput.value = permsToInteger().toString();
    setPermNote(permExtra ? 'This number also has permission bits this calculator has no checkbox for. They are kept as they are.' : '', false);
    permSyncing = false;
  }
  function syncCheckboxesFromInteger(){
    if (permSyncing) return;
    const raw = permIntegerInput.value.trim();
    if (!raw) { permExtra = 0n; setPermNote('', false); permGrid.querySelectorAll('[data-perm-bit]').forEach(cb => { cb.checked = false; }); return; }
    if (!/^\d+$/.test(raw)) { setPermNote('Enter a whole number, like 8 or 2251673153.', true); return; }
    permSyncing = true;
    const value = BigInt(raw);
    permExtra = value & ~PERM_KNOWN_MASK;
    setPermNote(permExtra ? 'This number also has permission bits this calculator has no checkbox for. They are kept as they are.' : '', false);
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
    if (!isSnowflake(id)) { cdnOutput.innerHTML = `<span class="err">Enter a valid ID (15-20 digits).</span>`; return; }
    let url;
    // Hashes are letters and digits (animated ones start with a_). Anything else would end up inside the URL.
    if (hash && !/^(?:a_)?[A-Za-z0-9]{1,64}$/.test(hash)) { cdnOutput.innerHTML = `<span class="err">An asset hash is letters and numbers only, like 8342729096ea3675442027381ff50dfe.</span>`; return; }
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
      <button type="button" class="copy-link" data-copy-url="${escapeHtml(url)}">Copy URL</button>`;
  }
  [cdnIdInput, cdnHashInput, cdnTypeSelect, cdnSizeSelect].forEach(el => el?.addEventListener('input', renderCdn));
  cdnOutput?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copyUrl))) return;
    showToast('Copied!');
  });

  /* ============ Discord Tools search ============ */
  const toolSearchInput = document.getElementById('tool-search-input');
  const toolSearchEmpty = document.getElementById('tool-search-empty');
  const allToolGroups = document.querySelectorAll('.discord-tools .tool-group');
  function filterTools(){
    const q = toolSearchInput.value.trim().toLowerCase();
    if (q && discordSection.classList.contains('tool-focus')) showAllTools(false);
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
    syncToolNavFilter();
  }
  toolSearchInput?.addEventListener('input', filterTools);

  /* ============ Discord Tools sidebar navigation ============ */
  // The sidebar lists every Discord tool. Picking one focuses that panel in the workspace;
  // the other panels are only hidden (not removed), so whatever you typed in them is kept.
  const discordSection = document.getElementById('discord-tools');
  const toolNav = document.getElementById('tool-nav');
  const toolNavToggle = document.getElementById('tool-nav-toggle');
  const toolNavCurrent = document.getElementById('tool-nav-current');
  const toolNavLinks = [...document.querySelectorAll('#tool-nav a[data-tool]')];
  const toolPanels = [...document.querySelectorAll('.discord-tools .tool-grid > .panel')];
  const toolPanelById = (id) => toolPanels.find(p => p.id === id);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setToolNavOpen(open){
    toolNav?.classList.toggle('open', open);
    toolNavToggle?.setAttribute('aria-expanded', String(open));
  }
  function markToolNav(id){
    toolNavLinks.forEach(a => {
      const on = (a.dataset.tool || '') === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      if (on && toolNavCurrent) toolNavCurrent.textContent = a.textContent.trim();
    });
  }
  function scrollToWorkspace(){
    // On phones the menu bar sits above the search box, so it is the top of the workspace there.
    const menuBar = toolNavToggle && getComputedStyle(toolNavToggle).display !== 'none' ? toolNavToggle : null;
    (menuBar || document.querySelector('.tool-search-row'))?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function showTool(id, scroll){
    const panel = toolPanelById(id);
    if (!panel) return false;
    discordSection.classList.add('tool-focus');
    toolPanels.forEach(p => p.classList.toggle('is-active-tool', p === panel));
    document.querySelectorAll('.discord-tools .tool-group').forEach(g => g.classList.toggle('no-active', !g.contains(panel)));
    markToolNav(id);
    if (scroll) {
      scrollToWorkspace();
      panel.setAttribute('tabindex', '-1');
      panel.focus({ preventScroll: true });
    }
    return true;
  }
  function showAllTools(scroll){
    discordSection.classList.remove('tool-focus');
    toolPanels.forEach(p => p.classList.remove('is-active-tool'));
    document.querySelectorAll('.discord-tools .tool-group').forEach(g => g.classList.remove('no-active'));
    markToolNav('');
    if (scroll) scrollToWorkspace();
  }
  // Searching works across every tool, so it always leaves single-tool view first.
  function syncToolNavFilter(){
    toolNavLinks.forEach(a => {
      if (!a.dataset.tool) return;
      const p = toolPanelById(a.dataset.tool);
      a.parentElement.hidden = !!p && p.style.display === 'none';
    });
    document.querySelectorAll('#tool-nav .tool-nav-group').forEach(g => {
      g.hidden = ![...g.querySelectorAll('li')].some(li => !li.hidden);
    });
  }
  toolNav?.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-tool]');
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.tool;
    // Close the phone menu first: it sits above the tools, so collapsing it after the scroll has been
    // worked out would shift the page and leave the chosen tool above the screen.
    setToolNavOpen(false);
    if (toolSearchInput?.value) { toolSearchInput.value = ''; filterTools(); }
    if (id) {
      history.pushState(null, '', '#' + id);
      showTool(id, true);
    } else {
      history.pushState(null, '', '#discord-tools');
      showAllTools(true);
    }
  });
  toolNavToggle?.addEventListener('click', () => setToolNavOpen(!toolNav.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toolNav?.classList.contains('open')) { setToolNavOpen(false); toolNavToggle?.focus(); } });
  // Enter in the tool search opens the first match.
  toolSearchInput?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const first = toolPanels.find(p => p.style.display !== 'none');
    if (!first || !toolSearchInput.value.trim()) return;
    e.preventDefault();
    toolSearchInput.value = ''; filterTools();
    history.pushState(null, '', '#' + first.id);
    showTool(first.id, true);
  });
  // Links like #tool-timestamp (Popular chips, bookmarks, back/forward) land on the right tool.
  function applyToolHash(scroll){
    const id = location.hash.slice(1);
    if (toolPanelById(id)) showTool(id, scroll);
    else if (id === 'discord-tools') showAllTools(false);
  }
  window.addEventListener('hashchange', () => applyToolHash(true));
  if (toolPanelById(location.hash.slice(1))) setTimeout(() => applyToolHash(true), 60);

  /* ============ Embed Builder ============ */
  const embedInputs = {
    author: document.getElementById('embed-author-input'),
    authorUrl: document.getElementById('embed-author-url-input'),
    authorIcon: document.getElementById('embed-author-icon-input'),
    title: document.getElementById('embed-title-input'),
    url: document.getElementById('embed-url-input'),
    description: document.getElementById('embed-description-input'),
    colorSwatch: document.getElementById('embed-color-swatch'),
    colorHex: document.getElementById('embed-color-hex'),
    thumbnail: document.getElementById('embed-thumbnail-input'),
    image: document.getElementById('embed-image-input'),
    footer: document.getElementById('embed-footer-input'),
    footerIcon: document.getElementById('embed-footer-icon-input'),
    timestampToggle: document.getElementById('embed-timestamp-toggle'),
  };
  const embedMessageContent = document.getElementById('embed-message-content');
  const embedFieldsList = document.getElementById('embed-fields-list');
  const embedPreviewEl = document.getElementById('embed-preview');
  const embedContentPreviewEl = document.getElementById('embed-content-preview');
  const embedPreviewTimeEl = document.getElementById('embed-preview-time');
  const embedWarningsEl = document.getElementById('embed-warnings');
  const sendStatusEl = document.getElementById('send-status');
  const sendBtn = document.getElementById('send-to-discord');
  const webhookUrlInput = document.getElementById('embed-webhook-url');
  let embedSending = false;
  const embedJsonOutput = document.getElementById('embed-json-output');
  const messagePreviewBox = document.getElementById('message-preview-box');
  const webhookPayloadOutput = document.getElementById('webhook-payload-output');
  let embedFields = [];
  let embedFieldIdSeq = 0;
  // The Webhook builder preview is defined further down; it registers itself here so an embed edit can refresh it.
  let webhookPreviewHook = null;

  const EMBED_LIMITS = {
    title: 256, description: 4096, fieldName: 256, fieldValue: 1024,
    footer: 2048, author: 256, maxFields: 25, totalChars: 6000,
  };

  function addEmbedFieldRow(name = '', value = '', inline = false){
    const id = ++embedFieldIdSeq;
    embedFields.push({ id, name, value, inline });
    renderEmbedFields();
  }
  function renderEmbedFields(){
    if (!embedFieldsList) return;
    embedFieldsList.innerHTML = embedFields.map((f, idx) => `
      <div class="embed-field-row" data-field-id="${f.id}">
        <div class="field-inputs">
          <input type="text" class="text-input field-name" placeholder="Field name" value="${escapeHtml(f.name)}" data-field-part="name" maxlength="256">
          <input type="text" class="text-input field-value" placeholder="Field value" value="${escapeHtml(f.value)}" data-field-part="value" maxlength="1024">
        </div>
        <div class="field-controls">
          <label class="field-inline-toggle"><input type="checkbox" data-field-part="inline" ${f.inline ? 'checked' : ''}> Inline</label>
          <button type="button" class="field-move" data-move-field="up" ${idx === 0 ? 'disabled' : ''} aria-label="Move field up">▲</button>
          <button type="button" class="field-move" data-move-field="down" ${idx === embedFields.length - 1 ? 'disabled' : ''} aria-label="Move field down">▼</button>
          <button type="button" class="embed-field-remove" data-remove-field="${f.id}" aria-label="Remove field">×</button>
        </div>
      </div>
    `).join('');
  }
  embedFieldsList?.addEventListener('input', (e) => {
    const row = e.target.closest('[data-field-id]');
    if (!row || !e.target.dataset.fieldPart || e.target.type === 'checkbox') return;
    const field = embedFields.find(f => f.id === Number(row.dataset.fieldId));
    if (!field) return;
    field[e.target.dataset.fieldPart] = e.target.value;
    renderEmbedOutput();
  });
  embedFieldsList?.addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    const row = e.target.closest('[data-field-id]');
    if (!row) return;
    const field = embedFields.find(f => f.id === Number(row.dataset.fieldId));
    if (!field) return;
    field.inline = e.target.checked;
    renderEmbedOutput();
  });
  embedFieldsList?.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-remove-field]');
    if (removeBtn) {
      embedFields = embedFields.filter(f => f.id !== Number(removeBtn.dataset.removeField));
      renderEmbedFields();
      renderEmbedOutput();
      return;
    }
    const moveBtn = e.target.closest('[data-move-field]');
    if (moveBtn) {
      const row = moveBtn.closest('[data-field-id]');
      const idx = embedFields.findIndex(f => f.id === Number(row.dataset.fieldId));
      const swapWith = moveBtn.dataset.moveField === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= embedFields.length) return;
      [embedFields[idx], embedFields[swapWith]] = [embedFields[swapWith], embedFields[idx]];
      renderEmbedFields();
      renderEmbedOutput();
    }
  });
  document.getElementById('embed-add-field')?.addEventListener('click', () => addEmbedFieldRow());

  function currentEmbedObject(){
    const embed = {};
    if (embedInputs.author.value.trim()) {
      embed.author = { name: embedInputs.author.value.trim() };
      if (embedInputs.authorUrl.value.trim()) embed.author.url = embedInputs.authorUrl.value.trim();
      if (embedInputs.authorIcon.value.trim()) embed.author.icon_url = embedInputs.authorIcon.value.trim();
    }
    if (embedInputs.title.value.trim()) embed.title = embedInputs.title.value.trim();
    if (embedInputs.url.value.trim()) embed.url = embedInputs.url.value.trim();
    if (embedInputs.description.value.trim()) embed.description = embedInputs.description.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(embedInputs.colorHex.value.trim())) embed.color = parseInt(embedInputs.colorHex.value.trim().slice(1), 16);
    if (embedInputs.thumbnail.value.trim()) embed.thumbnail = { url: embedInputs.thumbnail.value.trim() };
    if (embedInputs.image.value.trim()) embed.image = { url: embedInputs.image.value.trim() };
    if (embedInputs.footer.value.trim()) {
      embed.footer = { text: embedInputs.footer.value.trim() };
      if (embedInputs.footerIcon.value.trim()) embed.footer.icon_url = embedInputs.footerIcon.value.trim();
    }
    if (embedInputs.timestampToggle.checked) embed.timestamp = new Date().toISOString();
    const fields = embedFields.filter(f => f.name.trim() || f.value.trim()).map(f => {
      const field = { name: f.name || '\u200b', value: f.value || '\u200b' };
      if (f.inline) field.inline = true;
      return field;
    });
    if (fields.length) embed.fields = fields;
    return embed;
  }

  function validateEmbed(embed){
    const warnings = [];
    // Counted in Unicode code points, the same way as the Message length tool.
    const len = (v) => charLen(v || '');
    const check = (label, value, max) => { const n = len(value); if (n > max) warnings.push(`${label} is ${n} / ${max} characters.`); };
    check('Title', embed.title, EMBED_LIMITS.title);
    check('Description', embed.description, EMBED_LIMITS.description);
    check('Footer text', embed.footer?.text, EMBED_LIMITS.footer);
    check('Author name', embed.author?.name, EMBED_LIMITS.author);
    if (embed.fields?.length > EMBED_LIMITS.maxFields) warnings.push(`${embed.fields.length} / ${EMBED_LIMITS.maxFields} fields — Discord will reject extras.`);
    (embed.fields || []).forEach((f, i) => {
      check(`Field ${i + 1} name`, f.name, EMBED_LIMITS.fieldName);
      check(`Field ${i + 1} value`, f.value, EMBED_LIMITS.fieldValue);
    });
    const total = len(embed.title) + len(embed.description) + len(embed.footer?.text) + len(embed.author?.name)
      + (embed.fields || []).reduce((sum, f) => sum + len(f.name) + len(f.value), 0);
    if (total > EMBED_LIMITS.totalChars) warnings.push(`Combined embed text is ${total} / ${EMBED_LIMITS.totalChars} characters — Discord's overall limit.`);
    return warnings;
  }

  function renderEmbedOutput(){
    if (!embedPreviewEl) return;
    if (!embedSending && sendStatusEl) sendStatusEl.hidden = true;
    const embed = currentEmbedObject();
    embedJsonOutput.textContent = JSON.stringify(embed, null, 2);

    const warnings = validateEmbed(embed);
    if (embedWarningsEl) {
      embedWarningsEl.hidden = warnings.length === 0;
      if (warnings.length) embedWarningsEl.innerHTML = `<ul>${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`;
    }

    const color = /^#[0-9a-fA-F]{6}$/.test(embedInputs.colorHex.value.trim()) ? embedInputs.colorHex.value.trim() : 'var(--accent)';
    embedPreviewEl.style.borderLeftColor = color;
    let html = '';
    if (embed.author) {
      const icon = embed.author.icon_url ? `<img class="ep-author-icon" src="${escapeHtml(embed.author.icon_url)}" alt="" onerror="this.style.display='none'">` : '';
      const nameHtml = embed.author.url ? `<a href="${escapeHtml(embed.author.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(embed.author.name)}</a>` : escapeHtml(embed.author.name);
      html += `<div class="ep-author">${icon}${nameHtml}</div>`;
    }
    if (embed.thumbnail) html += `<img class="ep-thumb" src="${escapeHtml(embed.thumbnail.url)}" alt="" onerror="this.style.display='none'">`;
    if (embed.title) {
      const titleHtml = embed.url ? `<a href="${escapeHtml(embed.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(embed.title)}</a>` : escapeHtml(embed.title);
      html += `<div class="ep-title">${titleHtml}</div>`;
    }
    if (embed.description) html += `<div class="ep-desc">${escapeHtml(embed.description)}</div>`;
    if (embed.fields?.length) {
      const allInline = embed.fields.every(f => f.inline);
      html += `<div class="ep-fields ${allInline ? '' : 'ep-fields-stack'}">${embed.fields.map(f => `<div class="ep-field"><div class="ep-field-name">${escapeHtml(f.name)}</div><div class="ep-field-value">${escapeHtml(f.value)}</div></div>`).join('')}</div>`;
    }
    if (embed.image) html += `<img class="ep-image" src="${escapeHtml(embed.image.url)}" alt="" onerror="this.style.display='none'">`;
    if (embed.footer || embed.timestamp) {
      const icon = embed.footer?.icon_url ? `<img class="ep-footer-icon" src="${escapeHtml(embed.footer.icon_url)}" alt="" onerror="this.style.display='none'">` : '';
      const parts = [embed.footer?.text, embed.timestamp ? new Date(embed.timestamp).toLocaleString() : null].filter(Boolean);
      html += `<div class="ep-footer">${icon}${escapeHtml(parts.join(' · '))}</div>`;
    }
    embedPreviewEl.innerHTML = html;

    if (embedContentPreviewEl) embedContentPreviewEl.innerHTML = embedMessageContent.value ? renderDiscordMarkdown(embedMessageContent.value) : '';
    if (embedPreviewTimeEl) embedPreviewTimeEl.textContent = 'Today at ' + new Date().toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });

    renderMessagePreview();
    if (webhookPreviewHook) webhookPreviewHook();
    renderWebhookPayload();
  }
  Object.values(embedInputs).forEach(el => el?.addEventListener('input', renderEmbedOutput));
  embedMessageContent?.addEventListener('input', renderEmbedOutput);
  embedInputs.colorSwatch?.addEventListener('input', () => { embedInputs.colorHex.value = embedInputs.colorSwatch.value; renderEmbedOutput(); });
  embedInputs.colorHex?.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(embedInputs.colorHex.value.trim())) embedInputs.colorSwatch.value = embedInputs.colorHex.value.trim();
  });
  document.getElementById('copy-embed-json')?.addEventListener('click', async () => {
    if (!(await copyText(embedJsonOutput.textContent))) return;
    showToast('Copied!');
  });
  // Single place the webhook payload is assembled — used by both Copy Webhook Payload and Send.
  // A color-only embed counts as empty (Discord rejects it), so it's left out.
  const hasRealEmbed = (embed) => Object.keys(embed).some(k => k !== 'color');
  function buildEmbedWebhookPayload(){
    const embed = currentEmbedObject();
    const hasEmbed = hasRealEmbed(embed);
    const hasContent = embedMessageContent.value.trim().length > 0;
    const payload = {};
    if (hasContent) payload.content = embedMessageContent.value;
    if (hasEmbed) payload.embeds = [embed];
    const senderName = (document.getElementById('embed-sender-name')?.value || '').trim();
    const senderAvatar = (document.getElementById('embed-sender-avatar')?.value || '').trim();
    if (senderName) payload.username = senderName;
    if (senderAvatar) payload.avatar_url = senderAvatar;
    return { payload, embed, hasEmbed, hasContent, senderName, senderAvatar };
  }
  document.getElementById('copy-embed-webhook-payload')?.addEventListener('click', async () => {
    if (!(await copyText(JSON.stringify(buildEmbedWebhookPayload().payload, null, 2)))) return;
    showToast('Copied!');
  });

  /* ---- Send to Discord (the webhook URL is never stored, logged, or kept outside this handler) ---- */
  const DISCORD_WEBHOOK_HOSTS = ['discord.com', 'canary.discord.com', 'ptb.discord.com', 'discordapp.com'];
  function parseWebhookUrl(raw, threadId){
    let u;
    try { u = new URL(raw.trim()); } catch { return null; }
    if (u.protocol !== 'https:' || !DISCORD_WEBHOOK_HOSTS.includes(u.hostname)) return null;
    if (!/^\/api\/(v\d+\/)?webhooks\/\d{15,22}\/[A-Za-z0-9_-]{20,}\/?$/.test(u.pathname)) return null;
    // ?wait=true makes Discord answer 200 once the message actually exists, so success is real
    return u.origin + u.pathname.replace(/\/$/, '') + '?wait=true' + (threadId ? '&thread_id=' + threadId : '');
  }
  function invalidEmbedUrls(embed){
    const checks = [
      ['Title link', embed.url], ['Author link', embed.author?.url], ['Author icon', embed.author?.icon_url],
      ['Thumbnail', embed.thumbnail?.url], ['Image', embed.image?.url], ['Footer icon', embed.footer?.icon_url],
    ];
    return checks.filter(([, v]) => v && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(v)).map(([name]) => name);
  }
  function setSendStatus(kind, msg){
    sendStatusEl.className = 'send-status status-' + kind;
    sendStatusEl.textContent = msg;
    sendStatusEl.hidden = false;
  }
  function firstDiscordFieldError(node, path = []){
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node._errors) && node._errors.length) return { path, message: node._errors[0].message };
    for (const key of Object.keys(node)) {
      if (key === '_errors') continue;
      const found = firstDiscordFieldError(node[key], [...path, key]);
      if (found) return found;
    }
    return null;
  }
  async function describeDiscordError(res){
    let body = null;
    try { body = await res.json(); } catch {}
    if (res.status === 429) {
      const secs = Math.ceil(Number(body?.retry_after) || 0);
      return secs ? `Discord is rate limiting this webhook — try again in about ${secs}s.` : 'Discord is rate limiting this webhook — wait a moment and try again.';
    }
    if (res.status === 401 || res.status === 404) return "Discord doesn't recognize that webhook — it may have been deleted, or the URL is incomplete.";
    if (res.status === 400) {
      const detail = firstDiscordFieldError(body?.errors);
      if (detail) return `Discord rejected the message — ${detail.path.join('.') || 'payload'}: ${detail.message}`;
      return `Discord rejected the message${body?.message ? ' — ' + body.message : '.'}`;
    }
    if (res.status >= 500) return `Discord had a server problem (${res.status}). Try again shortly.`;
    return `Discord returned an unexpected response (${res.status}).`;
  }
  async function sendEmbedToDiscord(){
    if (embedSending) return;
    if (!webhookUrlInput.value.trim()) { setSendStatus('err', 'Paste a Discord webhook URL first.'); return; }
    const threadId = (document.getElementById('embed-thread-id')?.value || '').trim();
    if (threadId && !/^\d{15,22}$/.test(threadId)) { setSendStatus('err', 'Thread ID should be the numeric ID of the thread (15–22 digits).'); return; }
    const target = parseWebhookUrl(webhookUrlInput.value, threadId);
    if (!target) { setSendStatus('err', "That doesn't look like a Discord webhook URL. It should look like https://discord.com/api/webhooks/…"); return; }

    const { payload, embed, hasEmbed, hasContent, senderName, senderAvatar } = buildEmbedWebhookPayload();
    if (senderName && /clyde|discord/i.test(senderName)) { setSendStatus('err', 'Discord does not allow "discord" or "clyde" in a webhook name.'); return; }
    if (senderAvatar && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(senderAvatar)) { setSendStatus('err', 'Bot avatar: Discord needs a full http(s) URL.'); return; }
    if (!hasEmbed && !hasContent) { setSendStatus('err', 'Nothing to send yet — add message content or some embed content.'); return; }
    if (hasContent && [...payload.content].length > 2000) { setSendStatus('err', `Message content is ${[...payload.content].length} / 2000 characters.`); return; }
    if (hasEmbed) {
      const problems = validateEmbed(embed);
      if (problems.length) { setSendStatus('err', `Over Discord's limits — ${problems[0]}${problems.length > 1 ? ` (+${problems.length - 1} more)` : ''}`); return; }
      const badUrls = invalidEmbedUrls(embed);
      if (badUrls.length) { setSendStatus('err', `${badUrls.join(', ')}: Discord needs a full http(s) URL.`); return; }
    }

    embedSending = true;
    const idleLabel = sendBtn.textContent;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    setSendStatus('pending', 'Sending…');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(target, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      if (res.ok) setSendStatus('ok', 'Sent — Discord accepted the message.');
      else setSendStatus('err', await describeDiscordError(res));
    } catch (err) {
      if (err && err.name === 'AbortError') setSendStatus('err', "Discord didn't answer in time, so delivery isn't confirmed. Check the channel before retrying.");
      else setSendStatus('err', "Couldn't reach Discord. Check your connection — an extension or network filter may also be blocking the request.");
    } finally {
      clearTimeout(timer);
      embedSending = false;
      sendBtn.disabled = false;
      sendBtn.textContent = idleLabel;
    }
  }
  sendBtn?.addEventListener('click', sendEmbedToDiscord);
  function clearEmbedBuilder(){
    Object.values(embedInputs).forEach(el => {
      if (!el) return;
      if (el.type === 'checkbox') el.checked = false;
      else if (el.id !== 'embed-color-hex' && el.id !== 'embed-color-swatch') el.value = '';
    });
    embedMessageContent.value = '';
    embedFields = [];
    renderEmbedFields();
    renderEmbedOutput();
  }
  document.getElementById('clear-embed')?.addEventListener('click', clearEmbedBuilder);
  document.getElementById('reset-embed')?.addEventListener('click', () => {
    clearEmbedBuilder();
    embedInputs.colorHex.value = '#22D3EE';
    embedInputs.colorSwatch.value = '#22D3EE';
    renderEmbedOutput();
  });
  if (embedInputs.colorHex) embedInputs.colorHex.value = '#22D3EE';
  if (embedInputs.colorSwatch) embedInputs.colorSwatch.value = '#22D3EE';
  renderEmbedOutput();

  /* ============ Markdown preview ============ */
  const mdPreviewInput = document.getElementById('md-preview-input');
  const mdPreviewOutput = document.getElementById('md-preview-output');
  /* ============ Shared Discord Markdown renderer ============ */
  /* Used by both the Markdown preview tool and the Message/Webhook previews,
     so there's exactly one implementation to keep correct (a prior bug came
     from these two drifting out of sync). Supports headings, lists, quotes,
     code, inline emphasis, spoilers, and links (masked + bare URLs). */
  function renderDiscordMarkdown(raw){
    const lines = String(raw == null ? '' : raw).split('\n');
    const blocks = [];
    let i = 0;
    // Finds the closing fence of a code block. Returns the index of the line that holds it, or -1.
    const findFenceEnd = (from) => { for (let k = from; k < lines.length; k++) if (lines[k].includes('```')) return k; return -1; };
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('```')) {
        const rest = line.slice(3);
        const closeOnSame = rest.indexOf('```');
        if (closeOnSame >= 0) {
          // A fenced block opened and closed on one line. Only that part is code; the rest is ordinary text.
          blocks.push({ type:'code', text: rest.slice(0, closeOnSame) });
          const tail = rest.slice(closeOnSame + 3);
          if (tail.trim()) blocks.push({ type:'p', text: tail });
          i++; continue;
        }
        const end = findFenceEnd(i + 1);
        if (end < 0) { blocks.push({ type:'p', text: line }); i++; continue; }   // never closed: Discord shows it as plain text
        const body = lines.slice(i + 1, end + 1);
        const last = body.pop();
        const before = last.slice(0, last.indexOf('```'));
        const tail = last.slice(last.indexOf('```') + 3);
        if (before) body.push(before);
        // The first line is a language name only when it is a single word and more lines follow it.
        const code = /^[\w+#.-]+$/.test(rest.trim()) ? body : [rest, ...body].filter((l, n) => n > 0 || l !== '');
        blocks.push({ type:'code', text: code.join('\n') });
        if (tail.trim()) blocks.push({ type:'p', text: tail });
        i = end + 1; continue;
      }
      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) { blocks.push({ type:'heading', level: h[1].length, text: h[2] }); i++; continue; }
      if (line.startsWith('>>> ')) {   // one block quote that runs to the end of the message
        blocks.push({ type:'quote', lines: [line.slice(4), ...lines.slice(i + 1)] });
        i = lines.length; continue;
      }
      if (/^>( |$)/.test(line)) {
        const q = [];
        while (i < lines.length && /^>( |$)/.test(lines[i]) && !lines[i].startsWith('>>> ')) { q.push(lines[i].replace(/^> ?/, '')); i++; }
        blocks.push({ type:'quote', lines: q }); continue;
      }
      const ul = line.match(/^[-*]\s+(.*)$/);
      if (ul) {
        const items = [ul[1]]; i++;
        while (i < lines.length) { const m2 = lines[i].match(/^[-*]\s+(.*)$/); if (!m2) break; items.push(m2[1]); i++; }
        blocks.push({ type:'ul', items }); continue;
      }
      const ol = line.match(/^\d+\.\s+(.*)$/);
      if (ol) {
        const items = [ol[1]]; i++;
        while (i < lines.length) { const m2 = lines[i].match(/^\d+\.\s+(.*)$/); if (!m2) break; items.push(m2[1]); i++; }
        blocks.push({ type:'ol', items }); continue;
      }
      blocks.push({ type:'p', text: line }); i++;
    }

    // Emphasis on text that is already HTML-escaped and has code, escapes and links set aside.
    function emphasis(html){
      return html
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<u>$1</u>')
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        .replace(/(^|[^*])\*(?![\s*])([^*]*?[^\s*])\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/(^|[^\w])_(?![\s_])([^_]*?[^\s_])_(?!\w)/g, '$1<em>$2</em>')
        .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" data-spoiler>$1</span>');
    }

    function inline(str){
      const stash = [];
      const hold = (snippet) => { stash.push(snippet); return `\u0000${stash.length - 1}\u0000`; };
      const s = str.replace(/\u0000/g, '');
      // Pass 1, left to right: a backslash makes the next symbol literal, and a run of backticks opens a code span
      // that ends at the next run of the same length. Nothing inside either is ever formatted.
      let text = '';
      for (let p = 0; p < s.length;) {
        const ch = s[p];
        if (ch === '\\' && p + 1 < s.length && /[^0-9A-Za-z\s]/.test(s[p + 1])) { text += hold(escapeHtml(s[p + 1])); p += 2; continue; }
        if (ch === '`') {
          let n = 1; while (s[p + n] === '`') n++;
          let j = p + n, close = -1;
          while (j < s.length) {
            const k = s.indexOf('`', j);
            if (k < 0) break;
            let m = 1; while (s[k + m] === '`') m++;
            if (m === n) { close = k; break; }
            j = k + m;
          }
          if (close > p + n) {
            let body = s.slice(p + n, close);
            if (n > 1 && /^ .*[^ ].* $/.test(body)) body = body.slice(1, -1);
            text += hold(`<code>${escapeHtml(body)}</code>`);
            p = close + n; continue;
          }
          text += s.slice(p, p + n); p += n; continue;
        }
        text += ch; p++;
      }
      let html = escapeHtml(text);
      // Trailing punctuation belongs to the sentence, not to the link.
      const linkOut = (url) => {
        let tail = '';
        for (;;) {
          const m = url.match(/(?:[.,;:!?*_~|]|&quot;|&#39;|&gt;)$/);
          if (m) { tail = m[0] + tail; url = url.slice(0, -m[0].length); continue; }
          if (url.endsWith(')') && !url.includes('(')) { tail = ')' + tail; url = url.slice(0, -1); continue; }
          break;
        }
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${tail}`;
      };
      html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
        (_, label, url) => hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${emphasis(label)}</a>`));
      html = html.replace(/&lt;(https?:\/\/(?:(?!&gt;)[^\s])+)&gt;/g,
        (_, url) => hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`));
      html = html.replace(/https?:\/\/(?:(?!&lt;|&gt;)[^\s<])+/g, (m) => {
        const out = linkOut(m);
        const k = out.indexOf('</a>') + 4;
        return hold(out.slice(0, k)) + out.slice(k);
      });
      html = emphasis(html);
      for (let guard = 0; guard < 4 && /\u0000\d+\u0000/.test(html); guard++) {
        html = html.replace(/\u0000(\d+)\u0000/g, (_, idx) => stash[Number(idx)]);
      }
      return html;
    }

    return blocks.map(b => {
      if (b.type === 'heading') return `<div class="md-h${b.level}">${inline(b.text)}</div>`;
      if (b.type === 'quote') return `<blockquote>${b.lines.map(inline).join('<br>')}</blockquote>`;
      if (b.type === 'ul') return `<ul>${b.items.map(t => `<li>${inline(t)}</li>`).join('')}</ul>`;
      if (b.type === 'ol') return `<ol>${b.items.map(t => `<li>${inline(t)}</li>`).join('')}</ol>`;
      if (b.type === 'code') return `<pre>${escapeHtml(b.text)}</pre>`;
      return b.text ? `<p>${inline(b.text)}</p>` : '<br>';
    }).join('');
  }

  function renderMarkdownPreview(){
    if (!mdPreviewOutput) return;
    mdPreviewOutput.innerHTML = renderDiscordMarkdown(mdPreviewInput.value);
  }
  mdPreviewInput?.addEventListener('input', renderMarkdownPreview);
  mdPreviewOutput?.addEventListener('click', (e) => {
    const spoiler = e.target.closest('[data-spoiler]');
    if (spoiler) spoiler.classList.toggle('revealed');
  });
  document.getElementById('copy-md-raw')?.addEventListener('click', async () => {
    if (!(await copyText(mdPreviewInput.value))) return;
    showToast('Copied!');
  });
  renderMarkdownPreview();

  /* ============ Mention formatter ============ */
  const mentionTypeSelect = document.getElementById('mention-type-select');
  const mentionIdInput = document.getElementById('mention-id-input');
  const mentionOutput = document.getElementById('mention-output');
  const MENTION_EXPLAIN = {
    user: 'Pings that specific user, if they can see the channel.',
    role: 'Pings everyone with that role, if the role is mentionable.',
    channel: 'Shows as a clickable link to that channel.',
  };
  function renderMention(){
    const id = mentionIdInput.value.trim();
    if (!isSnowflake(id)) { mentionOutput.innerHTML = `<span class="err">Enter a valid ID (15-20 digits).</span>`; return; }
    const type = mentionTypeSelect.value;
    const tag = type === 'user' ? `<@${id}>` : type === 'role' ? `<@&${id}>` : `<#${id}>`;
    mentionOutput.innerHTML = `
      <div class="row"><span>Mention</span><span>${escapeHtml(tag)}</span></div>
      <div class="row"><span>Does</span><span>${escapeHtml(MENTION_EXPLAIN[type] || '')}</span></div>
      <button type="button" class="copy-link" data-copy-url="${escapeHtml(tag)}">Copy</button>`;
  }
  [mentionTypeSelect, mentionIdInput].forEach(el => el?.addEventListener('input', renderMention));
  mentionOutput?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copyUrl))) return;
    showToast('Copied!');
  });

  /* ============ Message preview ============ */
  function renderMessagePreview(){
    if (!messagePreviewBox) return;
    const text = applyCase(state.text) || '';
    const now = new Date();
    const embed = currentEmbedObject();
    const hasEmbed = hasRealEmbed(embed);
    let embedHtml = '';
    if (hasEmbed) embedHtml = `<div class="mp-embed-wrap">${embedPreviewEl.innerHTML}</div>`;
    messagePreviewBox.innerHTML = `
      <div class="mp-avatar">L</div>
      <div class="mp-body">
        <div class="mp-head"><span class="mp-username">Luka's Utils</span><span class="mp-time">Today at ${now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}</span></div>
        <div class="mp-content">${renderDiscordMarkdown(text)}</div>
        ${embedHtml}
      </div>`;
  }

  /* ============ Webhook message builder ============ */
  const webhookUsernameInput = document.getElementById('webhook-username-input');
  const webhookAvatarInput = document.getElementById('webhook-avatar-input');
  const webhookContentInput = document.getElementById('webhook-content-input');
  const webhookPreviewBox = document.getElementById('webhook-preview-box');
  function renderWebhookPreview(){
    if (!webhookPreviewBox) return;
    const name = webhookUsernameInput.value.trim() || 'Webhook';
    const avatarUrl = webhookAvatarInput.value.trim();
    const content = webhookContentInput.value;
    const now = new Date();
    const embed = currentEmbedObject();
    const hasEmbed = hasRealEmbed(embed);
    const avatarHtml = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"><span style="display:none">${escapeHtml(Array.from(name)[0]?.toUpperCase() || 'W')}</span>`
      : escapeHtml(Array.from(name)[0]?.toUpperCase() || 'W');
    webhookPreviewBox.innerHTML = `
      <div class="mp-avatar wh-avatar">${avatarHtml}</div>
      <div class="mp-body">
        <div class="mp-head"><span class="mp-username">${escapeHtml(name)}</span><span class="wh-tag">BOT</span><span class="mp-time">Today at ${now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}</span></div>
        <div class="mp-content">${renderDiscordMarkdown(content)}</div>
        ${hasEmbed ? `<div class="mp-embed-wrap">${embedPreviewEl.innerHTML}</div>` : ''}
      </div>`;
  }
  [webhookUsernameInput, webhookAvatarInput, webhookContentInput].forEach(el => el?.addEventListener('input', renderWebhookPreview));
  webhookPreviewHook = renderWebhookPreview;
  renderWebhookPreview();

  /* ============ Invites ============ */
  const inviteInput = document.getElementById('invite-input');
  const inviteOutput = document.getElementById('invite-output');
  // Accepts a bare code ("Uh7k7pxRPk") or a real invite link on discord.gg / discord.com/invite, with an optional
  // query string or fragment. Anything else (a sentence, another site, a link with no code) is not an invite.
  function extractInviteCode(raw){
    const s = raw.trim();
    if (!s) return null;
    const link = s.match(/^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([\w-]{2,32})\/?(?:[?#].*)?$/i);
    if (link) return link[1];
    return /^[\w-]{2,32}$/.test(s) ? s : null;
  }
  function renderInviteFormat(){
    const code = extractInviteCode(inviteInput.value);
    if (!code) { inviteOutput.innerHTML = inviteInput.value.trim() ? `<span class="err">That doesn't look like a Discord invite link or code.</span>` : ''; return; }
    const url = `https://discord.gg/${code}`;
    inviteOutput.innerHTML = `
      <div class="row"><span>Code</span><span>${escapeHtml(code)}</span></div>
      <div class="row"><span>Link</span><span>${escapeHtml(url)}</span></div>
      <button type="button" class="copy-link" data-copy-url="${url}">Copy link</button>`;
  }
  inviteInput?.addEventListener('input', renderInviteFormat);
  inviteOutput?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copyUrl))) return;
    showToast('Copied!');
  });

  const inviteLookupInput = document.getElementById('invite-lookup-input');
  const inviteLookupBtn = document.getElementById('invite-lookup-btn');
  const inviteLookupOutput = document.getElementById('invite-lookup-output');
  // One lookup at a time: the button is disabled while a request is running, every request has a time limit, and
  // only the newest request may write its answer, so a slow older reply can never replace a newer one.
  let inviteTicket = 0;
  const inviteMsg = (text, cls) => { inviteLookupOutput.innerHTML = `<span${cls ? ` class="${cls}"` : ''}>${escapeHtml(text)}</span>`; };
  inviteLookupBtn?.addEventListener('click', async () => {
    const code = extractInviteCode(inviteLookupInput.value);
    if (!code) { inviteMsg(inviteLookupInput.value.trim() ? "That doesn't look like a Discord invite link or code." : 'Enter an invite code or link first.', 'err'); return; }
    const ticket = ++inviteTicket;
    inviteLookupBtn.disabled = true; inviteLookupBtn.setAttribute('aria-busy', 'true');
    inviteLookupOutput.setAttribute('aria-live', 'polite');
    inviteMsg('Looking up…');
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 10000) : null;
    try {
      const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, ctl ? { signal: ctl.signal } : undefined);
      if (ticket !== inviteTicket) return;
      if (!res.ok) {
        if (res.status === 404) inviteMsg("That invite doesn't seem to exist, or has expired.", 'err');
        else if (res.status === 429) inviteMsg('Discord is rate limiting lookups right now. Wait a moment and try again.', 'err');
        else if (res.status >= 500) inviteMsg('Discord is having a problem right now. Try again in a little while.', 'err');
        else inviteMsg(`Discord couldn't look that invite up (error ${res.status}).`, 'err');
        return;
      }
      let data;
      try { data = await res.json(); } catch (e) { if (ticket === inviteTicket) inviteMsg("Discord's reply couldn't be read.", 'err'); return; }
      if (ticket !== inviteTicket) return;
      data = data && typeof data === 'object' ? data : {};
      const guild = data.guild || {};
      inviteLookupOutput.innerHTML = `
        <div class="row"><span>Server</span><span>${escapeHtml(String(guild.name || '—'))}</span></div>
        <div class="row"><span>Members</span><span>${escapeHtml(String(data.approximate_member_count ?? '—'))}</span></div>
        <div class="row"><span>Online</span><span>${escapeHtml(String(data.approximate_presence_count ?? '—'))}</span></div>
        <div class="row"><span>Channel</span><span>${escapeHtml(String(data.channel?.name || '—'))}</span></div>`;
    } catch (e) {
      if (ticket !== inviteTicket) return;
      inviteMsg(e && e.name === 'AbortError'
        ? 'Discord took too long to answer. Try again in a moment.'
        : "Couldn't reach Discord's API from here — this can happen due to browser restrictions. The invite formatter above still works fully offline.", 'err');
    } finally {
      if (timer) clearTimeout(timer);
      if (ticket === inviteTicket) { inviteLookupBtn.disabled = false; inviteLookupBtn.removeAttribute('aria-busy'); }
    }
  });

  /* ============ Developer tools ============ */
  // JSON formatter
  // Re-indents (or compacts) valid JSON text without parsing the values, so numbers stay exactly as typed.
  // JSON.stringify(JSON.parse(x)) would turn 12345678901234567890 into 12345678901234567000.
  function reformatJson(src, minify){
    let out = '', depth = 0, inStr = false;
    const nl = () => minify ? '' : '\n' + '  '.repeat(depth);
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (inStr) { out += ch; if (ch === '\\') out += src[++i]; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') { inStr = true; out += ch; continue; }
      if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') continue;
      if (ch === '{' || ch === '[') {
        let j = i + 1;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src[j] === (ch === '{' ? '}' : ']')) { out += ch + src[j]; i = j; continue; }   // empty stays {} or []
        depth++; out += ch + nl(); continue;
      }
      if (ch === '}' || ch === ']') { depth--; out += nl() + ch; continue; }
      if (ch === ',') { out += ',' + nl(); continue; }
      if (ch === ':') { out += minify ? ':' : ': '; continue; }
      out += ch;
    }
    return out;
  }
  const jsonFmtInput = document.getElementById('json-fmt-input');
  const jsonFmtOutput = document.getElementById('json-fmt-output');
  const jsonFmtModeToggle = document.getElementById('json-fmt-mode-toggle');
  let jsonFmtMode = 'format';
  function renderJsonFmt(){
    const raw = jsonFmtInput.value.trim();
    if (!raw) { setOutput(jsonFmtOutput, ''); return; }
    try {
      JSON.parse(raw);   // throws on invalid input, which is all this is for
      setOutput(jsonFmtOutput, reformatJson(raw, jsonFmtMode === 'minify'));
    } catch (err) {
      setOutput(jsonFmtOutput, `Invalid JSON: ${err.message}`, true);
    }
  }
  jsonFmtInput?.addEventListener('input', renderJsonFmt);
  jsonFmtModeToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-json-mode]');
    if (!btn) return;
    jsonFmtModeToggle.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    jsonFmtMode = btn.dataset.jsonMode;
    renderJsonFmt();
  });
  document.getElementById('copy-json-fmt')?.addEventListener('click', async () => {
    if (!(await copyOutput(jsonFmtOutput))) return;
    showToast('Copied!');
  });

  // Base64
  const base64Input = document.getElementById('base64-input');
  const base64Output = document.getElementById('base64-output');
  const base64ModeToggle = document.getElementById('base64-mode-toggle');
  let base64Mode = 'encode';
  // Base64 works on UTF-8 bytes, so emoji and accented text round-trip. Decoding also accepts the URL-safe
  // alphabet (- and _) and missing "=" padding, and says which step failed.
  function renderBase64(){
    const raw = base64Input.value;
    if (!raw) { setOutput(base64Output, ''); return; }
    if (base64Mode === 'encode') {
      const bytes = new TextEncoder().encode(raw);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      setOutput(base64Output, btoa(bin));
      return;
    }
    let bin;
    try { bin = atob(raw.trim().replace(/-/g, '+').replace(/_/g, '/')); }
    catch { setOutput(base64Output, "That doesn't look like valid Base64.", true); return; }
    try {
      setOutput(base64Output, new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    } catch {
      setOutput(base64Output, "That's valid Base64, but it doesn't decode to readable UTF-8 text (it may be binary data).", true);
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
  document.getElementById('copy-base64')?.addEventListener('click', async () => {
    if (!(await copyOutput(base64Output))) return;
    showToast('Copied!');
  });
  document.getElementById('clear-base64')?.addEventListener('click', () => {
    base64Input.value = '';
    renderBase64();
    base64Input.focus();
  });

  // URL encoder / decoder
  const urlEncodeInput = document.getElementById('url-encode-input');
  const urlEncodeOutput = document.getElementById('url-encode-output');
  const urlModeToggle = document.getElementById('url-mode-toggle');
  let urlMode = 'encode';
  function renderUrlEncode(){
    const raw = urlEncodeInput.value;
    if (!raw) { setOutput(urlEncodeOutput, ''); return; }
    try {
      setOutput(urlEncodeOutput, urlMode === 'encode' ? encodeURIComponent(raw) : decodeURIComponent(raw));
    } catch {
      setOutput(urlEncodeOutput, urlMode === 'encode' ? "That text contains a broken character (an unpaired surrogate) and can't be encoded." : "That doesn't look like validly encoded text.", true);
    }
  }
  urlEncodeInput?.addEventListener('input', renderUrlEncode);
  urlModeToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-url-mode]');
    if (!btn) return;
    urlModeToggle.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    urlMode = btn.dataset.urlMode;
    urlEncodeInput.placeholder = urlMode === 'encode' ? 'Text or URL' : 'Percent-encoded text';
    renderUrlEncode();
  });
  document.getElementById('copy-url-encode')?.addEventListener('click', async () => {
    if (!(await copyOutput(urlEncodeOutput))) return;
    showToast('Copied!');
  });

  // UUID generator
  const uuidOutput = document.getElementById('uuid-output');
  const uuidCountInput = document.getElementById('uuid-count-input');
  const copyAllUuidBtn = document.getElementById('copy-all-uuid');
  function makeUuid(){
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function renderUuid(){
    const count = Math.min(50, Math.max(1, Math.floor(Number(uuidCountInput?.value)) || 1));
    if (uuidCountInput && uuidCountInput.value !== String(count)) uuidCountInput.value = String(count);   // show the number actually used
    const ids = Array.from({ length: count }, makeUuid);
    uuidOutput.innerHTML = ids.map(id => `
      <div class="uuid-line"><span>${id}</span><button type="button" class="copy-link" data-copy-url="${id}">Copy</button></div>
    `).join('');
    if (copyAllUuidBtn) {
      copyAllUuidBtn.hidden = count < 2;
      copyAllUuidBtn.dataset.allUuids = ids.join('\n');
    }
  }
  document.getElementById('generate-uuid')?.addEventListener('click', renderUuid);
  uuidOutput?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copyUrl))) return;
    showToast('Copied!');
  });
  copyAllUuidBtn?.addEventListener('click', async () => {
    if (!(await copyText(copyAllUuidBtn.dataset.allUuids || ''))) return;
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
    // Digits only means a Unix time, never a calendar date (new Date("5") would be a day in 2001):
    // up to 11 digits are seconds, 12 or 13 digits are milliseconds, a leading minus is allowed.
    if (/^-?\d+$/.test(raw)) {
      const digits = raw.replace('-', '').length;
      date = digits <= 11 ? new Date(Number(raw) * 1000) : digits <= 13 ? new Date(Number(raw)) : new Date(NaN);
    } else if (/^-?\d{1,11}\.\d+$/.test(raw)) {
      date = new Date(Math.floor(Number(raw) * 1000));   // fractional seconds, like Python's time.time()
    } else date = new Date(raw);
    if (isNaN(date?.getTime())) { unixOutput.innerHTML = `<span class="err">Couldn't parse that as a timestamp or date.</span>`; return; }
    const unixSec = Math.floor(date.getTime() / 1000);
    unixOutput.innerHTML = `
      <div class="row"><span>Unix (s)</span><span>${unixSec}</span></div>
      <div class="row"><span>Unix (ms)</span><span>${date.getTime()}</span></div>
      <div class="row"><span>UTC</span><span>${date.toUTCString()}</span></div>
      <div class="row"><span>Local</span><span>${date.toLocaleString()}</span></div>
      <div class="row"><span>Discord date/time</span><span>&lt;t:${unixSec}:f&gt;</span></div>
      <div class="row"><span>Discord relative</span><span>&lt;t:${unixSec}:R&gt;</span></div>
      <button type="button" class="copy-link" data-copy-url="<t:${unixSec}:f>">Copy Discord tag</button>`;
  }
  unixInput?.addEventListener('input', renderUnix);
  unixOutput?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-url]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copyUrl))) return;
    showToast('Copied!');
  });

  // Hash generator (Web Crypto, fully local — nothing sent anywhere)
  const hashInput = document.getElementById('hash-input');
  const hashOutput = document.getElementById('hash-output');
  const hashAlgoToggle = document.getElementById('hash-algo-toggle');
  let hashAlgo = 'SHA-256';
  // digest() is asynchronous, so a slow earlier call could finish after a newer one (or after the box was
  // cleared) and overwrite the result. Every run takes a ticket and only the newest ticket may write.
  let hashTicket = 0;
  async function renderHash(){
    const ticket = ++hashTicket;
    const value = hashInput.value, algo = hashAlgo;
    if (!value) { setOutput(hashOutput, ''); return; }
    if (!window.crypto?.subtle) { setOutput(hashOutput, 'Hashing needs a secure (HTTPS) connection — not available here.', true); return; }
    try {
      const data = new TextEncoder().encode(value);
      const buffer = await crypto.subtle.digest(algo, data);
      if (ticket !== hashTicket) return;
      setOutput(hashOutput, Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));
    } catch {
      if (ticket === hashTicket) setOutput(hashOutput, 'Could not compute a hash for that input.', true);
    }
  }
  hashInput?.addEventListener('input', renderHash);
  hashAlgoToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hash-algo]');
    if (!btn) return;
    hashAlgoToggle.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    hashAlgo = btn.dataset.hashAlgo;
    renderHash();
  });
  document.getElementById('copy-hash')?.addEventListener('click', async () => {
    if (!(await copyOutput(hashOutput))) return;
    showToast('Copied!');
  });

  // Text diff (line-based, longest-common-subsequence)
  const diffInputA = document.getElementById('diff-input-a');
  const diffInputB = document.getElementById('diff-input-b');
  const diffOutputEl = document.getElementById('diff-output');
  const DIFF_LINE_CAP = 2000;
  const DIFF_CHAR_CAP = 400000;   // total across both boxes, checked before anything is split or compared
  // Line-based longest-common-subsequence. Equal lines at the start and end are peeled off first (they are
  // most of the text in a typical edit), the rest are turned into small integers so comparing long lines is
  // cheap, and the table is one typed array (about 8 MB at the 2000-line limit) instead of thousands of arrays.
  function diffLines(a, b){
    // An empty box has no lines (splitting '' would give one empty line and show a phantom blank row).
    const toLines = (t) => t === '' ? [] : t.replace(/\r\n?/g, '\n').split('\n');
    const A = toLines(a), Bl = toLines(b);
    let head = 0;
    while (head < A.length && head < Bl.length && A[head] === Bl[head]) head++;
    let endA = A.length, endB = Bl.length;
    while (endA > head && endB > head && A[endA - 1] === Bl[endB - 1]) { endA--; endB--; }
    const ids = new Map();
    const idOf = (line) => { let v = ids.get(line); if (v === undefined) { v = ids.size; ids.set(line, v); } return v; };
    const MA = A.slice(head, endA).map(idOf), MB = Bl.slice(head, endB).map(idOf);
    const n = MA.length, m = MB.length, w = m + 1;
    const dp = new Uint16Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = MA[i] === MB[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    const result = [];
    for (let k = 0; k < head; k++) result.push({ type:'same', text:A[k] });
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (MA[i] === MB[j]) { result.push({ type:'same', text:A[head + i] }); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) { result.push({ type:'removed', text:A[head + i] }); i++; }
      else { result.push({ type:'added', text:Bl[head + j] }); j++; }
    }
    while (i < n) { result.push({ type:'removed', text:A[head + i] }); i++; }
    while (j < m) { result.push({ type:'added', text:Bl[head + j] }); j++; }
    for (let k = endA; k < A.length; k++) result.push({ type:'same', text:A[k] });
    return result;
  }
  function renderDiff(){
    if (!diffOutputEl) return;
    const a = diffInputA.value, b = diffInputB.value;
    if (!a && !b) { diffOutputEl.innerHTML = `<p class="tz-empty-note">Paste text in both boxes to compare.</p>`; return; }
    if (a.length + b.length > DIFF_CHAR_CAP) {
      diffOutputEl.innerHTML = `<p class="tz-empty-note">That's too much text to compare in the browser (limit about ${Math.round(DIFF_CHAR_CAP / 1000)},000 characters across both boxes).</p>`;
      return;
    }
    const linesA = a.split('\n').length, linesB = b.split('\n').length;
    if (linesA > DIFF_LINE_CAP || linesB > DIFF_LINE_CAP) {
      diffOutputEl.innerHTML = `<p class="tz-empty-note">That's too much text for a line-by-line comparison here (${DIFF_LINE_CAP}-line limit per side).</p>`;
      return;
    }
    const rows = diffLines(a, b);
    const added = rows.filter(r => r.type === 'added').length;
    const removed = rows.filter(r => r.type === 'removed').length;
    const summary = `<div class="diff-summary">+${added} added, -${removed} removed</div>`;
    const body = rows.map(r => {
      const cls = r.type === 'added' ? 'diff-added' : r.type === 'removed' ? 'diff-removed' : 'diff-same';
      const prefix = r.type === 'added' ? '+ ' : r.type === 'removed' ? '- ' : '  ';
      const text = escapeHtml(prefix + r.text);
      return r.text === '' ? `<span class="diff-line ${cls} diff-empty-line">${text}</span>` : `<span class="diff-line ${cls}">${text}</span>`;
    }).join('\n');
    diffOutputEl.innerHTML = summary + body;
  }
  // Wait for a short pause in typing so a paste or fast typing does not run the comparison on every keystroke.
  let diffTimer = null;
  const queueDiff = () => { clearTimeout(diffTimer); diffTimer = setTimeout(renderDiff, 140); };
  diffInputA?.addEventListener('input', queueDiff);
  diffInputB?.addEventListener('input', queueDiff);
  renderDiff();

  // Webhook payload builder
  function renderWebhookPayload(){
    if (!webhookPayloadOutput) return;
    const payload = {};
    if (state.text?.trim()) payload.content = applyCase(state.text);
    const embed = currentEmbedObject();
    if (hasRealEmbed(embed)) payload.embeds = [embed];
    webhookPayloadOutput.textContent = JSON.stringify(payload, null, 2);
  }
  document.getElementById('copy-webhook-payload')?.addEventListener('click', async () => {
    if (!(await copyText(webhookPayloadOutput.textContent))) return;
    showToast('Copied!');
  });
  renderMessagePreview();
  renderWebhookPayload();

  /* ============ Markdown cheat sheet ============ */
  const CHEATSHEET = [
    { label:'Bold', syntax:'**text**' },
    { label:'Italic', syntax:'*text*' },
    { label:'Bold italic', syntax:'***text***' },
    { label:'Underline', syntax:'__text__' },
    { label:'Strikethrough', syntax:'~~text~~' },
    { label:'Spoiler', syntax:'||text||' },
    { label:'Inline code', syntax:'`code`' },
    { label:'Code block', syntax:'```\ncode\n```' },
    { label:'Quote', syntax:'> text' },
    { label:'Big heading', syntax:'# text' },
    { label:'Medium heading', syntax:'## text' },
    { label:'Small heading', syntax:'### text' },
    { label:'Bullet list', syntax:'- item' },
    { label:'Numbered list', syntax:'1. item' },
    { label:'Masked link', syntax:'[text](https://example.com)' },
  ];
  const cheatsheetSearch = document.getElementById('cheatsheet-search');
  const cheatsheetList = document.getElementById('cheatsheet-list');
  function renderCheatsheet(){
    if (!cheatsheetList) return;
    const q = (cheatsheetSearch?.value || '').trim().toLowerCase();
    const items = CHEATSHEET.filter(c => !q || c.label.toLowerCase().includes(q) || c.syntax.toLowerCase().includes(q));
    cheatsheetList.innerHTML = items.length ? items.map(c => `
      <div class="cheatsheet-row">
        <div class="cheatsheet-main">
          <span class="cheatsheet-label">${escapeHtml(c.label)}</span>
          <span class="cheatsheet-syntax">${escapeHtml(c.syntax.replace(/\n/g, ' '))}</span>
        </div>
        <div class="cheatsheet-preview">${renderDiscordMarkdown(c.syntax)}</div>
        <button type="button" class="copy-btn small" data-copy-cheat="${escapeHtml(c.syntax)}">Copy</button>
      </div>
    `).join('') : `<p class="tz-empty-note">No matches.</p>`;
  }
  cheatsheetSearch?.addEventListener('input', renderCheatsheet);
  cheatsheetList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-cheat]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copyCheat))) return;
    showToast('Copied!');
  });
  renderCheatsheet();

  /* ============ Symbol browser ============ */
  const SYMBOLS = [
    ...['→','←','↑','↓','↔','↕','⇒','⇐','⇑','⇓','⇔','↗','↘','↙','↖','➜','➤','⤴','⤵'].map(ch => ({ ch, name:'arrow', cat:'arrows' })),
    ...['★','☆','✦','✧','✩','✪','✯','✰','⭐'].map(ch => ({ ch, name:'star', cat:'stars' })),
    ...['─','━','│','┃','═','║','╌','┄','┅','•','·','‣','▪','▫'].map(ch => ({ ch, name:'line', cat:'lines' })),
    ...['「','」','『','』','【','】','〔','〕','⟨','⟩','❨','❩','❮','❯','‹','›','«','»'].map(ch => ({ ch, name:'bracket', cat:'brackets' })),
    ...['±','×','÷','≠','≈','≤','≥','∞','√','∑','∏','∆','∫','π','∈','∉','⊂','⊃','∅'].map(ch => ({ ch, name:'math', cat:'math' })),
    ...['✦','❖','☾','☽','❀','✿','❁','✾','✽','❋','☼','⚡','♪','♫','☯','♥','♡'].map(ch => ({ ch, name:'decorative', cat:'decorative' })),
  ];
  const symbolSearchInput = document.getElementById('symbol-search-input');
  const symbolGrid = document.getElementById('symbol-grid');
  const symbolFilterRow = document.getElementById('symbol-filter-row');
  let symbolCat = 'all';
  function renderSymbolGrid(){
    if (!symbolGrid) return;
    const q = (symbolSearchInput?.value || '').trim().toLowerCase();
    const list = SYMBOLS.filter(s => (symbolCat === 'all' || s.cat === symbolCat) && (!q || s.name.includes(q) || s.cat.includes(q) || s.ch === q));
    symbolGrid.innerHTML = list.length ? list.map(s => `
      <button type="button" class="symbol-chip" data-copy-symbol="${escapeHtml(s.ch)}" title="${escapeHtml(s.name)}">
        <span class="sc-glyph">${escapeHtml(s.ch)}</span>
        <span class="sc-name">${escapeHtml(s.name)}</span>
      </button>
    `).join('') : `<p class="tz-empty-note">No matching symbols.</p>`;
  }
  symbolFilterRow?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-symbol-cat]');
    if (!btn) return;
    symbolFilterRow.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    symbolCat = btn.dataset.symbolCat;
    renderSymbolGrid();
  });
  symbolSearchInput?.addEventListener('input', renderSymbolGrid);
  symbolGrid?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-symbol]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copySymbol))) return;
    showToast('Copied!');
  });

  /* ============ Divider & border generator ============ */
  const DIVIDERS = [
    '──────────────────────',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '══════════════════════',
    '• • • • • • • • • • • •',
    '· · · · · · · · · · · ·',
    '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
    '☆ ─────────────────── ☆',
    '✦ ═══════════════════ ✦',
    '~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~',
  ];
  const dividerList = document.getElementById('divider-list');
  const borderTextInput = document.getElementById('border-text-input');
  const borderOutput = document.getElementById('border-output');
  function renderDividerList(){
    if (!dividerList) return;
    dividerList.innerHTML = DIVIDERS.map(d => `
      <div class="divider-row">
        <span class="divider-preview">${escapeHtml(d)}</span>
        <button type="button" class="copy-btn small" data-copy-divider="${escapeHtml(d)}">Copy</button>
      </div>
    `).join('');
  }
  dividerList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-divider]');
    if (!btn) return;
    if (!(await copyText(btn.dataset.copyDivider))) return;
    showToast('Copied!');
  });
  function buildBorder(text){
    const lines = (text || '').split('\n');
    const width = Math.max(...lines.map(l => [...l].length), 1);
    const top = '┌' + '─'.repeat(width + 2) + '┐';
    const bottom = '└' + '─'.repeat(width + 2) + '┘';
    const middle = lines.map(l => '│ ' + l + ' '.repeat(width - [...l].length) + ' │');
    return [top, ...middle, bottom].join('\n');
  }
  function renderBorder(){
    if (!borderOutput) return;
    borderOutput.textContent = buildBorder(borderTextInput.value);
  }
  borderTextInput?.addEventListener('input', renderBorder);
  document.getElementById('copy-border')?.addEventListener('click', async () => {
    if (!(await copyText(borderOutput.textContent))) return;
    showToast('Copied!');
  });
  renderBorder();

  /* ============ Invisible characters ============ */
  const INVISIBLE_CHARS = [
    { name:'Zero Width Space', ch:'\u200B', code:'U+200B', desc:'Invisible and takes no width. The most common way to send a "blank" message or break up text.' },
    { name:'Word Joiner', ch:'\u2060', code:'U+2060', desc:'Invisible, and also tells the renderer not to break a line at that point.' },
    { name:'Zero Width Non-Joiner', ch:'\u200C', code:'U+200C', desc:'Invisible. Mainly used to stop characters from visually joining in scripts that ligature.' },
    { name:'Zero Width Joiner', ch:'\u200D', code:'U+200D', desc:'Invisible on its own. Used to combine emoji into a single combined glyph.' },
    { name:'Braille Pattern Blank', ch:'\u2800', code:'U+2800', desc:'A real, printable Braille character that happens to render blank — used for blank Discord names since true zero-width characters are rejected there.' },
    { name:'Hangul Filler', ch:'\u3164', code:'U+3164', desc:'A Korean filler character that also renders blank. Another common trick for blank names.' },
  ];
  const invisibleList = document.getElementById('invisible-list');
  function renderInvisibleList(){
    if (!invisibleList) return;
    invisibleList.innerHTML = INVISIBLE_CHARS.map(c => `
      <div class="invisible-row">
        <div class="invisible-head">
          <span class="invisible-name">${escapeHtml(c.name)}</span>
          <span class="invisible-code">${escapeHtml(c.code)}</span>
        </div>
        <p class="invisible-desc">${escapeHtml(c.desc)}</p>
        <button type="button" class="copy-btn small" data-copy-invisible="${encodeURIComponent(c.ch)}">Copy</button>
      </div>
    `).join('');
  }
  invisibleList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-invisible]');
    if (!btn) return;
    if (!(await copyText(decodeURIComponent(btn.dataset.copyInvisible)))) return;
    showToast('Copied!');
  });
  renderInvisibleList();

  /* ============ Case converter ============ */
  const CASE_CONVERTERS = [
    { label:'lowercase', fn: s => s.toLowerCase() },
    { label:'UPPERCASE', fn: s => s.toUpperCase() },
    { label:'Title Case', fn: titleCase },
    { label:'Sentence case', fn: sentenceCase },
    { label:'aLtErNaTiNg CaSe', fn: s => [...s].map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('') },
    { label:'InVERSE case', fn: s => [...s].map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('') },
  ];
  const caseInput = document.getElementById('case-input');
  const caseConvertGrid = document.getElementById('case-convert-grid');
  function renderCaseConvert(){
    if (!caseConvertGrid) return;
    const src = state.text;
    caseConvertGrid.innerHTML = CASE_CONVERTERS.map((c, idx) => `
      <div class="case-convert-row">
        <span class="case-convert-label">${escapeHtml(c.label)}</span>
        <span class="case-convert-value${src ? '' : ' is-empty'}">${src ? escapeHtml(c.fn(src)) : '—'}</span>
        <button type="button" class="copy-btn small" data-copy-case="${idx}">Copy</button>
      </div>
    `).join('');
  }
  // One text state: the Example box (#live-input) is the source, and this textarea mirrors it.
  // Editing here writes back to the same state, so the two can never disagree.
  function refreshCaseFromState(){
    if (caseInput && caseInput.value !== state.text) caseInput.value = state.text;
    renderCaseConvert();
  }
  caseInput?.addEventListener('input', () => {
    const clamped = clampExample(caseInput.value);
    if (clamped !== caseInput.value) caseInput.value = clamped;
    state.text = clamped;
    if (liveInput.value !== state.text) liveInput.value = state.text;
    charCurrent.textContent = charLen(state.text);
    renderCaseConvert();
    renderAll();
  });
  caseConvertGrid?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-case]');
    if (!btn) return;
    if (!state.text) { showToast('Type something first'); return; }
    const converter = CASE_CONVERTERS[Number(btn.dataset.copyCase)];
    if (!(await copyText(converter.fn(state.text)))) return;
    showToast('Copied!');
  });
  refreshCaseFromState();

  /* ============ Example box show/hide ============ */
  // Hiding only hides the panel (display:none), so its text, font-size and case settings are kept
  // and it keeps feeding the Case Converter. The button lives in the sticky header, so it is always reachable.
  const exampleToggle = document.getElementById('example-toggle');
  // The sticky Example box changes height with the screen width, so jumps to a section are measured from
  // its real bottom edge. A fixed number left headings underneath it on narrow phones.
  const exampleWrap = document.querySelector('.live-text-wrap');
  function syncScrollOffset(){
    const root = document.documentElement;
    if (!exampleWrap || root.classList.contains('example-hidden')) { root.style.removeProperty('--scroll-offset'); return; }
    const headerH = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 61;
    root.style.setProperty('--scroll-offset', Math.ceil(headerH + exampleWrap.offsetHeight + 12) + 'px');
  }
  if (exampleWrap && 'ResizeObserver' in window) new ResizeObserver(syncScrollOffset).observe(exampleWrap);
  window.addEventListener('resize', syncScrollOffset);
  function setExampleHidden(hidden, persist){
    document.documentElement.classList.toggle('example-hidden', hidden);
    syncScrollOffset();
    if (exampleToggle) {
      const label = hidden ? 'Show example box' : 'Hide example box';
      exampleToggle.setAttribute('aria-pressed', String(!hidden));
      exampleToggle.setAttribute('aria-label', label);
      exampleToggle.title = label;
    }
    if (persist) { try { localStorage.setItem('lu_example_hidden', hidden ? '1' : '0'); } catch (e) {} }
  }
  setExampleHidden(document.documentElement.classList.contains('example-hidden'), false);
  exampleToggle?.addEventListener('click', () => setExampleHidden(!document.documentElement.classList.contains('example-hidden'), true));

  /* ============ Library bridge (v9.8) ============ */
  // A small, explicit surface for library.js. It only reads and writes tool state through the
  // same inputs and handlers a person would use, so presets and templates never bypass a tool.
  const setVal = (el, v) => { if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
  window.LuBridge = {
    escapeHtml, renderDiscordMarkdown, showToast, applyCase, sampleText, copyText, isSnowflake,
    openTool(id){
      if (toolPanelById(id)) {
        if (toolSearchInput?.value) { toolSearchInput.value = ''; filterTools(); }
        history.pushState(null, '', '#' + id);
        showTool(id, true);
      } else if (document.getElementById(id)) {
        location.hash = '#' + id;
      }
    },
    permissions: PERMISSIONS,
    palettes: PALETTES.map(p => ({ id: p.id, name: p.name, fg: p.fg, bg: p.bg, canvas: p.canvas })),
    styles: {
      get(){ return { caseMode: state.caseMode, size: Number(sizeRange.value) }; },
      set(o){
        if (o.caseMode === 'none' || o.caseMode === 'lower' || o.caseMode === 'title') {
          state.caseMode = o.caseMode;
          document.querySelectorAll('.live-controls .case-btn').forEach(b => b.classList.toggle('active', b.dataset.case === o.caseMode));
        }
        if (typeof o.size === 'number') setVal(sizeRange, String(o.size));
        renderAll();
      },
    },
    timestamp: {
      get(){ return { tzMode: tsTzMode, hourMode: tsHourMode, zones: [...tzState.zones] }; },
      isZone: isValidZone,
      set(o){
        if (o.tzMode) tsTzToggle?.querySelector(`[data-tz-mode="${o.tzMode}"]`)?.click();
        if (o.hourMode) tsHourToggle?.querySelector(`[data-hour-mode="${o.hourMode}"]`)?.click();
        if (Array.isArray(o.zones)) { const clean = cleanZones(o.zones); tzState.zones = clean; saveZones(); renderTimestamps(); }
      },
    },
    colors: {
      get(){ return { fg: colorState.fg, bg: colorState.bg, canvas: colorState.canvas }; },
      set(o){
        const p = PALETTES.find(p => p.fg === o.fg && p.bg === o.bg && p.canvas === o.canvas);
        colorState.fg = o.fg; colorState.bg = o.bg; colorState.canvas = o.canvas;
        colorState.activePreset = p ? p.id : null;
        syncColorInputs(); renderPaletteGrid(); renderColorLab(); renderJson();
      },
    },
    embed: {
      read(){
        const v = k => embedInputs[k].value;
        return {
          content: embedMessageContent.value, author: v('author'), authorUrl: v('authorUrl'), authorIcon: v('authorIcon'),
          title: v('title'), url: v('url'), description: v('description'), color: v('colorHex').trim(),
          thumbnail: v('thumbnail'), image: v('image'), footer: v('footer'), footerIcon: v('footerIcon'),
          timestamp: embedInputs.timestampToggle.checked,
          fields: embedFields.map(f => ({ name: f.name, value: f.value, inline: !!f.inline })),
          senderName: document.getElementById('embed-sender-name')?.value || '',
          senderAvatar: document.getElementById('embed-sender-avatar')?.value || '',
        };
      },
      // Only keys that are present are touched, so a preset can change just a colour or a footer.
      write(o){
        const set = (el, v) => { if (el && v !== undefined) el.value = v; };
        set(embedMessageContent, o.content);
        set(embedInputs.author, o.author); set(embedInputs.authorUrl, o.authorUrl); set(embedInputs.authorIcon, o.authorIcon);
        set(embedInputs.title, o.title); set(embedInputs.url, o.url); set(embedInputs.description, o.description);
        if (o.color !== undefined) { embedInputs.colorHex.value = o.color; if (/^#[0-9a-fA-F]{6}$/.test(o.color)) embedInputs.colorSwatch.value = o.color; }
        set(embedInputs.thumbnail, o.thumbnail); set(embedInputs.image, o.image);
        set(embedInputs.footer, o.footer); set(embedInputs.footerIcon, o.footerIcon);
        if (o.timestamp !== undefined) embedInputs.timestampToggle.checked = !!o.timestamp;
        set(document.getElementById('embed-sender-name'), o.senderName);
        set(document.getElementById('embed-sender-avatar'), o.senderAvatar);
        if (Array.isArray(o.fields)) {
          embedFields = o.fields.map(f => ({ id: ++embedFieldIdSeq, name: f.name, value: f.value, inline: !!f.inline }));
          renderEmbedFields();
        }
        renderEmbedOutput();
        renderWebhookPreview();
      },
    },
    templates: {
      get(){ return templateState.custom || ''; },
      set(text){ templateState.custom = text || ''; renderTemplateGrid(); renderTemplateOutput(); },
    },
  };

  // The text field in a search or hex row is shorter than the row, so a tap on the padding missed it.
  document.addEventListener('click', (e) => {
    const row = e.target.closest('.search-row, .tool-search-row, .tz-search-row, .lib-search, .color-input-row');
    if (!row || e.target.closest('button, a, input, select, textarea, label')) return;
    const field = row.querySelector('input[type="text"], input:not([type])');
    if (field) field.focus();
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
