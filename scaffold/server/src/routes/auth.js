// Auth and account routes (Phase 1). PLT-001 to PLT-008.
import { signup, login, logout, SESSION_COOKIE, audit } from '../auth.js';
import { err, setCookie, rateLimit } from '../http.js';
import { newToken, sha256, hashPassword } from '../crypto.js';

export function registerAuthRoutes(app) {
  const R = app.router;

  R.post('/api/auth/signup', async (req) => {
    const result = await signup(app, req.body);
    return result;
  }, { public: true });

  R.post('/api/auth/login', async (req, res) => {
    rateLimit(`login-ip:${app.clientIp}`, 30, 60_000);
    const { token } = await login(app, req.body);
    setCookie(res, SESSION_COOKIE, token, { maxAge: 7 * 86400, secure: app.config.secureCookies });
    return { ok: true };
  }, { public: true });

  R.post('/api/auth/logout', async (req, res) => {
    await logout(app, req.ctx);
    setCookie(res, SESSION_COOKIE, '', { clear: true });
    return { ok: true };
  }, { public: true });

  // Email verification: single-use hashed token (PLT-001). In DEV the link is
  // exposed via the admin outbox because no mail provider is configured.
  R.get('/api/auth/verify', async (req, res) => {
    const token = req.url.searchParams.get('token');
    const rows = await app.db.system(
      'select id, expires_at, accepted_at from invitations where token_hash = $1', [sha256(token || '')]);
    const inv = rows[0];
    if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
      throw err(400, 'invalid_token', 'This verification link is invalid or has expired.');
    }
    await app.db.system('update invitations set accepted_at = now() where id = $1', [inv.id]);
    await app.db.system('update auth.users set email_verified_at = now() where id = (select user_id from org_members where org_id = $1 limit 1)', [inv.org_id]);
    res.writeHead(302, { Location: '/login?verified=1' });
    res.end();
    return undefined;
  }, { public: true });

  R.post('/api/auth/password-reset', async (req) => {
    const email = String(req.body.email || '').toLowerCase();
    rateLimit(`reset:${email}`, 3, 60_000);
    const rows = await app.db.system('select id from auth.users where email = $1', [email]);
    if (!rows.length) return { ok: true };  // no account enumeration
    const token = newToken();
    await app.db.system(`insert into invitations (org_id, email, role, token_hash, expires_at)
      values ((select org_id from org_members where user_id = $1 limit 1), $2, 'founder', $3, now() + interval '1 hour')`,
      [rows[0].id, email, sha256(token)]);
    const mail = await app.adapters.mail.send({ to: email, template: 'password_reset', data: { reset_url: `${app.config.appUrl}/reset?token=${token}` } });
    return { ok: true, delivery: { delivered: mail.delivered, reason: mail.reason }, dev_reset_url: mail.devLink };
  }, { public: true });

  R.post('/api/auth/password-reset/confirm', async (req) => {
    const { token, password } = req.body;
    if (!password || password.length < 10) throw err(400, 'weak_password', 'Password must be at least 10 characters.');
    const rows = await app.db.system(
      'select id, email, expires_at, accepted_at from invitations where token_hash = $1', [sha256(token || '')]);
    const inv = rows[0];
    if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
      throw err(400, 'invalid_token', 'This reset link is invalid or has expired.');
    }
    const user = await app.db.system('select id from auth.users where email = $1', [inv.email]);
    if (!user.length) throw err(400, 'invalid_token', 'This reset link is invalid or has expired.');
    await app.db.system('update auth.users set encrypted_password = $1 where id = $2', [hashPassword(password), user[0].id]);
    await app.db.system('update invitations set accepted_at = now() where id = $1', [inv.id]);
    await app.db.system('update sessions set revoked_at = now() where user_id = $1 and revoked_at is null', [user[0].id]);
    await audit(app, { actorId: user[0].id, action: 'auth.password_reset', entityType: 'user', entityId: user[0].id });
    return { ok: true };
  }, { public: true });

  R.get('/api/me', async (req) => ({
    user: { id: req.ctx.userId, name: req.ctx.name, email: req.ctx.email },
    org: { id: req.ctx.orgId, name: req.ctx.orgName, role: req.ctx.roles.join(', ') || null },
    scopes: req.ctx.scopes,
  }));

  R.get('/api/me/sessions', async (req) => {
    const rows = await app.db.system(`
      select s.id, s.device_label, s.created_at, s.last_seen_at,
             (s.revoked_at is null) as active, (s.id = $2) as current
      from sessions s where s.user_id = $1 order by s.created_at desc limit 50`,
      [req.ctx.userId, req.ctx.sessionId]);
    return { sessions: rows };
  });

  R.delete('/api/me/sessions/:id', async (req) => {
    const rows = await app.db.system(
      'select id from sessions where id = $1 and user_id = $2', [req.params.id, req.ctx.userId]);
    if (!rows.length) throw err(404, 'not_found', 'Session not found.');
    await app.db.system('update sessions set revoked_at = now() where id = $1', [req.params.id]);
    await audit(app, { actorId: req.ctx.userId, action: 'auth.session_revoked', entityType: 'session', entityId: req.params.id });
    return { ok: true };
  });

  R.post('/api/me/orgs/:id/switch', async (req, res) => {
    const member = req.ctx && await app.db.system(
      "select 1 from org_members where org_id = $1 and user_id = $2 and member_status = 'active'",
      [req.params.id, req.ctx.userId]);
    if (!member.length) throw err(404, 'not_found', 'Organization not found.');
    setCookie(res, 't2l_org', req.params.id, { maxAge: 7 * 86400, secure: app.config.secureCookies });
    return { ok: true };
  });
}
