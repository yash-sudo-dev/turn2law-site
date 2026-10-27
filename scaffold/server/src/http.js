// HTTP kernel: router with path params, JSON bodies, cookies, auth context,
// scope enforcement, audit hook, uniform errors, security headers.
// Zero dependencies by design for portability into the production repo.
import { hmacSign, safeEqual } from './crypto.js';

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message || code);
    this.status = status; this.code = code; this.fields = fields;
  }
}
export const err = (status, code, message, fields) => new ApiError(status, code, message, fields);

export function createRouter() {
  const routes = [];
  const add = (method, pattern, handler, opts = {}) => {
    const keys = [];
    const rx = new RegExp('^' + pattern.replace(/:[a-zA-Z]+/g, (m) => {
      keys.push(m.slice(1)); return '([^/]+)';
    }) + '$');
    routes.push({ method, rx, keys, handler, scope: opts.scope || null, public: !!opts.public });
  };
  return {
    routes,
    get: (p, h, o) => add('GET', p, h, o),
    post: (p, h, o) => add('POST', p, h, o),
    put: (p, h, o) => add('PUT', p, h, o),
    patch: (p, h, o) => add('PATCH', p, h, o),
    delete: (p, h, o) => add('DELETE', p, h, o),
  };
}

export function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(err(413, 'payload_too_large', 'Request body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        const obj = JSON.parse(text);
        if (obj && typeof obj === 'object') obj.__rawBody = text;
        resolve(obj);
      }
      catch { reject(err(400, 'bad_json', 'Body must be valid JSON')); }
    });
    req.on('error', reject);
  });
}

// In-memory rate limiter (per key). Production swaps in a shared store at the
// platform edge; the interface stays (PLT-009).
const buckets = new Map();
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > b.reset) { b.count = 0; b.reset = now + windowMs; }
  b.count += 1; buckets.set(key, b);
  if (b.count > limit) throw err(429, 'rate_limited', 'Too many requests, slow down.');
}

export async function dispatch(app, req, res, pathname) {
  const started = Date.now();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  try {
    for (const r of app.router.routes) {
      if (r.method !== req.method) continue;
      const m = pathname.match(r.rx);
      if (!m) continue;
      req.params = {};
      r.keys.forEach((k, i) => { req.params[k] = decodeURIComponent(m[i + 1]); });
      req.body = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)
        ? await readBody(req, r.bodyLimit || 1_000_000) : {};
      req.rawBody = req.body.__rawBody || null;
      if (req.body && typeof req.body === 'object') delete req.body.__rawBody;
      req.cookies = parseCookies(req);
      req.ctx = await app.resolveContext(req, r);        // auth + scopes, or null
      if (!r.public && !req.ctx) {
        throw err(401, 'unauthenticated', 'Authentication required.');
      }
      if (r.scope && !req.ctx.scopes.includes(r.scope)) {
        throw err(403, 'forbidden', `Requires scope: ${r.scope}`);
      }
      const result = await r.handler(req, res, app);
      if (result !== undefined && !res.writableEnded) sendJson(res, 200, result);
      app.log?.(`${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
      return;
    }
    throw err(404, 'not_found', 'No such endpoint.');
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    const code = e instanceof ApiError ? e.code : 'internal_error';
    if (status === 500) console.error('[api]', pathname, e);
    if (!res.headersSent) sendJson(res, status, { error: { code, message: e.message } });
    else res.end();
  }
}

export function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

export function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.clear) parts.push('Max-Age=0');
  if (opts.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// Signed file download tokens (dev stand-in for object-storage signed URLs;
// production swaps the storage adapter, same expiring-token contract).
export function signFileToken(secret, fileId, ttlMs) {
  const exp = Date.now() + ttlMs;
  return `${exp}.${hmacSign(secret, `${fileId}.${exp}`)}`;
}
export function verifyFileToken(secret, fileId, token) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, hmacSign(secret, `${fileId}.${exp}`));
}
