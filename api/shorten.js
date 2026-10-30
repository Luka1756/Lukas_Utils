'use strict';
/* Luka's Utils v11.0: link shortener relay to TinyURL (Vercel Function, Node.js runtime, no framework).

   What it does: accepts ONE web address as JSON, checks it, asks TinyURL's API to shorten it and returns the short
   link TinyURL confirms. It is not a general proxy: the destination is fixed, only http(s) addresses on ordinary
   public-looking host names are accepted, and nothing is stored here.

   The TinyURL API token is read ONLY from the server environment variable TINYURL_API_TOKEN. It is never put in a
   response, a log line or any file in this project.

   What was checked against TinyURL's own pages: the create endpoint is POST https://api.tinyurl.com/create and the
   token is sent as "Authorization: Bearer <token>". The exact shape of the success reply could not be read from TinyURL's
   documentation in the build environment, so the reply is checked strictly and anything unexpected is treated as a
   failure instead of being guessed at. */

const crypto = require('crypto');

const UPSTREAM = 'https://api.tinyurl.com/create';
const UPSTREAM_TIMEOUT_MS = 15000;
const MAX_URL = 2048;
const MAX_BODY = 4096;

// ---- Best-effort abuse limits (per function instance; the real limit is a Vercel Firewall rate-limit rule).
const PER_MINUTE = 3, PER_HOUR = 15, MAX_TRACKED = 5000;
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

