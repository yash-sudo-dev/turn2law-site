// Auth and request context: sessions, user/org resolution, scope loading.
// Session cookie is httpOnly; sessions are server-side revocable (PLT-002/007).
import { newToken, sha256, verifyPassword, hashPassword } from './crypto.js';
import { err, rateLimit } from './http.js';

export const SESSION_COOKIE = 't2l_session';

export async function signup(app, { email, password, name }) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw err(400, 'invalid_email', 'Enter a valid email address.');
  if (!password || password.length < 10) throw err(400, 'weak_password', 'Password must be at least 10 characters.');
  rateLimit(`signup:${email}`, 5, 60_000);
  const existing = await app.db.system('select id from auth.users where email = $1', [email]);
  if (existing.length) throw err(409, 'email_taken', 'An account with this email already exists.');
  const id = crypto.randomUUID();
  // Local dev adapter writes auth.users directly; the production adapter calls
  // Supabase Auth. Seam documented in adapters.js.
  await app.db.system(`insert into auth.users (id, email, encrypted_password) values ($1,$2,$3)`,
    [id, email, hashPassword(password)]);
  await app.db.system(`insert into profiles (id, name) values ($1,$2)`, [id, name || '']);
  const orgId = crypto.randomUUID();
  await app.db.system(`insert into organizations (id, name, slug, type, created_by)
    values ($1,$2,$3,'client',$4)`, [orgId, `${name || email}'s org`, `org-${orgId.slice(0, 8)}`, id]);
  await app.db.system(`insert into org_members (org_id, user_id, role, member_status, joined_at)
    values ($1,$2,'client_org_admin','active', now())`, [orgId, id]);
  const verifyToken = newToken();
  await app.db.system(`insert into invitations (org_id, email, role, token_hash, expires_at)
    values ($1,$2,'founder',$3, now() + interval '2 days')`, [orgId, email, sha256(verifyToken)]);
  await app.adapters.mail.send({
    to: email,
    template: 'verify_email',
    data: { verify_url: `${app.config.appUrl}/api/auth/verify?token=${verifyToken}` },
  });
  await audit(app, { actorId: id, orgId, action: 'auth.signup', entityType: 'user', entityId: id });
  return { user: { id, email, name }, orgId };
}

export async function login(app, { email, password }) {
  email = String(email || '').trim().toLowerCase();
  rateLimit(`login:${email}|${app.clientIp}`, 10, 60_000);
  const rows = await app.db.system('select id, encrypted_password from auth.users where email = $1', [email]);
  if (!rows.length || !verifyPassword(password, rows[0].encrypted_password)) {
    throw err(401, 'bad_credentials', 'Email or password is incorrect.');
  }
  const userId = rows[0].id;
  const suspended = await app.db.system("select 1 from profiles where id = $1 and status = 'suspended'", [userId]);
  if (suspended.length) throw err(403, 'account_suspended', 'This account is suspended. Contact support.');
  const token = newToken();
  await app.db.system(`insert into sessions (id, user_id, token_hash, device_label, ip_hash, user_agent)
    values (gen_random_uuid(), $1, $2, $3, $4, $5)`,
    [userId, sha256(token), '', sha256(email), (app.userAgent || '').slice(0, 120)]);
  await audit(app, { actorId: userId, action: 'auth.login', entityType: 'user', entityId: userId });
  return { token, userId };
}

export async function resolveContext(app, req, route) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  const rows = await app.db.system(`
    select s.id as session_id, s.revoked_at, p.id as user_id, p.name, p.status,
           (select email from auth.users u where u.id = p.id) as email
    from sessions s join profiles p on p.id = s.user_id
    where s.token_hash = $1`, [sha256(token)]);
  const s = rows[0];
  if (!s || s.revoked_at || s.status !== 'active') return null;
  const memberships = await app.db.system(`
    select m.org_id, m.role, o.name as org_name from org_members m
    join organizations o on o.id = m.org_id
    where m.user_id = $1 and m.member_status = 'active'`, [s.user_id]);
  const activeOrg = Number(req.cookies.t2l_org) && memberships.find(m => m.org_id === req.cookies.t2l_org)
    ? req.cookies.t2l_org : memberships[0]?.org_id || null;
  const roles = new Set(memberships.map(m => m.role));
  const scopeRows = activeOrg
    ? await app.db.system(`select distinct rs.scope from role_scopes rs
        where rs.role = any($1)`, [memberships.map(m => m.role)])
    : [];
  return {
    sessionId: s.session_id, userId: s.user_id, name: s.name, email: s.email,
    orgId: activeOrg, orgName: memberships.find(m => m.org_id === activeOrg)?.org_name || null,
    roles: [...roles], scopes: scopeRows.map(r => r.scope),
  };
}

export async function logout(app, ctx) {
  if (ctx) await app.db.system('update sessions set revoked_at = now() where id = $1', [ctx.sessionId]);
  return { ok: true };
}

// Append-only audit writer (PLT-019). Runs as system; the table denies
// UPDATE/DELETE to every request role.
export async function audit(app, { actorId, orgId, action, entityType, entityId, before, after, actorRole }) {
  await app.db.system(`
    insert into audit_log (org_id, actor_id, actor_role, action, entity_type, entity_id, before, after)
    values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [orgId || null, actorId || null, actorRole || null, action, entityType,
     entityId ? String(entityId) : null, before || null, after || null]);
}
