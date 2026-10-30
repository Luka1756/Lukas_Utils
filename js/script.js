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
    // Regional Letters moved to the Symbols tool on the Text Tools page (v10.0 Phase 14); LuBridge.regionalLetters keeps the same converter.

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

  /* ---- v10.0: the Example box follows you from page to page ----
     The site is now several pages, so the text, case mode and size are kept in sessionStorage for this tab. */
  const EXAMPLE_KEY = 'lu_example';
  const savedExample = (() => {
    let o = null;
    try { o = JSON.parse(sessionStorage.getItem(EXAMPLE_KEY)); } catch (e) { o = null; }
    return o && typeof o === 'object' ? o : {};
  })();
  if (typeof savedExample.t === 'string') state.text = clampExample(savedExample.t);
  if (savedExample.c === 'lower' || savedExample.c === 'title') state.caseMode = savedExample.c;
  const savedSize = Number.isInteger(savedExample.s) && savedExample.s >= 14 && savedExample.s <= 34 ? savedExample.s : null;

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
  // Preview links only ever point at web addresses; anything else (javascript:, data:) is shown as plain text.
  function isWebUrl(u){ return typeof u === 'string' && /^https?:\/\//i.test(u.trim()); }

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
    persistExample();
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
    // Ctrl/Cmd+K and "/" now live in shortcuts.js, the one place that owns the keyboard shortcuts.
    if (e.key === 'Escape') {
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
    const raw = TRANSFORMS[fmt.fn](applyCase(sampleText()));
    discordOutputEl.textContent = raw;
    // The preview is drawn from the very string shown (and copied) above, never from a separate sample.
    const prev = document.getElementById('md-fmt-preview');
    if (prev && prev.isConnected) prev.innerHTML = raw ? renderDiscordMarkdown(raw) : '<span class="dm-empty">Nothing to preview yet.</span>';
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
  function persistExample(){
    try {
      const size = sizeRange.isConnected ? Number(sizeRange.value) : savedSize;
      sessionStorage.setItem(EXAMPLE_KEY, JSON.stringify({ t: state.text, c: state.caseMode, s: size }));
    } catch (e) { /* storage unavailable: the box just won't carry over */ }
  }
  function renderAll(){
    persistExample();
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
  let tsTzMode = 'local';   // 'local' | 'utc' | 'zone': which quick button matches the selected zone
  const TS_FORMATS = [
    { code:'t', label:'Short time', desc:'Just the time' },
    { code:'T', label:'Long time', desc:'Time, with seconds' },
    { code:'d', label:'Short date', desc:'Numeric date' },
    { code:'D', label:'Long date', desc:'Date, spelled out' },
    { code:'f', label:'Short date/time', desc:'Date and time together' },
    { code:'F', label:'Long date/time', desc:'Full date, weekday and time' },
    { code:'R', label:'Relative', desc:"Counts automatically — \"in 2 hours\", then \"1 hour ago\", etc." },
  ];
  /* ---- Time-zone maths: all of it comes from the browser's own IANA database (Intl), no offsets are hardcoded ---- */
  const BROWSER_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })();
  const zoneFmtCache = {};
  function zfmt(tz){
    return zoneFmtCache[tz] || (zoneFmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' }));
  }
  function zoneWall(tz, ms){   // the wall-clock fields shown in zone `tz` at instant `ms`
    const o = {};
    zfmt(tz).formatToParts(new Date(ms)).forEach(p => { if (p.type !== 'literal') o[p.type] = p.value; });
    return { y:+o.year, mo:+o.month, d:+o.day, h:(+o.hour) % 24, mi:+o.minute, s:+o.second };
  }
  function utcFromFields(f){ const d = new Date(0); d.setUTCFullYear(f.y, f.mo - 1, f.d); d.setUTCHours(f.h, f.mi, f.s, 0); return d.getTime(); }
  function zoneOffsetMs(tz, ms){ return utcFromFields(zoneWall(tz, ms)) - Math.floor(ms / 1000) * 1000; }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function fieldsToInput(f){ return `${String(f.y).padStart(4, '0')}-${pad2(f.mo)}-${pad2(f.d)}T${pad2(f.h)}:${pad2(f.mi)}`; }
  function parseInputFields(v){
    const m = /^(\d{4,6})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/.exec(v || '');
    return m ? { y:+m[1], mo:+m[2], d:+m[3], h:+m[4], mi:+m[5], s:+(m[6] || 0) } : null;
  }
  // Which instants show this wall-clock time in the zone? Normally one. Zero means the clock skips it (spring
  // forward); two means the clock shows it twice (fall back).
  function wallToInstants(tz, f){
    const guess = utcFromFields(f);
    const DAY = 86400000;
    const offs = [...new Set([zoneOffsetMs(tz, guess - DAY * 1.5), zoneOffsetMs(tz, guess - DAY / 2), zoneOffsetMs(tz, guess + DAY / 2), zoneOffsetMs(tz, guess + DAY * 1.5)])];
    const found = [...new Set(offs.map(o => guess - o))].filter(t => zoneOffsetMs(tz, t) === guess - t).sort((a, b) => a - b);
    return { guess, found, before: zoneOffsetMs(tz, guess - DAY) };
  }
  let tsZone = BROWSER_TZ || 'UTC';
  let tsFold = 'first';   // which of the two repeated clock times to use after a fall-back change
  // Reads the date/time box as a moment in the selected zone. status: ok | gap (skipped time, moved forward) | fold (repeated time)
  function tsResolve(){
    const f = parseInputFields(timestampInput.value);
    if (!f || f.y < 1 || f.y > 9999) return null;
    try {
      const { guess, found, before } = wallToInstants(tsZone, f);
      let ms, status = 'ok', alts = found;
      if (found.length === 0) { ms = guess - before; status = 'gap'; }
      else if (found.length === 1) ms = found[0];
      else { ms = tsFold === 'second' ? found[found.length - 1] : found[0]; status = 'fold'; }
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : { date: d, status, alts, fields: f };
    } catch { return null; }
  }
  function getTimestampDate(){ const r = tsResolve(); return r ? r.date : null; }
  function tsPreviewText(date, code){
    const hour12 = tsHourMode === '12';
    const tz = tsZone;
    const T = (o) => date.toLocaleTimeString([], Object.assign({ timeZone: tz, hour12 }, o));
    const D = (o) => date.toLocaleDateString([], Object.assign({ timeZone: tz }, o));
    try {
      if (code === 't') return T({ hour:'numeric', minute:'2-digit' });
      if (code === 'T') return T({ hour:'numeric', minute:'2-digit', second:'2-digit' });
      if (code === 'd') return D({});
      if (code === 'D') return D({ day:'numeric', month:'long', year:'numeric' });
      if (code === 'f') return D({ day:'numeric', month:'long', year:'numeric' }) + ' ' + T({ hour:'numeric', minute:'2-digit' });
      if (code === 'F') return D({ weekday:'long', day:'numeric', month:'long', year:'numeric' }) + ' ' + T({ hour:'numeric', minute:'2-digit' });
    } catch { return ''; }
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
    const res = tsResolve();
    const date = res ? res.date : null;
    renderZoneSummary(res);
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
  timestampInput?.addEventListener('input', () => { tsFold = 'first'; renderTimestamps(); });
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
  // The quick buttons are shortcuts for choosing a zone: your device's zone, or UTC.
  tsTzToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tz-mode]');
    if (!btn || btn.disabled) return;
    setTsZone(btn.dataset.tzMode === 'utc' ? 'UTC' : BROWSER_TZ);
  });
  function syncZoneButtons(){
    tsTzMode = tsZone === 'UTC' ? 'utc' : (tsZone === BROWSER_TZ ? 'local' : 'zone');
    tsTzToggle?.querySelectorAll('[data-tz-mode]').forEach(b => {
      const on = b.dataset.tzMode === tsTzMode;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
  }
  // Changing the zone never changes the moment: the clock time in the box is converted so it still means the same instant.
  function setTsZone(tz, opts){
    if (!isValidZone(tz)) return false;
    const keep = !(opts && opts.keepClock);
    const before = keep ? getTimestampDate() : null;
    tsZone = tz; tsFold = 'first';
    if (before) setTimestampFromDate(before); else renderTimestamps();
    syncZoneButtons();
    if (zoneInput) zoneInput.value = tsZone;
    renderTimestamps();
    return true;
  }
  function setTimestampFromDate(date){
    timestampInput.value = fieldsToInput(zoneWall(tsZone, date.getTime()));
    // If that clock time occurs twice, remember which of the two this moment is.
    const f = parseInputFields(timestampInput.value);
    if (f) { try { const { found } = wallToInstants(tsZone, f); if (found.length > 1) tsFold = date.getTime() === found[0] ? 'first' : 'second'; else tsFold = 'first'; } catch {} }
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
    const b = tzDateKey(date, tsZone);
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

  /* ---- Searchable time-zone selector (every zone this browser's IANA database lists) ---- */
  const zoneInput = document.getElementById('ts-zone-input');
  const zoneList = document.getElementById('ts-zone-list');
  const zoneBrowse = document.getElementById('ts-zone-browse');
  const zoneError = document.getElementById('ts-zone-error');
  const zoneSummary = document.getElementById('ts-zone-summary');
  const zoneNote = document.getElementById('ts-zone-note');
  const zoneListIsFull = ALL_TIMEZONES !== FALLBACK_TIMEZONES;
  const ZONE_ALIASES = { Calcutta:'kolkata india delhi mumbai bombay', Kolkata:'calcutta india delhi mumbai bombay', Kiev:'kyiv', Kyiv:'kiev', Katmandu:'kathmandu nepal', Kathmandu:'katmandu nepal', Rangoon:'yangon myanmar burma', Yangon:'rangoon', Saigon:'ho chi minh vietnam', Ho_Chi_Minh:'saigon vietnam', New_York:'nyc eastern', Los_Angeles:'la pacific', London:'uk britain england gmt bst', Tokyo:'japan', Sydney:'australia', Auckland:'new zealand nz', Dubai:'uae', Shanghai:'china beijing', Singapore:'sg' };
  function zoneGroupName(tz){ return tz.includes('/') ? tz.split('/')[0] : 'UTC'; }
  function zoneHaystack(tz, date){
    const city = tz.split('/').pop();
    return (tz + ' ' + tz.replace(/[_/]/g, ' ') + ' ' + tzDisplayName(tz) + ' ' + (ZONE_ALIASES[city] || '') + ' ' + tzOffsetLabel(date, tz)).toLowerCase();
  }
  function zoneLongName(tz, date){
    try {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'long' }).formatToParts(date).find(x => x.type === 'timeZoneName');
      const q = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(date).find(x => x.type === 'timeZoneName');
      return { long: p ? p.value : '', short: q ? q.value : '' };
    } catch { return { long:'', short:'' }; }
  }
  function zoneDstState(tz, date){
    try {
      const y = zoneWall(tz, date.getTime()).y;
      const jan = zoneOffsetMs(tz, Date.UTC(y, 0, 1)), jul = zoneOffsetMs(tz, Date.UTC(y, 6, 1)), now = zoneOffsetMs(tz, date.getTime());
      if (jan === jul) return { observes:false, active:false };
      return { observes:true, active: now > Math.min(jan, jul) };
    } catch { return { observes:false, active:false }; }
  }
  let zoneActive = -1, zoneShown = [];
  function zoneRefDate(){ return getTimestampDate() || new Date(); }
  function renderZoneList(query, browseAll){
    if (!zoneList) return;
    const ref = zoneRefDate();
    const q = (query || '').toLowerCase().replace(/[_/]+/g, ' ').trim();
    const toks = q.split(/\s+/).filter(Boolean);
    let hits = ALL_TIMEZONES.filter(tz => !toks.length || toks.every(t => zoneHaystack(tz, ref).replace(/[_/]+/g, ' ').includes(t)));
    if (toks.length) {   // names that start with the search first, then the rest
      const rank = (tz) => { const n = tzDisplayName(tz).toLowerCase(); return n.startsWith(q) ? 0 : tz.toLowerCase().replace(/[_/]+/g, ' ').includes(q) ? 1 : 2; };
      hits = hits.map((tz, i) => [tz, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
    }
    const CAP = 80;
    const more = hits.length > CAP;
    zoneShown = hits.slice(0, CAP);
    if (!zoneShown.length) {
      zoneList.innerHTML = `<div class="tsz-empty">No time zone matches “${escapeHtml(query)}”. Try a city (Tokyo), a region (Europe) or an identifier (Europe/London).</div>`;
      zoneActive = -1;
    } else {
      let html = '', lastGroup = null;
      zoneShown.forEach((tz, i) => {
        const g = zoneGroupName(tz);
        if (g !== lastGroup) { html += `<div class="tsz-group" role="presentation">${escapeHtml(g)}</div>`; lastGroup = g; }
        html += `<div class="tsz-opt${tz === tsZone ? ' is-selected' : ''}" role="option" id="tsz-opt-${i}" data-zone="${escapeHtml(tz)}" aria-selected="false"><span class="tsz-name">${escapeHtml(tzDisplayName(tz))}<span class="tsz-id">${escapeHtml(tz)}</span></span><span class="tsz-off">${escapeHtml(tzOffsetLabel(ref, tz))}</span></div>`;
      });
      if (more) html += `<div class="tsz-empty">Showing the first ${CAP} of ${hits.length}. Keep typing to narrow it down.</div>`;
      zoneList.innerHTML = html;
      zoneActive = Math.max(0, zoneShown.indexOf(tsZone));
      if (toks.length) zoneActive = 0;
    }
    zoneList.hidden = false;
    zoneInput.setAttribute('aria-expanded', 'true');
    zoneBrowse?.setAttribute('aria-expanded', 'true');
    markZoneActive(true);
  }
  function markZoneActive(scroll){
    if (!zoneList) return;
    zoneList.querySelectorAll('.tsz-opt').forEach((el, i) => { const on = i === zoneActive; el.classList.toggle('is-active', on); el.setAttribute('aria-selected', String(on)); if (on && scroll) el.scrollIntoView({ block:'nearest' }); });
    if (zoneActive >= 0) zoneInput.setAttribute('aria-activedescendant', 'tsz-opt-' + zoneActive); else zoneInput.removeAttribute('aria-activedescendant');
  }
  function closeZoneList(){
    if (!zoneList) return;
    zoneList.hidden = true; zoneInput.setAttribute('aria-expanded', 'false'); zoneBrowse?.setAttribute('aria-expanded', 'false'); zoneInput.removeAttribute('aria-activedescendant');
  }
  function showZoneError(msg){ if (!zoneError) return; zoneError.textContent = msg || ''; zoneError.hidden = !msg; zoneInput?.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  // Typed text that is not in the list but that the browser still accepts as an identifier (any letter case).
  function canonicalZone(text){
    const t = String(text || '').trim();
    if (!t || t.length > 64 || !/^[A-Za-z0-9_+\-\/:]+$/.test(t)) return '';
    try { return new Intl.DateTimeFormat('en', { timeZone: t }).resolvedOptions().timeZone || ''; } catch { return ''; }
  }
  function chooseZone(tz){
    showZoneError('');
    closeZoneList();
    setTsZone(tz);
    zoneInput.value = tsZone;
  }
  function commitTypedZone(){
    const typed = zoneInput.value.trim();
    if (!typed || typed === tsZone) { showZoneError(''); closeZoneList(); zoneInput.value = tsZone; return; }
    if (!zoneList.hidden && zoneActive >= 0 && zoneShown[zoneActive]) { chooseZone(zoneShown[zoneActive]); return; }
    const c = canonicalZone(typed);
    if (c) { chooseZone(c); return; }
    showZoneError(`“${typed}” is not a time zone this browser knows. Pick one from the list, or type an identifier such as Europe/London.`);
  }
  if (zoneInput) {
    zoneInput.addEventListener('input', () => { showZoneError(''); renderZoneList(zoneInput.value, false); });
    zoneInput.addEventListener('focus', () => { zoneInput.select(); });
    zoneInput.addEventListener('click', () => { if (zoneList.hidden) { renderZoneList('', true); } });
    zoneInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (zoneList.hidden) { renderZoneList(zoneInput.value === tsZone ? '' : zoneInput.value, true); return; }
        const n = zoneShown.length; if (!n) return;
        zoneActive = (zoneActive + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; markZoneActive(true);
      } else if (e.key === 'Enter') { e.preventDefault(); commitTypedZone(); }
      else if (e.key === 'Escape') { if (!zoneList.hidden) { e.preventDefault(); e.stopPropagation(); closeZoneList(); zoneInput.value = tsZone; showZoneError(''); } }
    });
    zoneInput.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== zoneInput && !zoneList.matches(':hover')) { closeZoneList(); if (!zoneError.hidden) return; zoneInput.value = tsZone; } }, 120); });
    zoneList.addEventListener('mousedown', (e) => e.preventDefault());   // keep focus in the box while choosing
    zoneList.addEventListener('click', (e) => { const o = e.target.closest('[data-zone]'); if (o) chooseZone(o.dataset.zone); });
    zoneBrowse?.addEventListener('click', () => { if (zoneList.hidden) { renderZoneList('', true); zoneInput.focus(); } else closeZoneList(); });
    document.addEventListener('click', (e) => { if (zoneList && !zoneList.hidden && !e.target.closest('.tsz-combo')) { closeZoneList(); zoneInput.value = tsZone; } });
    zoneInput.value = tsZone;
    if (!BROWSER_TZ || !isValidZone(BROWSER_TZ)) {
      const lb = tsTzToggle?.querySelector('[data-tz-mode="local"]');
      if (lb) { lb.disabled = true; lb.title = 'This browser did not report a time zone'; }
      if (zoneNote) zoneNote.textContent = 'This browser did not report your time zone, so “My time zone” is unavailable. Pick one from the list.';
    } else if (!zoneListIsFull && zoneNote) {
      zoneNote.textContent = 'This browser cannot list every time zone, so only common ones are shown. You can still type any identifier it recognises.';
    }
  }
  function renderZoneSummary(res){
    if (!zoneSummary) return;
    syncZoneButtons();
    if (!res) { zoneSummary.innerHTML = `<span class="tsz-warn">Enter a valid date and time to see the timestamp.</span>`; return; }
    const d = res.date, unix = Math.floor(d.getTime() / 1000);
    const nm = zoneLongName(tsZone, d), dst = zoneDstState(tsZone, d);
    const iso = new Date(d.getTime()).toISOString().replace('T', ' ').replace(/\.000Z$/, '').replace(/Z$/, '') + ' UTC';
    let html = `<div class="tsz-line"><strong>${escapeHtml(tzDisplayName(tsZone))}</strong> <code>${escapeHtml(tsZone)}</code> <span class="tsz-badge">${escapeHtml(tzOffsetLabel(d, tsZone) || 'UTC')}</span>`
      + `${dst.active ? ' <span class="tsz-badge tsz-dst" title="The offset is higher than this zone\'s other offset this year, so daylight saving time is in effect">DST</span>' : ''}`
      + `${!dst.observes ? ' <span class="tsz-badge tsz-muted" title="This zone has the same offset in January and July of this year">no DST this year</span>' : ''}</div>`;
    if (nm.long) html += `<div class="tsz-sub">${escapeHtml(nm.long)}${nm.short && nm.short !== nm.long ? ' (' + escapeHtml(nm.short) + ')' : ''}</div>`;
    html += `<div class="tsz-sub">Same moment everywhere: <code>${escapeHtml(iso)}</code> = Unix <code>${unix}</code>. The zone only decides how the clock time above is read and shown; the timestamp itself is absolute.</div>`;
    if (res.status === 'gap') {
      html += `<div class="tsz-warn" role="status">That clock time does not exist in ${escapeHtml(tsZone)} (the clocks skip it when daylight saving starts). It was moved forward to ${escapeHtml(tsPreviewText(d, 'T'))}.</div>`;
    } else if (res.status === 'fold') {
      const offs = res.alts.map(t => tzOffsetLabel(new Date(t), tsZone));
      html += `<div class="tsz-warn" role="status">That clock time happens twice in ${escapeHtml(tsZone)} (the clocks go back). Choose which one:
        <span class="tsz-fold"><button type="button" class="case-btn${tsFold === 'first' ? ' active' : ''}" data-fold="first" aria-pressed="${tsFold === 'first'}">First, ${escapeHtml(offs[0])}</button><button type="button" class="case-btn${tsFold === 'second' ? ' active' : ''}" data-fold="second" aria-pressed="${tsFold === 'second'}">Second, ${escapeHtml(offs[offs.length - 1])}</button></span></div>`;
    }
    zoneSummary.innerHTML = html;
  }
  zoneSummary?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fold]');
    if (!b) return;
    tsFold = b.dataset.fold; renderTimestamps();
    zoneSummary.querySelector(`[data-fold="${tsFold}"]`)?.focus();
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
    const busy = active && [timestampGrid, tzRowsContainer, tzSearchResults, tsHighlightRow, zoneSummary, zoneList].some(box => box && box.contains(active));
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
      <img class="emoji-preview" src="${url}" alt="" loading="lazy">`;
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
  // v10.0: each tool page has its own section id (e.g. #embeds-webhooks); the standalone SEO pages have none.
  const discordSection = document.querySelector('section.discord-tools.hub');
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
      history.pushState(null, '', '#' + discordSection.id);
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
    else if (id && id === discordSection.id) showAllTools(false);
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
  const hideBrokenImages = (el) => { if (el) el.addEventListener('error', (e) => { if (e.target && e.target.tagName === 'IMG') e.target.style.display = 'none'; }, true); };
  const embedPreviewEl = document.getElementById('embed-preview');
  const embedContentPreviewEl = document.getElementById('embed-content-preview');
  const embedPreviewTimeEl = document.getElementById('embed-preview-time');
  const embedWarningsEl = document.getElementById('embed-warnings');
  const sendStatusEl = document.getElementById('send-status');
  const sendBtn = document.getElementById('send-to-discord');
  const webhookUrlInput = document.getElementById('embed-webhook-url');
  // Eye button: switches the field between masked and visible. This only changes how the text is drawn on screen.
  // The value is never copied anywhere, and focus, caret and selection stay where they were.
  const webhookToggle = document.getElementById('embed-webhook-toggle');
  if (webhookToggle && webhookToggle.isConnected && webhookUrlInput) {
    const [iconShow, iconHide] = [webhookToggle.querySelector('.pw-eye'), webhookToggle.querySelector('.pw-eye-off')];
    webhookToggle.addEventListener('mousedown', (e) => e.preventDefault());   // keep the caret in the field
    webhookToggle.addEventListener('click', () => {
      const wasFocused = document.activeElement === webhookUrlInput;
      const { selectionStart: a, selectionEnd: b, selectionDirection: d } = webhookUrlInput;
      const reveal = webhookUrlInput.type === 'password';
      webhookUrlInput.type = reveal ? 'text' : 'password';
      const label = reveal ? 'Hide webhook URL' : 'Show webhook URL';
      webhookToggle.setAttribute('aria-label', label); webhookToggle.title = label;
      webhookToggle.setAttribute('aria-pressed', reveal ? 'true' : 'false');
      // The icons are SVG, which has no .hidden property, so the attribute is set directly.
      if (iconShow) iconShow.toggleAttribute('hidden', reveal);
      if (iconHide) iconHide.toggleAttribute('hidden', !reveal);
      if (wasFocused) {
        // Changing the type resets the caret, and some browsers do it a moment later, so restore it now and on the next frame.
        const restore = () => { if (document.activeElement !== webhookUrlInput) return; try { webhookUrlInput.setSelectionRange(a, b, d || 'none'); } catch { /* not supported for this type */ } };
        webhookUrlInput.focus({ preventScroll: true }); restore();
        requestAnimationFrame(() => { if (webhookUrlInput.selectionStart === 0 && webhookUrlInput.selectionEnd === 0) restore(); });
      }
    });
  }
  let embedSending = false;
  const embedJsonOutput = document.getElementById('embed-json-output');
  const messagePreviewBox = document.getElementById('message-preview-box');
  hideBrokenImages(messagePreviewBox);
  hideBrokenImages(emojiTagOutput);   // no inline onerror attributes anywhere: the page's security policy does not allow them
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

  /* ---- Several embeds in one message (v11.0). The embed being edited lives in the form; every embed is also kept as a plain snapshot. ---- */
  const EMBED_MAX = 10;
  const EMBED_DEFAULT_COLOR = '#22D3EE';
  const blankEmbedSnapshot = (color) => ({ author:'', authorUrl:'', authorIcon:'', title:'', url:'', description:'', color: color || EMBED_DEFAULT_COLOR, thumbnail:'', image:'', footer:'', footerIcon:'', timestamp:false, fields:[] });
  let embedStore = [blankEmbedSnapshot()];
  let embedActive = 0;
  function snapshotForm(){
    const v = (k) => embedInputs[k] ? embedInputs[k].value : '';
    return { author:v('author'), authorUrl:v('authorUrl'), authorIcon:v('authorIcon'), title:v('title'), url:v('url'), description:v('description'),
      color:v('colorHex').trim(), thumbnail:v('thumbnail'), image:v('image'), footer:v('footer'), footerIcon:v('footerIcon'),
      timestamp: !!(embedInputs.timestampToggle && embedInputs.timestampToggle.checked),
      fields: embedFields.map(f => ({ name:f.name, value:f.value, inline:!!f.inline })) };
  }
  function loadSnapshot(sn){
    const set = (k, val) => { if (embedInputs[k]) embedInputs[k].value = val || ''; };
    ['author','authorUrl','authorIcon','title','url','description','thumbnail','image','footer','footerIcon'].forEach(k => set(k, sn[k]));
    if (embedInputs.colorHex) embedInputs.colorHex.value = sn.color || '';
    if (embedInputs.colorSwatch && /^#[0-9a-fA-F]{6}$/.test(sn.color || '')) embedInputs.colorSwatch.value = sn.color;
    if (embedInputs.timestampToggle) embedInputs.timestampToggle.checked = !!sn.timestamp;
    embedFields = (sn.fields || []).map(f => ({ id: ++embedFieldIdSeq, name:f.name, value:f.value, inline:!!f.inline }));
    renderEmbedFields();
  }
  function embedFromSnapshot(sn){
    const t = (k) => String(sn[k] || '').trim();
    const embed = {};
    if (t('author')) {
      embed.author = { name: t('author') };
      if (t('authorUrl')) embed.author.url = t('authorUrl');
      if (t('authorIcon')) embed.author.icon_url = t('authorIcon');
    }
    if (t('title')) embed.title = t('title');
    if (t('url')) embed.url = t('url');
    if (t('description')) embed.description = t('description');
    if (/^#[0-9a-fA-F]{6}$/.test(t('color'))) embed.color = parseInt(t('color').slice(1), 16);
    if (t('thumbnail')) embed.thumbnail = { url: t('thumbnail') };
    if (t('image')) embed.image = { url: t('image') };
    if (t('footer')) {
      embed.footer = { text: t('footer') };
      if (t('footerIcon')) embed.footer.icon_url = t('footerIcon');
    }
    if (sn.timestamp) embed.timestamp = new Date().toISOString();
    const fields = (sn.fields || []).filter(f => f.name.trim() || f.value.trim()).map(f => {
      const field = { name: f.name || '​', value: f.value || '​' };
      if (f.inline) field.inline = true;
      return field;
    });
    if (fields.length) embed.fields = fields;
    return embed;
  }
  function currentEmbedObject(){ return embedFromSnapshot(snapshotForm()); }
  function allEmbedObjects(){ return embedStore.map((sn, i) => i === embedActive ? currentEmbedObject() : embedFromSnapshot(sn)); }
  // Only embeds with real content are previewed, exported and sent (Discord rejects empty ones). n is the tab number.
  const realEmbeds = () => allEmbedObjects().map((embed, i) => ({ embed, n: i + 1 })).filter(x => hasRealEmbed(x.embed));

  const embedTextLength = (embed) => { const len = (v) => charLen(v || ''); return len(embed.title) + len(embed.description) + len(embed.footer?.text) + len(embed.author?.name) + (embed.fields || []).reduce((sum, f) => sum + len(f.name) + len(f.value), 0); };
  function validateEmbed(embed, opts = {}){
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
    if (!opts.skipTotal && total > EMBED_LIMITS.totalChars) warnings.push(`Combined embed text is ${total} / ${EMBED_LIMITS.totalChars} characters — Discord's overall limit.`);
    return warnings;
  }

  function validateAllEmbeds(list){
    const multi = embedStore.length > 1, out = [];
    list.forEach(({ embed, n }) => validateEmbed(embed, { skipTotal: list.length > 1 }).forEach(w => out.push(multi ? `Embed ${n}: ${w}` : w)));
    if (list.length > 1) {
      const total = list.reduce((sum, { embed }) => sum + embedTextLength(embed), 0);
      if (total > EMBED_LIMITS.totalChars) out.push(`Combined text of all embeds is ${total} / ${EMBED_LIMITS.totalChars} characters, Discord's limit for one message.`);
    }
    return out;
  }

  const embedColorCss = (embed) => embed && embed.color != null ? '#' + embed.color.toString(16).padStart(6, '0') : '#4e5058';
  hideBrokenImages(embedPreviewEl);
  // Discord puts inline fields side by side, up to three to a row. A field that is not inline gets a row of its own.
  function embedFieldsHtml(fields){
    const cell = (f) => `<div class="ep-field"><div class="ep-field-name">${escapeHtml(f.name)}</div><div class="ep-field-value dm-content">${renderDiscordMarkdown(f.value)}</div></div>`;
    const rows = []; let run = [];
    const flush = () => { while (run.length) { const chunk = run.splice(0, 3); rows.push(`<div class="ep-frow" style="--cols:${chunk.length}">${chunk.map(cell).join('')}</div>`); } };
    fields.forEach(f => { if (f.inline) run.push(f); else { flush(); rows.push(`<div class="ep-frow" style="--cols:1">${cell(f)}</div>`); } });
    flush();
    return `<div class="ep-fields">${rows.join('')}</div>`;
  }
  function embedCardHtml(embed){
    const img = (cls, url) => isWebUrl(url) ? `<img class="${cls}" src="${escapeHtml(url)}" alt="">` : '';
    let main = '';
    if (embed.author) {
      const icon = img('ep-author-icon', embed.author.icon_url);
      const nameHtml = isWebUrl(embed.author.url) ? `<a href="${escapeHtml(embed.author.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(embed.author.name)}</a>` : escapeHtml(embed.author.name);
      main += `<div class="ep-author">${icon}<span>${nameHtml}</span></div>`;
    }
    if (embed.title) {
      const titleHtml = isWebUrl(embed.url) ? `<a href="${escapeHtml(embed.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(embed.title)}</a>` : escapeHtml(embed.title);
      main += `<div class="ep-title">${titleHtml}</div>`;
    }
    if (embed.description) main += `<div class="ep-desc dm-content">${renderDiscordMarkdown(embed.description)}</div>`;
    if (embed.fields?.length) main += embedFieldsHtml(embed.fields);
    const thumb = embed.thumbnail ? img('ep-thumb', embed.thumbnail.url) : '';
    let html = `<div class="ep-grid${thumb ? ' has-thumb' : ''}"><div class="ep-main">${main}</div>${thumb}</div>`;
    if (embed.image) html += img('ep-image', embed.image.url);
    if (embed.footer || embed.timestamp) {
      const icon = embed.footer?.icon_url ? img('ep-footer-icon', embed.footer.icon_url) : '';
      const parts = [embed.footer?.text, embed.timestamp ? 'Today at ' + new Date(embed.timestamp).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }) : null].filter(Boolean);
      html += `<div class="ep-footer">${icon}<span>${escapeHtml(parts.join(' • '))}</span></div>`;
    }
    return `<div class="embed-preview" style="border-left-color:${embedColorCss(embed)}">${html}</div>`;
  }
  const EMBED_COUNTERS = [['title', 'embed-count-title', EMBED_LIMITS.title], ['description', 'embed-count-description', EMBED_LIMITS.description], ['footer', 'embed-count-footer', EMBED_LIMITS.footer]];
  function renderEmbedCounters(){
    EMBED_COUNTERS.forEach(([key, id, max]) => {
      const el = document.getElementById(id); if (!el || !embedInputs[key]) return;
      const n = charLen(embedInputs[key].value);
      el.textContent = n + ' / ' + max;
      el.classList.toggle('is-near', n > max * 0.9 && n <= max);
      el.classList.toggle('is-over', n > max);
    });
  }
  const embedChipsEl = document.getElementById('embed-color-chips');
  function renderEmbedOutput(){
    if (!embedPreviewEl) return;
    if (!embedSending && sendStatusEl) sendStatusEl.hidden = true;
    embedStore[embedActive] = snapshotForm();
    const embeds = allEmbedObjects();
    const real = embeds.map((embed, i) => ({ embed, n: i + 1 })).filter(x => hasRealEmbed(x.embed));
    embedJsonOutput.textContent = JSON.stringify(embeds.length === 1 ? embeds[0] : real.map(x => x.embed), null, 2);
    const jsonLabel = document.getElementById('embed-json-label');
    if (jsonLabel) jsonLabel.textContent = embeds.length === 1 ? 'Embed JSON' : `Embeds JSON (${real.length} of ${embeds.length} have content)`;

    const warnings = validateAllEmbeds(real);
    if (embedWarningsEl) {
      embedWarningsEl.hidden = warnings.length === 0;
      if (warnings.length) embedWarningsEl.innerHTML = `<ul>${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`;
    }
    embedPreviewEl.innerHTML = real.map(x => embedCardHtml(x.embed)).join('');
    if (embedContentPreviewEl) embedContentPreviewEl.innerHTML = embedMessageContent.value ? renderDiscordMarkdown(embedMessageContent.value) : '';
    if (embedPreviewTimeEl) embedPreviewTimeEl.textContent = 'Today at ' + new Date().toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });

    renderEmbedCounters();
    if (embedTabsEl) embedTabsEl.querySelectorAll('[data-embed-tab]').forEach((b, i) => {
      b.style.setProperty('--c', embedColorCss(embeds[i]));
      b.classList.toggle('is-empty', !hasRealEmbed(embeds[i] || {}));
    });
    if (embedChipsEl) {
      const cur = embedInputs.colorHex.value.trim().toLowerCase();
      embedChipsEl.querySelectorAll('[data-color]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === cur)));
    }
    renderMessagePreview();
    if (webhookPreviewHook) webhookPreviewHook();
    renderWebhookPayload();
  }

  /* ---- Embed tabs: add, switch, reorder and remove embeds ---- */
  const embedTabsEl = document.getElementById('embed-tabs');
  function renderEmbedTabs(){
    if (!embedTabsEl) return;
    const n = embedStore.length;
    let h = '';
    for (let i = 0; i < n; i++) h += `<button type="button" class="eb-tab${i === embedActive ? ' is-active' : ''}" data-embed-tab="${i}" aria-pressed="${i === embedActive}"><span class="eb-dot" aria-hidden="true"></span>Embed ${i + 1}</button>`;
    h += `<button type="button" class="btn-outline small eb-tab-act" id="embed-add" ${n >= EMBED_MAX ? 'disabled' : ''}>+ Add embed</button>`;
    if (n > 1) h += `<span class="eb-tab-tools"><button type="button" class="btn-outline small eb-tab-act" data-embed-move="-1" aria-label="Move this embed earlier" ${embedActive === 0 ? 'disabled' : ''}>&#9664;</button><button type="button" class="btn-outline small eb-tab-act" data-embed-move="1" aria-label="Move this embed later" ${embedActive === n - 1 ? 'disabled' : ''}>&#9654;</button><button type="button" class="btn-outline small eb-tab-act eb-remove" data-embed-remove>Remove</button></span>`;
    embedTabsEl.innerHTML = h;
  }
  function selectEmbed(i){
    embedStore[embedActive] = snapshotForm();
    embedActive = Math.max(0, Math.min(i, embedStore.length - 1));
    loadSnapshot(embedStore[embedActive]);
    renderEmbedTabs();
    renderEmbedOutput();
    const act = embedTabsEl && embedTabsEl.querySelector('.eb-tab.is-active'); if (act) act.focus({ preventScroll: true });
  }
  embedTabsEl?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-embed-tab]');
    if (tab) { selectEmbed(Number(tab.dataset.embedTab)); return; }
    if (e.target.closest('#embed-add')) {
      if (embedStore.length >= EMBED_MAX) return;
      embedStore[embedActive] = snapshotForm();
      embedStore.push(blankEmbedSnapshot(embedInputs.colorHex.value.trim() || EMBED_DEFAULT_COLOR));
      selectEmbed(embedStore.length - 1);
      showToast('Embed ' + embedStore.length + ' added');
      return;
    }
    const mv = e.target.closest('[data-embed-move]');
    if (mv) {
      const to = embedActive + Number(mv.dataset.embedMove);
      if (to < 0 || to >= embedStore.length) return;
      embedStore[embedActive] = snapshotForm();
      [embedStore[embedActive], embedStore[to]] = [embedStore[to], embedStore[embedActive]];
      embedActive = to; renderEmbedTabs(); renderEmbedOutput();
      const act = embedTabsEl.querySelector('.eb-tab.is-active'); if (act) act.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest('[data-embed-remove]')) {
      if (embedStore.length <= 1) return;
      const gone = embedActive + 1;
      embedStore.splice(embedActive, 1);
      embedActive = Math.min(embedActive, embedStore.length - 1);
      loadSnapshot(embedStore[embedActive]); renderEmbedTabs(); renderEmbedOutput();
      const act = embedTabsEl.querySelector('.eb-tab.is-active'); if (act) act.focus({ preventScroll: true });
      showToast('Embed ' + gone + ' removed');
    }
  });
  embedChipsEl?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-color]'); if (!chip) return;
    embedInputs.colorHex.value = chip.dataset.color; embedInputs.colorSwatch.value = chip.dataset.color;
    renderEmbedOutput();
  });
  const eb_scroll = (el) => { if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
  document.getElementById('embed-jump-preview')?.addEventListener('click', () => eb_scroll(document.getElementById('embed-preview-col')));
  document.getElementById('embed-jump-editor')?.addEventListener('click', () => eb_scroll(document.getElementById('tool-embed')));

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
    const list = realEmbeds();
    const hasEmbed = list.length > 0;
    const hasContent = embedMessageContent.value.trim().length > 0;
    const payload = {};
    if (hasContent) payload.content = embedMessageContent.value;
    if (hasEmbed) payload.embeds = list.map(x => x.embed);
    const senderName = (document.getElementById('embed-sender-name')?.value || '').trim();
    const senderAvatar = (document.getElementById('embed-sender-avatar')?.value || '').trim();
    if (senderName) payload.username = senderName;
    if (senderAvatar) payload.avatar_url = senderAvatar;
    return { payload, embed: list.length ? list[0].embed : {}, list, hasEmbed, hasContent, senderName, senderAvatar };
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

    const { payload, list, hasEmbed, hasContent, senderName, senderAvatar } = buildEmbedWebhookPayload();
    if (senderName && /clyde|discord/i.test(senderName)) { setSendStatus('err', 'Discord does not allow "discord" or "clyde" in a webhook name.'); return; }
    if (senderAvatar && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(senderAvatar)) { setSendStatus('err', 'Bot avatar: Discord needs a full http(s) URL.'); return; }
    if (!hasEmbed && !hasContent) { setSendStatus('err', 'Nothing to send yet — add message content or some embed content.'); return; }
    if (hasContent && [...payload.content].length > 2000) { setSendStatus('err', `Message content is ${[...payload.content].length} / 2000 characters.`); return; }
    if (hasEmbed) {
      const problems = validateAllEmbeds(list);
      if (problems.length) { setSendStatus('err', `Over Discord's limits — ${problems[0]}${problems.length > 1 ? ` (+${problems.length - 1} more)` : ''}`); return; }
      const multi = embedStore.length > 1;
      const badUrls = list.flatMap(({ embed, n }) => invalidEmbedUrls(embed).map(name => multi ? `Embed ${n} ${name.toLowerCase()}` : name));
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
    const keepColor = embedInputs.colorHex ? embedInputs.colorHex.value : EMBED_DEFAULT_COLOR;
    embedStore = [blankEmbedSnapshot(keepColor)]; embedActive = 0;
    loadSnapshot(embedStore[0]);
    embedMessageContent.value = '';
    renderEmbedTabs();
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
  renderEmbedTabs();
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
      const sub = line.match(/^-#\s+(.*)$/);
      if (sub) { blocks.push({ type:'sub', text: sub[1] }); i++; continue; }
      const LI = /^( *)([-*]|\d+\.)\s+(.*)$/;
      if (LI.test(line)) {
        // A run of list lines. Two spaces of indent per nesting level, as in Discord.
        const items = [];
        while (i < lines.length) {
          const m2 = lines[i].match(LI);
          if (!m2) break;
          items.push({ indent: m2[1].length, ordered: /\d/.test(m2[2]), num: parseInt(m2[2], 10), text: m2[3] });
          i++;
        }
        blocks.push({ type:'list', items }); continue;
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
        .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" data-spoiler tabindex="0" role="button" aria-label="Spoiler, press to reveal">$1</span>');
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
      // Mentions and custom emoji. Names are not known here, so they are drawn as plain labels (nothing is fetched).
      html = html.replace(/&lt;@&amp;(\d{15,20})&gt;/g, (_, id) => hold(`<span class="dm-mention dm-role" title="Role ${id}">@role</span>`));
      html = html.replace(/&lt;@!?(\d{15,20})&gt;/g, (_, id) => hold(`<span class="dm-mention" title="User ${id}">@user</span>`));
      html = html.replace(/&lt;#(\d{15,20})&gt;/g, (_, id) => hold(`<span class="dm-mention" title="Channel ${id}">#channel</span>`));
      html = html.replace(/&lt;a?:(\w{2,32}):(\d{15,20})&gt;/g, (_, name) => hold(`<span class="dm-emoji" title="Custom emoji">:${name}:</span>`));
      html = html.replace(/(^|[^\w@])@(everyone|here)\b/g, (_, pre, w) => pre + hold(`<span class="dm-mention">@${w}</span>`));
      html = emphasis(html);
      for (let guard = 0; guard < 4 && /\u0000\d+\u0000/.test(html); guard++) {
        html = html.replace(/\u0000(\d+)\u0000/g, (_, idx) => stash[Number(idx)]);
      }
      return html;
    }

    function renderList(items){
      let out = '';
      const stack = [];   // open lists: { depth, tag }
      let prevDepth = -1;
      items.forEach((it, n) => {
        const tag = it.ordered ? 'ol' : 'ul';
        let depth = Math.min(Math.floor(it.indent / 2), prevDepth + 1);
        if (n === 0) depth = 0;
        while (stack.length && stack[stack.length - 1].depth > depth) { out += `</li></${stack.pop().tag}>`; }
        const top = stack[stack.length - 1];
        if (top && top.depth === depth) {
          if (top.tag === tag) out += '</li><li>';
          else { out += `</li></${top.tag}>`; stack.pop(); stack.push({ depth, tag }); out += `<${tag}><li>`; }
        } else {
          const start = tag === 'ol' && it.num !== 1 && Number.isFinite(it.num) && it.num < 1e6 ? ` start="${it.num}"` : '';
          stack.push({ depth, tag }); out += `<${tag}${start}><li>`;
        }
        out += inline(it.text);
        prevDepth = depth;
      });
      while (stack.length) out += `</li></${stack.pop().tag}>`;
      return out;
    }

    return blocks.map(b => {
      if (b.type === 'heading') return `<div class="md-h${b.level}">${inline(b.text)}</div>`;
      if (b.type === 'quote') return `<blockquote>${b.lines.map(inline).join('<br>')}</blockquote>`;
      if (b.type === 'sub') return `<div class="md-sub">${inline(b.text)}</div>`;
      if (b.type === 'list') return renderList(b.items);
      if (b.type === 'code') return `<pre>${escapeHtml(b.text)}</pre>`;
      return b.text ? `<p>${inline(b.text)}</p>` : '<br>';
    }).join('');
  }

  function renderMarkdownPreview(){
    if (!mdPreviewOutput) return;
    mdPreviewOutput.innerHTML = mdPreviewInput.value.trim() ? renderDiscordMarkdown(mdPreviewInput.value) : '<span class="dm-empty">Type some Markdown to see it here.</span>';
  }
  mdPreviewInput?.addEventListener('input', renderMarkdownPreview);
  // Spoilers in both Discord previews: click, or Enter / Space when focused. Links keep their normal behaviour
  // (they open in a new tab only when clicked, and never navigate this page).
  document.addEventListener('click', (e) => {
    const sp = e.target.closest && e.target.closest('.dm-content [data-spoiler]');
    if (sp && !e.target.closest('a')) sp.classList.toggle('revealed');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sp = e.target.closest && e.target.closest('.dm-content [data-spoiler]');
    if (sp && e.target === sp) { e.preventDefault(); sp.classList.toggle('revealed'); }
  });
  // Show / hide the preview column's message (the raw side is never hidden).
  document.querySelectorAll('[data-md-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const split = btn.closest('[data-md-split]');
      const hide = !split.classList.contains('preview-hidden');
      split.classList.toggle('preview-hidden', hide);
      btn.setAttribute('aria-pressed', String(hide));
      btn.textContent = hide ? 'Show' : 'Hide';
      btn.setAttribute('aria-label', hide ? 'Show the Discord preview' : 'Hide the Discord preview');
    });
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
    const hasEmbed = realEmbeds().length > 0;
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
  hideBrokenImages(webhookPreviewBox);
  // A webhook avatar that fails to load falls back to the initial letter (the letter sits right after the image).
  webhookPreviewBox?.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.parentElement && t.parentElement.classList.contains('wh-avatar') && t.nextElementSibling) t.nextElementSibling.style.display = 'grid'; }, true);
  function renderWebhookPreview(){
    if (!webhookPreviewBox) return;
    const name = webhookUsernameInput.value.trim() || 'Webhook';
    const avatarUrl = webhookAvatarInput.value.trim();
    const content = webhookContentInput.value;
    const now = new Date();
    const hasEmbed = realEmbeds().length > 0;
    const avatarHtml = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt=""><span style="display:none">${escapeHtml(Array.from(name)[0]?.toUpperCase() || 'W')}</span>`
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

  // Text encoder / decoder. One interface, one format list. Pure functions below take a string and return
  // { ok:true, text } or { ok:false, error }, so the UI code only deals with state and display.
  // Byte formats (Base64, hex, binary) work on the UTF-8 bytes of the text; the escape formats work on characters.
  const ENC_MAX_CHARS = 2000000;
  const encBrokenText = "That text contains a broken character (an unpaired surrogate) and can't be turned into UTF-8.";
  function encHasLoneSurrogate(s){
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF) { const n = s.charCodeAt(i + 1); if (n >= 0xDC00 && n <= 0xDFFF) { i++; continue; } return true; }
      if (c >= 0xDC00 && c <= 0xDFFF) return true;
    }
    return false;
  }
  const encUtf8 = (s) => new TextEncoder().encode(s);
  function encFromBytes(bytes){
    try { return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }; }
    catch { return { ok: false, error: "That's valid, but the bytes aren't readable UTF-8 text (they may be binary data)." }; }
  }
  const encHex2 = (n) => n.toString(16).toUpperCase();
  const ENC_FORMATS = {
    base64: {
      name: 'Base64',
      note: 'Encodes the UTF-8 bytes of your text. Decoding also accepts the URL-safe alphabet (- and _) and missing "=" padding.',
      enc(t){
        const bytes = encUtf8(t); let bin = '';
        for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        return { ok: true, text: btoa(bin) };
      },
      dec(t){
        let bin;
        try { bin = atob(t.trim().replace(/-/g, '+').replace(/_/g, '/')); }
        catch { return { ok: false, error: "That doesn't look like valid Base64." }; }
        const r = encFromBytes(Uint8Array.from(bin, c => c.charCodeAt(0)));
        return r.ok ? r : { ok: false, error: "That's valid Base64, but it doesn't decode to readable UTF-8 text (it may be binary data)." };
      },
    },
    base64url: {
      name: 'Base64 (URL-safe)',
      note: 'Like Base64 but uses - and _ and leaves off the "=" padding, so it is safe in URLs and file names. Decoding accepts either alphabet.',
      enc(t){ const r = ENC_FORMATS.base64.enc(t); return { ok: true, text: r.text.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }; },
      dec(t){ return ENC_FORMATS.base64.dec(t); },
    },
    hex: {
      name: 'Hexadecimal',
      note: 'Shows the UTF-8 bytes of your text as hex pairs. Decoding accepts spaces, commas, colons, dashes, line breaks and 0x prefixes.',
      opts: [{ id: 'sep', label: 'Space between bytes', def: true }, { id: 'upper', label: 'Uppercase', def: false }],
      enc(t, o){
        let out = Array.from(encUtf8(t), b => b.toString(16).padStart(2, '0'));
        out = o.sep ? out.join(' ') : out.join('');
        return { ok: true, text: o.upper ? out.toUpperCase() : out };
      },
      dec(t){
        const clean = t.replace(/0x/gi, '').replace(/[\s,:\-]+/g, '');
        const bad = clean.match(/[^0-9a-fA-F]/);
        if (bad) return { ok: false, error: `"${bad[0]}" isn't a hexadecimal digit. Use 0-9 and a-f.` };
        if (clean.length % 2) return { ok: false, error: `Hex needs an even number of digits (two per byte). This has ${clean.length}.` };
        const bytes = new Uint8Array(clean.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
        return encFromBytes(bytes);
      },
    },
    binary: {
      name: 'Binary',
      note: 'Shows the UTF-8 bytes of your text as 8-bit groups. Decoding needs groups of 8 bits (spaces and line breaks between them are optional).',
      opts: [{ id: 'sep', label: 'Space between bytes', def: true }],
      enc(t, o){
        const out = Array.from(encUtf8(t), b => b.toString(2).padStart(8, '0'));
        return { ok: true, text: out.join(o.sep ? ' ' : '') };
      },
      dec(t){
        const clean = t.replace(/\s+/g, '');
        const bad = clean.match(/[^01]/);
        if (bad) return { ok: false, error: `"${bad[0]}" isn't a binary digit. Use only 0 and 1.` };
        if (clean.length % 8) return { ok: false, error: `Binary must come in groups of 8 bits (one byte each). This has ${clean.length} bits.` };
        const bytes = new Uint8Array(clean.length / 8);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 8, 8), 2);
        return encFromBytes(bytes);
      },
    },
    html: {
      name: 'HTML entities',
      note: 'Escapes & < > " and \' so text can sit safely inside HTML. Decoding understands named and numeric entities; anything it does not recognise is left as typed.',
      opts: [{ id: 'all', label: 'Also encode non-ASCII characters', def: false }],
      enc(t, o){
        let out = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        if (o.all) out = Array.from(out, ch => ch.codePointAt(0) > 127 ? `&#x${encHex2(ch.codePointAt(0))};` : ch).join('');
        return { ok: true, text: out };
      },
      dec(t){
        // The "<" is escaped first so the browser's parser can only ever see text, never a tag.
        // The parser would also turn CR into LF and drop NUL, so those are protected: CR becomes &#13;, and NUL
        // (which has no character reference) splits the text, with the pieces joined back afterwards.
        const box = document.createElement('textarea');
        const piece = (seg) => { box.innerHTML = seg.replace(/</g, '&lt;').replace(/\r/g, '&#13;'); return box.textContent; };
        return { ok: true, text: t.split('\u0000').map(piece).join('\u0000') };
      },
    },
    unicode: {
      name: 'Unicode escapes',
      note: 'Writes every non-ASCII character as an escape and leaves ASCII readable. Decoding understands \\uXXXX (including surrogate pairs), \\u{X} and \\UXXXXXXXX.',
      opts: [{ id: 'style', type: 'select', label: 'Style', def: 'u', choices: [['u', '\\uXXXX (JavaScript, JSON)'], ['brace', '\\u{X} (ES6)']] }],
      enc(t, o){
        let out = '';
        if (o.style === 'brace') { for (const ch of t) { const cp = ch.codePointAt(0); out += cp > 127 ? `\\u{${encHex2(cp)}}` : ch; } }
        else for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); out += c > 127 ? '\\u' + encHex2(c).padStart(4, '0') : t[i]; }
        return { ok: true, text: out };
      },
      dec(t){
        // Any \u or \U that is not a complete, valid escape is reported rather than passed through.
        const re = /\\(?:u\{([0-9a-fA-F]{1,8})\}|u([0-9a-fA-F]{4})|U([0-9a-fA-F]{8}))|\\[uU]/g;
        let err = null;
        const out = t.replace(re, (m, brace, four, eight, off) => {
          if (err) return m;
          if (!(brace || four || eight)) { err = `Incomplete escape at position ${off + 1}: "${t.substr(off, 8)}". Expected four hex digits after \\u.`; return m; }
          const cp = parseInt(brace || four || eight, 16);
          if (cp > 0x10FFFF) { err = `${m} is beyond the Unicode range (the highest is U+10FFFF).`; return m; }
          return String.fromCodePoint(cp);
        });
        if (err) return { ok: false, error: err };
        if (encHasLoneSurrogate(out)) return { ok: false, error: 'A surrogate escape (\\uD800 to \\uDFFF) is missing its other half, so it is not a real character.' };
        return { ok: true, text: out };
      },
    },
    json: {
      name: 'JSON string',
      note: 'Escapes quotes, backslashes and control characters the way a JSON string needs them (line breaks become \\n). Decoding also accepts text wrapped in quotes.',
      enc(t){ return { ok: true, text: JSON.stringify(t).slice(1, -1) }; },
      dec(t){
        const fix = (s) => s.replace(/[\u0000-\u001f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
        const trimmed = t.trim();
        const attempts = [];
        if (trimmed.length > 1 && trimmed[0] === '"' && trimmed.endsWith('"')) attempts.push(fix(trimmed));
        attempts.push('"' + fix(t) + '"');
        let lastErr = '';
        for (const a of attempts) {
          try { const v = JSON.parse(a); if (typeof v === 'string') return { ok: true, text: v }; }
          catch (e) { lastErr = e.message; }
        }
        return { ok: false, error: `That isn't a valid escaped JSON string (${lastErr}). Quotes inside the text need a backslash, like \\".` };
      },
    },
    rot13: {
      name: 'ROT13',
      note: 'Swaps each letter A-Z with the one 13 places along. It is its own inverse, so encoding and decoding do the same thing. Numbers, symbols and non-English letters are left alone.',
      enc(t){ return { ok: true, text: t.replace(/[a-zA-Z]/g, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); }) }; },
      dec(t){ return ENC_FORMATS.rot13.enc(t); },
    },
  };
  const ENC_BYTE_FORMATS = new Set(['base64', 'base64url', 'hex', 'binary']);
  function encConvert(format, mode, text, opts){
    const f = ENC_FORMATS[format];
    if (!f) return { ok: false, error: 'Unknown format.' };
    if (text.length > ENC_MAX_CHARS) return { ok: false, error: `That's too much text for the browser (limit about ${Math.round(ENC_MAX_CHARS / 1000000)} million characters).` };
    if (mode === 'encode' && ENC_BYTE_FORMATS.has(format) && encHasLoneSurrogate(text)) return { ok: false, error: encBrokenText };
    try { return mode === 'encode' ? f.enc(text, opts || {}) : f.dec(text, opts || {}); }
    catch (e) { return { ok: false, error: 'Could not convert that input.' }; }
  }
  window.LuEncoder = { convert: encConvert, formats: Object.keys(ENC_FORMATS) };   // used by the tests

  const encInput = document.getElementById('encoder-input');
  const encOutput = document.getElementById('encoder-output');
  const encModeToggle = document.getElementById('encoder-mode-toggle');
  const encFormatSel = document.getElementById('encoder-format');
  const encOptsBox = document.getElementById('encoder-opts');
  const encNote = document.getElementById('encoder-note');
  const encSwapBtn = document.getElementById('swap-encoder');
  let encMode = 'encode';
  const encOptState = {};   // format -> { optionId: value }, kept while the page is open so switching formats does not reset them
  function encCurrentOpts(){
    const f = ENC_FORMATS[encFormatSel.value];
    const st = encOptState[encFormatSel.value] || (encOptState[encFormatSel.value] = {});
    (f.opts || []).forEach(o => { if (!(o.id in st)) st[o.id] = o.def; });
    return st;
  }
  function renderEncoderOpts(){
    const f = ENC_FORMATS[encFormatSel.value], st = encCurrentOpts();
    encOptsBox.innerHTML = '';
    encOptsBox.hidden = !(f.opts && f.opts.length);
    (f.opts || []).forEach(o => {
      const label = document.createElement('label');
      label.className = 'enc-opt';
      if (o.type === 'select') {
        const span = document.createElement('span'); span.textContent = o.label;
        const sel = document.createElement('select'); sel.className = 'text-input select-input';
        o.choices.forEach(([v, t]) => { const op = document.createElement('option'); op.value = v; op.textContent = t; sel.appendChild(op); });
        sel.value = st[o.id];
        sel.addEventListener('change', () => { st[o.id] = sel.value; renderEncoder(); });
        label.append(span, sel);
      } else {
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!st[o.id];
        cb.addEventListener('change', () => { st[o.id] = cb.checked; renderEncoder(); });
        const span = document.createElement('span'); span.textContent = o.label;
        label.append(cb, span);
      }
      encOptsBox.appendChild(label);
    });
  }
  function renderEncoder(){
    if (!encActive) return;
    const f = ENC_FORMATS[encFormatSel.value];
    encNote.textContent = f.note;
    encInput.placeholder = encMode === 'encode' ? 'Text to encode' : `${f.name} to decode`;
    const raw = encInput.value;
    if (!raw) { setOutput(encOutput, ''); encSwapBtn.disabled = true; return; }
    const r = encConvert(encFormatSel.value, encMode, raw, encCurrentOpts());
    setOutput(encOutput, r.ok ? r.text : r.error, !r.ok);
    encSwapBtn.disabled = !r.ok || !r.text;
  }
  function setEncMode(mode){
    encMode = mode;
    encModeToggle.querySelectorAll('.case-btn').forEach(b => b.classList.toggle('active', b.dataset.encMode === mode));
  }
  encInput?.addEventListener('input', renderEncoder);
  encModeToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-enc-mode]');
    if (!btn) return;
    setEncMode(btn.dataset.encMode);
    renderEncoder();
  });
  encFormatSel?.addEventListener('change', () => { renderEncoderOpts(); renderEncoder(); });
  document.getElementById('copy-encoder')?.addEventListener('click', async () => {
    if (!encOutput.textContent) { showToast('Nothing to copy yet'); return; }
    if (!(await copyOutput(encOutput))) return;
    showToast('Copied!');
  });
  encSwapBtn?.addEventListener('click', () => {
    if (encSwapBtn.disabled || encOutput.dataset.state === 'error') return;
    encInput.value = encOutput.textContent;
    setEncMode(encMode === 'encode' ? 'decode' : 'encode');
    renderEncoder();
  });
  document.getElementById('clear-encoder')?.addEventListener('click', () => {
    encInput.value = '';
    renderEncoder();
    encInput.focus();
  });
  // On pages without this tool the lookups above return harmless stand-ins, so check for a real format.
  const encActive = !!(encFormatSel && ENC_FORMATS[encFormatSel.value]);
  if (encActive) { renderEncoderOpts(); renderEncoder(); }
  // Old links to the standalone Base64 tool (#tool-base64) now open this tool with Base64 selected.
  function encLegacyHash(){
    if (!encActive || location.hash !== '#tool-base64') return;
    encFormatSel.value = 'base64'; renderEncoderOpts(); renderEncoder();
    history.replaceState(null, '', '#tool-encoder');
    applyToolHash(true);
  }
  window.addEventListener('hashchange', encLegacyHash);
  setTimeout(encLegacyHash, 0);

  // Image <-> URL converter.
  // URL -> Image: the image is shown by the browser straight from its host. Download uses a fetch request, which only
  // works when that host allows it (CORS), and says so when it doesn't.
  // Image -> URL: choosing a file only previews it from this device (an object URL), and nothing about it is kept in
  // browser storage. The file is sent anywhere only when the Upload to ImgBB button is pressed: it goes to this site's own
  // /api/upload function, which passes it on to ImgBB. Links to other hosting sites are plain links.
  const imgPanel = document.getElementById('tool-image-url');
  const IMG_URL_MAX = 4096;
  const IMG_FILE_MAX = 20 * 1024 * 1024;
  const IMG_DL_MAX = 50 * 1024 * 1024;
  const IMG_UP_MAX = 4 * 1024 * 1024;   // must match MAX_BYTES in api/upload.js (Vercel rejects request bodies over 4.5 MB)
  const IMG_UP_TYPES = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
  const IMG_UP_KEEP = { never: '', '1h': '1 hour', '1d': '1 day', '7d': '7 days', '30d': '30 days' };
  // A returned link is only shown if it is a plain https link on ImgBB's own domain.
  function imgbbLink(v){
    if (typeof v !== 'string' || v.length > 600) return '';
    let u; try { u = new URL(v); } catch { return ''; }
    return (u.protocol === 'https:' && !u.username && !u.password && (u.hostname === 'ibb.co' || u.hostname.endsWith('.ibb.co'))) ? u.href : '';
  }
  const IMG_SHOW_EXT = new Set(['png', 'jpg', 'jpeg', 'jfif', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico', 'apng']);
  const IMG_NO_SHOW_EXT = new Set(['tif', 'tiff', 'heic', 'heif', 'psd', 'raw', 'cr2', 'nef', 'arw', 'dng', 'ai', 'eps', 'xcf']);
  const IMG_NOT_IMAGE_EXT = new Set(['html', 'htm', 'php', 'asp', 'aspx', 'pdf', 'txt', 'json', 'xml', 'js', 'css', 'zip', 'rar', '7z', 'gz', 'mp4', 'webm', 'mov', 'mkv', 'mp3', 'wav', 'ogg', 'doc', 'docx', 'xls', 'xlsx', 'exe']);
  const IMG_FILE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'image/bmp': 'bmp', 'image/svg+xml': 'svg' };
  const IMG_MIME_EXT = Object.assign({ 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/apng': 'png', 'image/pjpeg': 'jpg' }, IMG_FILE_TYPES);

  function imgPrivateHost(host){
    host = host.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.home.arpa')) return true;
    const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (m) {
      const [a, b] = [Number(m[1]), Number(m[2])];
      return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
    }
    if (host.includes(':')) return host === '::' || host === '::1' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host) || host.startsWith('::ffff:');
    return !host.includes('.');   // a bare name like "intranet" is not a public website
  }
  // Returns { ok:true, url, ext } or { ok:false, error }. The address is never loaded or run here.
  function checkImageUrl(raw){
    let s = String(raw || '').trim();
    if (!s) return { ok: false, error: 'Enter an image URL first.' };
    if (s.startsWith('<') && s.endsWith('>')) s = s.slice(1, -1).trim();
    if (/\s/.test(s)) return { ok: false, error: "That address contains spaces. Image URLs can't, so check you pasted only the link." };
    if (s.length > IMG_URL_MAX) return { ok: false, error: `That address is too long (over ${IMG_URL_MAX} characters).` };
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s) || /^[^/?#]+:\d+(?:[/?#]|$)/.test(s)) s = 'https://' + s.replace(/^\/\//, '');
    else if (s.startsWith('//')) s = 'https:' + s;
    let u;
    try { u = new URL(s); } catch { return { ok: false, error: "That doesn't look like a valid web address. It should look like https://example.com/picture.png." }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, error: `Only http and https links can be previewed. "${u.protocol}" links aren't accepted.` };
    if (u.username || u.password) return { ok: false, error: "Links with a username or password in them aren't accepted." };
    if (imgPrivateHost(u.hostname)) return { ok: false, error: "That points to a private or local address, so it can't be previewed here. Use a link to a public website." };
    const seg = decodeURIComponentSafe(u.pathname.split('/').pop() || '');
    const ext = seg.includes('.') ? seg.split('.').pop().toLowerCase() : '';
    if (IMG_NO_SHOW_EXT.has(ext)) return { ok: false, error: `.${ext} images can't be shown by most browsers. Convert it to PNG or JPG and use that link.` };
    if (IMG_NOT_IMAGE_EXT.has(ext)) return { ok: false, error: `That link ends in .${ext}, which isn't an image format. Use a link straight to a PNG, JPG, GIF, WebP, AVIF or SVG file.` };
    return { ok: true, url: u.href, ext };
  }
  function decodeURIComponentSafe(s){ try { return decodeURIComponent(s); } catch { return s; } }
  function imgFormatBytes(n){ return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(1)} MB`; }
  function imgSafeName(url, mime){
    let base = decodeURIComponentSafe(new URL(url).pathname.split('/').pop() || '').replace(/[^\w.\-]+/g, '_').replace(/^[._]+/, '').slice(0, 80);
    const want = IMG_MIME_EXT[(mime || '').split(';')[0].toLowerCase()];
    const dot = base.lastIndexOf('.');
    const have = dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
    if (!base) base = 'image';
    if (want && have !== want && !(want === 'jpg' && have === 'jpeg')) base = (dot > 0 ? base.slice(0, dot) : base) + '.' + want;
    else if (!want && dot < 1) base += '.img';
    return base;
  }
  const IMG_KIND_MIME = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', svg: 'image/svg+xml' };
  // A cheap check on the last bytes for formats with a clear end marker. A warning only: the browser may still draw part of the image.
  function imgLooksCutShort(kind, t){
    const txt = String.fromCharCode.apply(null, t);
    if (kind === 'png') return !txt.includes('IEND');
    if (kind === 'gif') return t[t.length - 1] !== 0x3B;
    if (kind === 'jpg') return !txt.includes('\xFF\xD9');
    return false;
  }
  // What a file really is, from its first bytes. Returns 'png', 'jpg', 'gif', 'webp', 'avif', 'bmp', 'svg' or null.
  const IMG_MAX_PIXELS = 100e6;
  function imgSniff(b){
    const at = (i, s) => s.split('').every((c, k) => b[i + k] === c.charCodeAt(0));
    if (b.length >= 8 && b[0] === 0x89 && at(1, 'PNG') && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) return 'png';
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
    if (b.length >= 6 && (at(0, 'GIF87a') || at(0, 'GIF89a'))) return 'gif';
    if (b.length >= 12 && at(0, 'RIFF') && at(8, 'WEBP')) return 'webp';
    if (b.length >= 2 && at(0, 'BM')) return b.length >= 26 ? 'bmp' : null;
    if (b.length >= 12 && at(4, 'ftyp') && (at(8, 'avif') || at(8, 'avis'))) return 'avif';
    let text = '';
    try { text = new TextDecoder('utf-8').decode(b).replace(/^\uFEFF/, ''); } catch { return null; }
    if (!/[\u0000]/.test(text) && /^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text)) return 'svg';
    return null;
  }
  // Width and height read from the file header, when the format makes that cheap. null when unknown.
  function imgHeaderSize(kind, b){
    const u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const l16 = (i) => b[i] | (b[i + 1] << 8), l32 = (i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
    try {
      if (kind === 'png' && b.length >= 24) return { w: u32(16), h: u32(20) };
      if (kind === 'gif' && b.length >= 10) return { w: l16(6), h: l16(8) };
      if (kind === 'bmp' && b.length >= 26) return { w: l32(18), h: Math.abs(l32(22) | 0) };
      if (kind === 'webp' && b.length >= 30) {
        const t = String.fromCharCode(b[12], b[13], b[14], b[15]);
        if (t === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
        if (t === 'VP8L') { const v = l32(21); return { w: 1 + (v & 0x3FFF), h: 1 + ((v >>> 14) & 0x3FFF) }; }
        if (t === 'VP8 ') return { w: l16(26) & 0x3FFF, h: l16(28) & 0x3FFF };
      }
      if (kind === 'jpg') {   // walk the segments to the first start-of-frame marker
        let i = 2;
        while (i + 9 < b.length) {
          if (b[i] !== 0xFF) { i++; continue; }
          const m = b[i + 1];
          if (m === 0xFF) { i++; continue; }
          if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { w: (b[i + 7] << 8) | b[i + 8], h: (b[i + 5] << 8) | b[i + 6] };
          i += 2 + ((b[i + 2] << 8) | b[i + 3]);
        }
      }
    } catch { /* fall through */ }
    return null;
  }
  // True when the <svg> tag gives a real width and height (not a percentage), so the browser's size is meaningful.
  function imgSvgHasSize(text){
    const tag = (text.match(/<svg\b[^>]*>/i) || [''])[0];
    const has = (n) => { const m = tag.match(new RegExp('\\s' + n + '\\s*=\\s*["\']?\\s*([0-9.]+)\\s*(px|pt|em|cm|mm|in)?\\s*["\']?(?:\\s|>|/)', 'i')); return !!m && Number(m[1]) > 0; };
    return has('width') && has('height');
  }
  window.LuImage = { checkUrl: checkImageUrl, safeName: imgSafeName, cutShort: imgLooksCutShort, sniff: imgSniff, headerSize: imgHeaderSize, svgHasSize: imgSvgHasSize };   // used by the tests

  if (imgPanel && imgPanel.isConnected) {
    const $i = (id) => document.getElementById(id);
    const tabs = $i('imgurl-tabs'), paneUrl = $i('imgurl-pane-url'), paneFile = $i('imgurl-pane-file');
    const form = $i('imgurl-form'), input = $i('imgurl-input'), status = $i('imgurl-status');
    const stage = $i('imgurl-stage'), img = $i('imgurl-img'), result = $i('imgurl-result');
    const sourceBox = $i('imgurl-source'), openLink = $i('imgurl-open'), dlBtn = $i('imgurl-download');
    const setStatus = (el, msg, kind) => { el.textContent = msg || ''; if (kind) el.dataset.kind = kind; else delete el.dataset.kind; };
    let loadTicket = 0, loadTimer = null, currentUrl = '', dlBusy = false;

    function showTab(which){
      const isUrl = which === 'url';
      paneUrl.hidden = !isUrl; paneFile.hidden = isUrl;
      tabs.querySelectorAll('[data-img-tab]').forEach(b => {
        const on = b.dataset.imgTab === which;
        b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-img-tab]'); if (b) showTab(b.dataset.imgTab); });
    // Arrow keys move between the two tabs.
    tabs.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const next = e.key === 'ArrowRight' ? 'file' : 'url';
      showTab(next); $i('imgurl-tab-' + next).focus(); e.preventDefault();
    });
    $i('imgurl-goto-url').addEventListener('click', () => {
      showTab('url'); input.focus();
      if (!currentUrl) setStatus(status, 'Paste the direct link to your uploaded image (the one that opens just the picture), then press Preview.', '');
    });

    function resetUrlPreview(keepInput){
      loadTicket++; clearTimeout(loadTimer); currentUrl = '';
      img.removeAttribute('src');
      stage.hidden = true; result.hidden = true; sourceBox.value = ''; openLink.removeAttribute('href');
      setStatus(status, '');
      if (!keepInput) input.value = '';
    }
    function previewUrl(){
      const chk = checkImageUrl(input.value);
      resetUrlPreview(true);
      if (!chk.ok) { setStatus(status, chk.error, 'error'); return; }
      const ticket = loadTicket, url = chk.url;
      currentUrl = url;
      input.value = url;
      setStatus(status, 'Loading the image…', 'busy');
      loadTimer = setTimeout(() => {
        if (ticket !== loadTicket) return;
        loadTicket++; img.removeAttribute('src'); currentUrl = '';
        setStatus(status, 'The image took too long to load (over 20 seconds), so I stopped waiting. The site may be slow or the file very large.', 'error');
      }, 20000);
      img.onload = () => {
        if (ticket !== loadTicket) return;
        clearTimeout(loadTimer);
        if (!img.naturalWidth) { img.onerror(); return; }
        stage.hidden = false; result.hidden = false;
        sourceBox.value = url; openLink.href = url;
        const host = new URL(url).host;
        setStatus(status, `Loaded: ${img.naturalWidth} × ${img.naturalHeight} px, shown directly from ${host}. This site doesn't copy or keep it.`, 'ok');
      };
      const currentExtFor = chk.ext;
      img.onerror = () => {
        if (ticket !== loadTicket) return;
        clearTimeout(loadTimer); loadTicket++; img.removeAttribute('src'); currentUrl = '';
        stage.hidden = true; result.hidden = true;
        let msg;
        if (navigator.onLine === false) msg = "You appear to be offline, so the image couldn't be loaded.";
        else {
          msg = "That link couldn't be loaded as an image. The address may be wrong or the file removed, it may not be an image format your browser can show, the site may block use on other websites, or it may need you to sign in.";
          if (url.startsWith('http:')) msg += ' This link is http, and browsers often block http images on secure pages, so try the https version.';
          if (!IMG_SHOW_EXT.has(currentExtFor)) msg += " If this is a link to a page that shows the image, open it and copy the image's own address instead.";
        }
        setStatus(status, msg, 'error');
      };
      img.src = url;
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); previewUrl(); });
    // A pasted link previews at once. Typing does not: that would send half-typed addresses to other websites.
    input.addEventListener('paste', () => setTimeout(() => { if (input.value.trim()) previewUrl(); }, 0));
    input.addEventListener('input', () => { if (!input.value.trim() && (currentUrl || status.textContent)) resetUrlPreview(true); });
    $i('imgurl-clear').addEventListener('click', () => { resetUrlPreview(false); input.focus(); });
    $i('imgurl-copy').addEventListener('click', async () => {
      if (!sourceBox.value) return;
      if (!(await copyText(sourceBox.value))) return;
      showToast('Copied!');
    });

    async function downloadImage(){
      if (!currentUrl || dlBusy) return;
      dlBusy = true; dlBtn.disabled = true;
      const url = currentUrl, ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
      setStatus(status, 'Downloading…', 'busy');
      const blocked = "Your browser blocked the download. The website hosting this image doesn't allow other sites to fetch it, or the connection failed. The preview works because showing an image is allowed even when copying it isn't. Use Open in new tab and save it from there.";
      try {
        let res;
        try { res = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl.signal }); }
        catch (err) { setStatus(status, err && err.name === 'AbortError' ? 'The download took too long (over 30 seconds), so it was stopped.' : blocked, 'error'); return; }
        if (!res.ok) { setStatus(status, `The server answered ${res.status}${res.statusText ? ' ' + res.statusText : ''}, so nothing was saved.`, 'error'); return; }
        const declared = Number(res.headers.get('content-length'));
        if (declared > IMG_DL_MAX) { setStatus(status, `That file is ${imgFormatBytes(declared)}, over the ${imgFormatBytes(IMG_DL_MAX)} limit for downloading here. Use Open in new tab instead.`, 'error'); return; }
        const blob = await res.blob();
        if (blob.size > IMG_DL_MAX) { setStatus(status, `That file is over the ${imgFormatBytes(IMG_DL_MAX)} limit for downloading here. Use Open in new tab instead.`, 'error'); return; }
        const mime = (blob.type || '').split(';')[0].toLowerCase();
        if (!mime.startsWith('image/')) { setStatus(status, `The server sent ${mime || 'an unknown file type'}, not an image, so nothing was saved.`, 'error'); return; }
        const name = imgSafeName(url, mime), obj = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = obj; a.download = name; a.rel = 'noopener'; a.hidden = true;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(obj), 4000);
        setStatus(status, `Download started: ${name} (${imgFormatBytes(blob.size)}). Look in your downloads folder.`, 'ok');
      } catch {
        setStatus(status, blocked, 'error');
      } finally {
        clearTimeout(timer); dlBusy = false; dlBtn.disabled = false;
      }
    }
    dlBtn.addEventListener('click', downloadImage);

    // ---- Your image: a local preview. Nothing is sent anywhere until Upload to ImgBB is pressed, and neither the image nor its name is stored.
    const drop = $i('imgfile-drop'), fileInput = $i('imgfile-input'), fStatus = $i('imgfile-status');
    const fStage = $i('imgfile-stage'), fImg = $i('imgfile-img'), fResult = $i('imgfile-result'), facts = $i('imgfile-facts');
    let fileObjUrl = '', fileTicket = 0;
    let upFile = null, upKind = '', upBusy = false, upDelete = '';
    const upBtn = $i('imgup-btn'), upStatus = $i('imgup-status'), upDone = $i('imgup-done');
    // Every preview link made for a file is released when the file is replaced, rejected, cleared or the page goes away.
    function releaseFile(){
      if (fileObjUrl) { URL.revokeObjectURL(fileObjUrl); fileObjUrl = ''; }
    }
    function resetFile(){
      fileTicket++; releaseFile();
      fImg.removeAttribute('src'); fStage.hidden = true; fResult.hidden = true; facts.innerHTML = '';
      fileInput.value = ''; setStatus(fStatus, '');
      // An upload already on its way is left to finish (its result appears in the box below); only the chosen file is forgotten.
      upFile = null; upKind = ''; setStatus(upStatus, ''); syncUpBtn();
    }
    function syncUpBtn(){
      upBtn.disabled = !upFile || upBusy;
      upBtn.textContent = upBusy ? 'Uploading…' : 'Upload to ImgBB';
      if (upBusy) upBtn.setAttribute('aria-busy', 'true'); else upBtn.removeAttribute('aria-busy');
    }
    window.addEventListener('pagehide', (e) => { if (!e.persisted) releaseFile(); });
    const fail = (msg) => setStatus(fStatus, msg, 'error');
    async function pickFile(file, extra){
      resetFile();
      if (!file) return;
      const ticket = fileTicket, name = file.name;
      // Size first, so an oversized file is never read or decoded.
      if (file.size === 0) return fail(`"${name}" is empty.`);
      if (file.size > IMG_FILE_MAX) return fail(`"${name}" is ${imgFormatBytes(file.size)}. The limit here is ${imgFormatBytes(IMG_FILE_MAX)}.`);
      setStatus(fStatus, 'Checking the file…', 'busy');
      let head;
      try { head = new Uint8Array(await file.slice(0, 65536).arrayBuffer()); }
      catch { return fail(`"${name}" couldn't be read. It may have been moved or deleted. Choose it again.`); }
      if (ticket !== fileTicket) return;
      const ext = (name.split('.').pop() || '').toLowerCase();
      const kind = imgSniff(head);   // what the file's bytes say it is, not what its name says
      if (!kind) {
        if (IMG_NO_SHOW_EXT.has(ext) || /^image\/(heic|heif|tiff)/.test(file.type)) return fail(`"${name}" is a ${(IMG_NO_SHOW_EXT.has(ext) ? ext : file.type.split('/')[1]).toUpperCase()} file, which most browsers can't show. Convert it to PNG or JPG first.`);
        if (file.type.startsWith('image/') || IMG_SHOW_EXT.has(ext)) return fail(`"${name}" couldn't be read as an image. It may be damaged or not really ${(IMG_SHOW_EXT.has(ext) ? ext : file.type.split('/')[1]).toUpperCase()}.`);
        return fail(`"${name}" isn't a supported image. Use PNG, JPG, GIF, WebP, AVIF, BMP or SVG.`);
      }
      const label = kind.toUpperCase();
      const named = ({ jpeg: 'jpg', jpg: 'jpg', png: 'png', gif: 'gif', webp: 'webp', avif: 'avif', bmp: 'bmp', svg: 'svg' })[ext];
      const notes = [];
      if (extra) notes.push(extra);
      if (named && named !== kind) notes.push(`The name says .${ext} but the file is really ${label}, so it is shown as ${label}.`);
      const px = imgHeaderSize(kind, head);
      if (px && px.w * px.h > IMG_MAX_PIXELS) return fail(`"${name}" is ${px.w} × ${px.h} px (${Math.round(px.w * px.h / 1e6)} megapixels). That's more than this page will try to show (limit ${IMG_MAX_PIXELS / 1e6} megapixels), because it could freeze your browser.`);
      const svgText = kind === 'svg' ? new TextDecoder('utf-8').decode(head) : '';
      // Give the preview the type the bytes proved, not the one the file name implied: a browser will not draw an SVG
      // that arrives labelled as image/png.
      fileObjUrl = URL.createObjectURL(file.slice(0, file.size, IMG_KIND_MIME[kind]));
      setStatus(fStatus, 'Reading the image…', 'busy');
      let tail = null;
      try { tail = new Uint8Array(await file.slice(Math.max(0, file.size - 64)).arrayBuffer()); } catch { /* the preview still runs */ }
      if (ticket !== fileTicket) { releaseFile(); return; }
      if (tail && imgLooksCutShort(kind, tail)) notes.push('This file looks cut short, so the preview may be incomplete.');
      fImg.onload = () => {
        if (ticket !== fileTicket) return;
        fStage.hidden = false; fResult.hidden = false;
        const size = (kind === 'svg' && !imgSvgHasSize(svgText)) ? 'No fixed size (it scales to fit)' : `${fImg.naturalWidth} × ${fImg.naturalHeight} px`;
        const rows = [['Name', name], ['Type', label], ['Size', imgFormatBytes(file.size)], ['Dimensions', size]];
        facts.innerHTML = '';
        rows.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; facts.append(dt, dd); });
        notes.push('Previewed on this device only. Nothing has been uploaded.');
        setStatus(fStatus, notes.join(' '), 'ok');
        // Only what the bytes prove to be a PNG, JPG, GIF or WebP within the limit can be uploaded, and it is sent unchanged.
        const why = !IMG_UP_TYPES[kind] ? `${label} files can't be uploaded here. Uploading accepts PNG, JPG, GIF and WebP.`
          : file.size > IMG_UP_MAX ? `This file is ${imgFormatBytes(file.size)}. The upload limit is ${imgFormatBytes(IMG_UP_MAX)}, so it can be previewed but not uploaded.`
          : (tail && imgLooksCutShort(kind, tail)) ? 'This file looks cut short, so it can\'t be uploaded.' : '';
        upFile = why ? null : file; upKind = why ? '' : kind;
        setStatus(upStatus, why || '', why ? 'error' : '');
        syncUpBtn();
        $i('imgurl-host').open = true;
      };
      fImg.onerror = () => {
        if (ticket !== fileTicket) return;
        releaseFile(); fImg.removeAttribute('src'); fStage.hidden = true; fResult.hidden = true;
        fail(`"${name}" looks like ${label}, but the browser couldn't decode it. It may be damaged, cut short, or too large for your browser to handle.`);
      };
      fImg.src = fileObjUrl;
    }
    fileInput.addEventListener('change', () => pickFile(fileInput.files && fileInput.files[0]));
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      pickFile(files[0], files.length > 1 ? 'Only the first file was used.' : '');
    });
    $i('imgfile-clear').addEventListener('click', resetFile);

    // ---- Upload to ImgBB. Goes to this site's /api/upload function, which holds the key and talks to ImgBB.
    async function doUpload(){
      if (upBusy || !upFile) return;           // one upload at a time, so a double tap cannot send the file twice
      const file = upFile, kind = upKind, keep = $i('imgup-expiry').value;
      upBusy = true; syncUpBtn(); setStatus(upStatus, 'Uploading to ImgBB… keep this page open.', 'busy');
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 45000);
      let message = '', data = null;
      try {
        const res = await fetch('/api/upload?expire=' + encodeURIComponent(Object.prototype.hasOwnProperty.call(IMG_UP_KEEP, keep) ? keep : 'never'),
          { method: 'POST', headers: { 'Content-Type': IMG_UP_TYPES[kind], 'X-LU-Upload': '1' }, body: file, signal: ctl.signal, credentials: 'omit', cache: 'no-store' });
        let j = null; try { j = await res.json(); } catch { /* not JSON */ }
        const url = j && imgbbLink(j.url);
        if (res.ok && j && j.ok === true && url) data = { url, deleteUrl: imgbbLink(j.deleteUrl), keep: Object.prototype.hasOwnProperty.call(IMG_UP_KEEP, j.expire) ? j.expire : 'never' };
        else if (res.ok) message = 'The upload service gave an answer this page could not use, so no link was made.';
        else if (j && typeof j.message === 'string' && j.message.length < 200) message = j.message;
        else if (res.status === 404) message = 'Uploading is not available on this site yet.';
        else if (res.status === 413) message = `That image is over the ${imgFormatBytes(IMG_UP_MAX)} upload limit.`;
        else if (res.status === 429) message = 'Too many uploads. Wait a little and try again.';
        else message = 'The upload failed. Try again in a moment.';
      } catch (e) {
        message = e && e.name === 'AbortError' ? 'The upload took too long, so this page stopped waiting. The image may still have reached ImgBB, but no link was received. Try again.'
          : "Couldn't reach the upload service. Check your connection and try again.";
      } finally { clearTimeout(timer); upBusy = false; syncUpBtn(); }
      if (!data) { setStatus(upStatus, message, 'error'); return; }
      upDelete = data.deleteUrl;
      $i('imgup-url').value = data.url; $i('imgup-open').href = data.url;
      $i('imgup-copy-delete').hidden = !upDelete;
      $i('imgup-done-note').textContent = 'This image is now hosted by ImgBB, and anyone who has the link can open it. Hiding this box or clearing the preview does not delete it.'
        + (upDelete ? ' The delete link lets anyone who has it remove the image, so keep it private.' : '')
        + (data.keep === 'never' ? ' No automatic deletion was requested. How long ImgBB keeps it is up to ImgBB.' : ` ImgBB was asked to delete it automatically after ${IMG_UP_KEEP[data.keep]}. This page can't confirm that it will.`);
      upDone.hidden = false;
      setStatus(upStatus, 'Uploaded. Your public link is below.', 'ok');
    }
    upBtn.addEventListener('click', doUpload);
    $i('imgup-copy').addEventListener('click', async () => { const v = $i('imgup-url').value; if (v && await copyText(v)) showToast('Copied!'); });
    $i('imgup-copy-delete').addEventListener('click', async () => { if (upDelete && await copyText(upDelete)) showToast('Delete link copied'); });
    $i('imgup-hide').addEventListener('click', () => {
      upDone.hidden = true; $i('imgup-url').value = ''; $i('imgup-open').removeAttribute('href'); upDelete = ''; $i('imgup-copy-delete').hidden = true;
      setStatus(upStatus, 'Hidden. The image is still hosted on ImgBB.', '');
    });
    syncUpBtn();
  }

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
    const list = realEmbeds();
    if (list.length) payload.embeds = list.map(x => x.embed);
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

  /* ============ Border generator ============ */
  // The symbol browser and the divider list moved to symbols.js in v10.0 (Brackets & symbols, Logos & icons).
  const BORDER_STYLES = {
    single:  { tl:'┌', tr:'┐', bl:'└', br:'┘', h:'─', v:'│' },
    rounded: { tl:'╭', tr:'╮', bl:'╰', br:'╯', h:'─', v:'│' },
    double:  { tl:'╔', tr:'╗', bl:'╚', br:'╝', h:'═', v:'║' },
    heavy:   { tl:'┏', tr:'┓', bl:'┗', br:'┛', h:'━', v:'┃' },
    ascii:   { tl:'+', tr:'+', bl:'+', br:'+', h:'-', v:'|' },
  };
  const borderTextInput = document.getElementById('border-text-input');
  const borderStyleSelect = document.getElementById('border-style');
  const borderOutput = document.getElementById('border-output');
  function buildBorder(text, styleName){
    const b = BORDER_STYLES[styleName] || BORDER_STYLES.single;
    const lines = (text || '').split('\n');
    const width = Math.max(...lines.map(l => [...l].length), 1);
    const top = b.tl + b.h.repeat(width + 2) + b.tr;
    const bottom = b.bl + b.h.repeat(width + 2) + b.br;
    const middle = lines.map(l => b.v + ' ' + l + ' '.repeat(width - [...l].length) + ' ' + b.v);
    return [top, ...middle, bottom].join('\n');
  }
  function renderBorder(){
    if (!borderOutput) return;
    borderOutput.textContent = buildBorder(borderTextInput.value, borderStyleSelect?.value);
  }
  borderTextInput?.addEventListener('input', renderBorder);
  borderStyleSelect?.addEventListener('change', renderBorder);
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
    regionalLetters: (text) => TRANSFORMS.regionalLetters(String(text == null ? '' : text)),
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
      get(){ return { tzMode: tsTzMode, zone: tsZone, hourMode: tsHourMode, zones: [...tzState.zones] }; },
      isZone: isValidZone,
      set(o){
        // A restored preset re-reads the clock time in the saved zone, so the clock text stays as saved.
        if (typeof o.zone === 'string' && isValidZone(o.zone)) setTsZone(o.zone, { keepClock: true });
        else if (o.tzMode === 'utc') setTsZone('UTC', { keepClock: true });
        else if (o.tzMode === 'local' && BROWSER_TZ) setTsZone(BROWSER_TZ, { keepClock: true });
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
  if (savedSize !== null && sizeRange.isConnected) {
    sizeRange.value = String(savedSize);
    sizeLabel.textContent = savedSize + 'px';
    document.documentElement.style.setProperty('--preview-size', savedSize + 'px');
  }
  document.querySelectorAll('.live-controls .case-btn').forEach(b => b.classList.toggle('active', b.dataset.case === state.caseMode));
  renderCompatTable();
  renderFormatGrid();
  renderTemplateGrid();
  renderAnsiSwatches();
  renderPaletteGrid();
  syncColorInputs();
  renderAll();
})();