// ---- The address to shorten: only what a normal public web link looks like.
const isIPv4 = (h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h);
function checkTarget(raw) {
  if (typeof raw !== 'string') return { error: 'Give a web address to shorten.' };
  const text = raw.trim();
  if (!text) return { error: 'Give a web address to shorten.' };
  if (text.length > MAX_URL) return { error: 'That address is too long (limit ' + MAX_URL + ' characters).' };
  if (/[\u0000-\u001f\u007f\s]/.test(text)) return { error: 'The address cannot contain spaces or control characters.' };
  let u; try { u = new URL(text); } catch (e) { return { error: 'That does not look like a full web address. Start it with http or https and a domain name.' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'Only http:// and https:// addresses can be shortened.' };
  if (u.username || u.password) return { error: 'Addresses with a user name or password in them are not accepted.' };
  const host = u.hostname.toLowerCase();
  if (host.startsWith('[') || isIPv4(host)) return { error: 'Addresses made of an IP number are not accepted. Use a normal domain name.' };
  if (host === 'localhost' || !host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost') || host.endsWith('.test') || host.endsWith('.invalid') || host.endsWith('.example')) return { error: 'That host name is not a public website, so it cannot be shortened.' };
  if (host === 'tinyurl.com' || host.endsWith('.tinyurl.com')) return { error: 'That is already a TinyURL link.' };
  return { url: u.href };
}

// ---- Provider reply: nothing is trusted until it has been checked.
function tinyLink(v) {
  if (typeof v !== 'string' || v.length > 200) return null;
  let u; try { u = new URL(v); } catch (e) { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) return null;
  if (u.hostname !== 'tinyurl.com') return null;
  if (!/^\/[A-Za-z0-9_-]{3,60}$/.test(u.pathname)) return null;
  return u.href;
}
function readProvider(text) {
  let j; try { j = JSON.parse(text); } catch (e) { return null; }
  if (!j || typeof j !== 'object' || !j.data || typeof j.data !== 'object') return null;
  if (j.code !== undefined && j.code !== 0) return null;
  if (Array.isArray(j.errors) && j.errors.length) return null;
  return tinyLink(j.data.tiny_url);               // no confirmed link, no success
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
    if (req.method !== 'POST') return fail(res, 405, 'method', 'Use POST to shorten a link.', { Allow: 'POST' });
    const h = req.headers || {};
    if (h['x-lu-shorten'] !== '1') return fail(res, 400, 'bad_request', 'This request did not come from the link shortener page.');
    if (h['sec-fetch-site'] && h['sec-fetch-site'] !== 'same-origin') return fail(res, 403, 'forbidden', 'Links are only shortened for this website.');
    if (h.origin && h.host) { let o; try { o = new URL(h.origin).host; } catch (e) { o = ''; } if (o !== h.host) return fail(res, 403, 'forbidden', 'Links are only shortened for this website.'); }

    const token = process.env.TINYURL_API_TOKEN;
    if (!token || typeof token !== 'string' || !token.trim()) return fail(res, 503, 'not_configured', 'Link shortening is not set up on this site yet.');

    const ctype = String(h['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (ctype !== 'application/json') return fail(res, 415, 'type', 'Send the address as JSON.');
    const len = Number(h['content-length']);
    if (Number.isFinite(len) && len > MAX_BODY) return fail(res, 413, 'too_large', 'That request is too large.');

    const now = Date.now();
    if (pausedUntil > now) return fail(res, 503, 'unavailable', 'Shortening is paused for a moment because TinyURL keeps failing. Try again shortly.', { 'Retry-After': String(Math.ceil((pausedUntil - now) / 1000)) });
    const wait = rateLimited(clientKey(req), now);
    if (wait) return fail(res, 429, 'rate_limited', 'Too many links shortened. Wait a little and try again.', { 'Retry-After': String(wait) });

    let body;
    try { body = await readBody(req, MAX_BODY); }
    catch (e) { return e.code === 'too_large' ? fail(res, 413, 'too_large', 'That request is too large.') : fail(res, 400, 'bad_request', 'The request was interrupted. Try again.'); }
    let parsed; try { parsed = JSON.parse(body.toString('utf8')); } catch (e) { return fail(res, 400, 'bad_request', 'The request could not be read.'); }
    const target = checkTarget(parsed && parsed.url);
    if (target.error) return fail(res, 422, 'invalid_url', target.error);

    let up, text;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      up = await fetch(UPSTREAM, {
        method: 'POST', redirect: 'error', signal: ctl.signal,
        headers: { Authorization: 'Bearer ' + token.trim(), 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ url: target.url, domain: 'tinyurl.com' }),
      });
      text = (await up.text()).slice(0, 65536);
    } catch (e) {
      failStreak++; if (failStreak >= 5) { pausedUntil = Date.now() + 30000; failStreak = 0; }
      console.error('tinyurl failed:', e && e.name === 'AbortError' ? 'timeout' : 'network');   // no address, token or reply in logs
      return e && e.name === 'AbortError' ? fail(res, 504, 'timeout', 'TinyURL took too long to answer. Try again.') : fail(res, 502, 'network', 'Could not reach TinyURL. Try again in a moment.');
    } finally { clearTimeout(timer); }

    if (up.status === 429) { console.error('tinyurl failed: upstream 429'); return fail(res, 429, 'provider_busy', 'TinyURL is limiting requests right now. Try again later.', { 'Retry-After': '60' }); }
    if (up.status === 401 || up.status === 403) { console.error('tinyurl failed: upstream ' + up.status + ' (check TINYURL_API_TOKEN)'); return fail(res, 503, 'not_configured', 'Link shortening is unavailable right now.'); }
    if (up.status >= 500) { failStreak++; if (failStreak >= 5) { pausedUntil = Date.now() + 30000; failStreak = 0; } console.error('tinyurl failed: upstream ' + up.status); return fail(res, 502, 'provider', 'TinyURL had a problem. Try again later.'); }
    if (up.status >= 400) { console.error('tinyurl failed: upstream ' + up.status); return fail(res, 502, 'rejected', 'TinyURL did not accept that address.'); }
    const link = readProvider(text);
    if (!link) { failStreak++; if (failStreak >= 5) { pausedUntil = Date.now() + 30000; failStreak = 0; } console.error('tinyurl failed: unexpected response'); return fail(res, 502, 'provider', 'TinyURL gave an answer this page could not use, so no short link was made.'); }
    failStreak = 0;
    return send(res, 200, { ok: true, short: link, original: target.url });
  } catch (e) {
    console.error('shorten handler error');   // nothing from the request or the error is logged
    return fail(res, 500, 'server', 'Something went wrong on the server. Try again.');
  }
}

module.exports = handler;
module.exports._test = { checkTarget, readProvider, tinyLink, reset() { hits.clear(); failStreak = 0; pausedUntil = 0; } };
