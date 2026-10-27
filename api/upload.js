'use strict';
/* Luka's Utils v10.0: image upload relay to ImgBB (Vercel Function, Node.js runtime, no framework).

   What it does: accepts ONE image as the raw request body, checks it, sends it to ImgBB's upload API and returns
   the public link ImgBB confirms. It is not a general proxy: the destination is fixed, only four image types are
   accepted, and nothing is stored here.

   The ImgBB key is read ONLY from the server environment variable IMGBB_API_KEY. It is never put in a response,
   a log line or any file in this project.

   Vercel rejects request bodies over 4.5 MB before this code runs, so the limit here is a conservative 4 MB. */

const crypto = require('crypto');

const MAX_BYTES = 4 * 1024 * 1024;
const UPSTREAM = 'https://api.imgbb.com/1/upload';
const UPSTREAM_TIMEOUT_MS = 20000;
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
// Keep-for choices, in seconds. ImgBB accepts 60 to 15552000; only these fixed values are ever forwarded.
const EXPIRY = { never: 0, '1h': 3600, '1d': 86400, '7d': 604800, '30d': 2592000 };

// ---- Best-effort abuse limits. These live in one function instance's memory, so they reset when the instance is
// replaced and are not shared between instances. They are a second layer. The real limit is a Vercel Firewall rate-limit rule.
const PER_MINUTE = 5, PER_HOUR = 20, MAX_TRACKED = 5000;
const SALT = crypto.randomBytes(16);
const hits = new Map();
let failStreak = 0, pausedUntil = 0;

function clientKey(req) {
  const h = req.headers || {};
  const ip = String(h['x-real-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || 'unknown').trim();
  return crypto.createHash('sha256').update(SALT).update(ip).digest('hex').slice(0, 24);   // the raw address is never kept
}
function rateLimited(key, now) {
  if (hits.size > MAX_TRACKED) { for (const [k, v] of hits) { if (!v.length || now - v[v.length - 1] > 3600000) hits.delete(k); } if (hits.size > MAX_TRACKED) hits.clear(); }
  const arr = (hits.get(key) || []).filter((t) => now - t < 3600000);
  const lastMinute = arr.filter((t) => now - t < 60000).length;
  if (lastMinute >= PER_MINUTE || arr.length >= PER_HOUR) {
    hits.set(key, arr);
    const oldest = lastMinute >= PER_MINUTE ? arr.filter((t) => now - t < 60000)[0] + 60000 : arr[0] + 3600000;
    return Math.max(1, Math.ceil((oldest - now) / 1000));
  }
  arr.push(now); hits.set(key, arr);
  return 0;
}

// ---- Image checks: what the bytes say, not what the name or header claims.
function sniff(b) {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && b.toString('latin1', 0, 4) === 'GIF8' && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return 'image/gif';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
// A file that stops early is refused here instead of being sent on.
function looksComplete(b, type) {
  if (type === 'image/png') return b.length >= 20 && b.toString('latin1', b.length - 8, b.length - 4) === 'IEND';
  if (type === 'image/gif') return b[b.length - 1] === 0x3b;
  if (type === 'image/jpeg') { for (let i = b.length - 1; i >= Math.max(1, b.length - 32); i--) { if (b[i] === 0xd9 && b[i - 1] === 0xff) return true; } return false; }
  if (type === 'image/webp') return b.length >= 16 && b.readUInt32LE(4) + 8 <= b.length;
  return false;
}

// ---- Provider response: nothing is trusted until it has been checked.
function ibbUrl(v) {
  if (typeof v !== 'string' || v.length > 600) return null;
  let u; try { u = new URL(v); } catch (e) { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  if (!(u.hostname === 'ibb.co' || u.hostname.endsWith('.ibb.co'))) return null;
  return u.href;
}
function readProvider(text) {
  let j; try { j = JSON.parse(text); } catch (e) { return null; }
  if (!j || typeof j !== 'object' || j.success !== true || j.status !== 200 || !j.data || typeof j.data !== 'object') return null;
  const d = j.data;
  const url = ibbUrl(d.url);
  if (!url) return null;                       // no confirmed link, no success
  const num = (n) => (Number.isFinite(Number(n)) && Number(n) >= 0 ? Math.round(Number(n)) : null);
  return { url, displayUrl: ibbUrl(d.display_url) || url, viewerUrl: ibbUrl(d.url_viewer), deleteUrl: ibbUrl(d.delete_url), width: num(d.width), height: num(d.height), bytes: num(d.size) };
}

function send(res, status, body, extra) {
  const headers = Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, extra || {});
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}
const fail = (res, status, code, message, extra) => send(res, status, { ok: false, code, message }, extra);

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, over = false, settled = false;
    const done = (fn, v) => { if (!settled) { settled = true; fn(v); } };
    req.on('data', (c) => { if (over) return; size += c.length; if (size > limit) { over = true; chunks.length = 0; done(reject, Object.assign(new Error('too_large'), { code: 'too_large' })); return; } chunks.push(c); });
    req.on('end', () => done(resolve, Buffer.concat(chunks, size)));
    req.on('error', () => done(reject, Object.assign(new Error('read_error'), { code: 'read_error' })));
    req.on('aborted', () => done(reject, Object.assign(new Error('read_error'), { code: 'read_error' })));
  });
}

async function handler(req, res) {
  try {
    if (req.method !== 'POST') return fail(res, 405, 'method', 'Use POST to upload an image.', { Allow: 'POST' });
    const h = req.headers || {};
    // A custom header makes browsers run a cross-site check first, which this endpoint never allows.
    if (h['x-lu-upload'] !== '1') return fail(res, 400, 'bad_request', 'This request did not come from the upload page.');
    if (h['sec-fetch-site'] && h['sec-fetch-site'] !== 'same-origin') return fail(res, 403, 'forbidden', 'Uploads are only accepted from this website.');
    if (h.origin && h.host) { let o; try { o = new URL(h.origin).host; } catch (e) { o = ''; } if (o !== h.host) return fail(res, 403, 'forbidden', 'Uploads are only accepted from this website.'); }

    const key = process.env.IMGBB_API_KEY;
    if (!key || typeof key !== 'string' || !key.trim()) return fail(res, 503, 'not_configured', 'Uploading is not set up on this site yet.');

    const ctype = String(h['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!TYPES[ctype]) return fail(res, 415, 'type', 'Only PNG, JPG, GIF and WebP images can be uploaded.');
    const len = Number(h['content-length']);
    if (Number.isFinite(len) && len > MAX_BYTES) return fail(res, 413, 'too_large', 'That image is over the 4 MB upload limit.');

    let expire = 'never';
    try { const q = new URL(req.url || '/', 'http://x').searchParams.get('expire'); if (q !== null) expire = q; } catch (e) { /* default */ }
    if (!Object.prototype.hasOwnProperty.call(EXPIRY, expire)) return fail(res, 400, 'bad_request', 'That keep-for choice is not recognised.');

    const now = Date.now();
    if (pausedUntil > now) return fail(res, 503, 'unavailable', 'Uploading is paused for a moment because ImgBB keeps failing. Try again shortly.', { 'Retry-After': String(Math.ceil((pausedUntil - now) / 1000)) });
    const wait = rateLimited(clientKey(req), now);
    if (wait) return fail(res, 429, 'rate_limited', 'Too many uploads. Wait a little and try again.', { 'Retry-After': String(wait) });

    let body;
    try { body = await readBody(req, MAX_BYTES); }
    catch (e) { return e.code === 'too_large' ? fail(res, 413, 'too_large', 'That image is over the 4 MB upload limit.') : fail(res, 400, 'bad_request', 'The upload was interrupted. Try again.'); }
    if (!body.length) return fail(res, 400, 'empty', 'The file is empty.');
    const real = sniff(body);
    if (!real) return fail(res, 415, 'type', 'That file is not a PNG, JPG, GIF or WebP image.');
    if (real !== ctype) return fail(res, 415, 'type', 'The file contents do not match its type.');
    if (!looksComplete(body, real)) return fail(res, 422, 'truncated', 'The file looks cut short or damaged, so it was not uploaded.');

    const form = new FormData();
    form.append('image', new Blob([body], { type: real }), 'image.' + TYPES[real]);   // the original file name is never sent
    const url = new URL(UPSTREAM);
    url.searchParams.set('key', key.trim());
    if (EXPIRY[expire]) url.searchParams.set('expiration', String(EXPIRY[expire]));

    let up, text;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      up = await fetch(url, { method: 'POST', body: form, signal: ctl.signal, redirect: 'error' });
      text = (await up.text()).slice(0, 65536);
    } catch (e) {
      failStreak++; if (failStreak >= 5) { pausedUntil = Date.now() + 30000; failStreak = 0; }
      console.error('imgbb upload failed:', e && e.name === 'AbortError' ? 'timeout' : 'network');   // no URL, key or image data in logs
      return e && e.name === 'AbortError' ? fail(res, 504, 'timeout', 'ImgBB took too long to answer. Try again.') : fail(res, 502, 'network', 'Could not reach ImgBB. Try again in a moment.');
    } finally { clearTimeout(timer); }

    if (up.status === 429) { console.error('imgbb upload failed: upstream 429'); return fail(res, 429, 'provider_busy', 'ImgBB is limiting uploads right now. Try again later.', { 'Retry-After': '60' }); }
    if (up.status === 401 || up.status === 403) { console.error('imgbb upload failed: upstream ' + up.status + ' (check IMGBB_API_KEY)'); return fail(res, 503, 'not_configured', 'Uploading is unavailable right now.'); }
    if (up.status >= 500) { failStreak++; if (failStreak >= 5) { pausedUntil = Date.now() + 30000; failStreak = 0; } console.error('imgbb upload failed: upstream ' + up.status); return fail(res, 502, 'provider', 'ImgBB had a problem. Try again later.'); }
    if (up.status >= 400) { console.error('imgbb upload failed: upstream ' + up.status); return fail(res, 502, 'rejected', 'ImgBB did not accept that image.'); }
    const out = readProvider(text);
    if (!out) { failStreak++; if (failStreak >= 5) { pausedUntil = Date.now() + 30000; failStreak = 0; } console.error('imgbb upload failed: unexpected response'); return fail(res, 502, 'provider', 'ImgBB gave an answer this page could not use, so no link was made.'); }
    failStreak = 0;
    out.ok = true; out.expire = expire;
    return send(res, 200, out);
  } catch (e) {
    console.error('upload handler error');   // nothing from the request or the error is logged
    return fail(res, 500, 'server', 'Something went wrong on the server. Try again.');
  }
}

module.exports = handler;
module.exports._test = { sniff, looksComplete, readProvider, ibbUrl, MAX_BYTES, EXPIRY, reset() { hits.clear(); failStreak = 0; pausedUntil = 0; } };
