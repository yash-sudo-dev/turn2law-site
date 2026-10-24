// Admin panel API (Phase 2): users, orgs, audit, analytics, integration
// settings, dev mail outbox. Every route is scope-gated server-side (ADM-100);
// hidden navigation is never the control (PLT-011).
import { audit } from '../auth.js';
import { err } from '../http.js';

export function registerAdminRoutes(app) {
  const R = app.router;

  R.get('/api/admin/overview', async () => {
    const counts = async (sql, p) => (await app.db.system(sql, p))[0];
    const [users, orgs, orders, matters, resources, jobs] = await Promise.all([
      counts('select count(*)::int as n from profiles'),
      counts('select count(*)::int as n from organizations'),
      counts('select count(*)::int as n from orders'),
      counts("select count(*)::int as n from matters where closed_at is null"),
      counts("select review_status, count(*)::int as n from resources group by review_status"),
      counts("select state, count(*)::int as n from ingestion_jobs group by state"),
    ]);
    return {
      real_counts_only: true,
      users: users.n, orgs: orgs.n, orders: orders.n, active_matters: matters.n,
      resources_by_status: resources, ingestion_jobs_by_state: jobs,
      integrations: await app.db.system(
        'select key, config, updated_at from integrations order by key'),
    };
  }, { scope: 'audit.read' });

  R.get('/api/admin/users', async (req) => {
    const q = (req.url.searchParams.get('q') || '').trim();
    const params = [];
    let where = 'true';
    if (q) { params.push(`%${q}%`); where = `(p.name ilike $1 or u.email ilike $1)`; }
    const rows = await app.db.system(`
      select p.id, p.name, p.status, u.email, u.email_verified_at is not null as verified, p.created_at,
             (select string_agg(distinct m.role, ', ') from org_members m where m.user_id = p.id) as roles
      from profiles p join auth.users u on u.id = p.id
      where ${where} order by p.created_at desc limit 100`, params);
    return { users: rows };
  }, { scope: 'users.manage' });

  R.post('/api/admin/users/:id/suspend', async (req) => {
    const rows = await app.db.system(
      "update profiles set status = 'suspended', updated_at = now() where id = $1 returning id", [req.params.id]);
    if (!rows.length) throw err(404, 'not_found', 'User not found.');
    await app.db.system('update sessions set revoked_at = now() where user_id = $1 and revoked_at is null', [req.params.id]);
    await audit(app, { actorId: req.ctx.userId, action: 'user.suspend', entityType: 'user', entityId: req.params.id });
    return { ok: true };
  }, { scope: 'users.manage' });

  R.get('/api/admin/orgs', async () => {
    const rows = await app.db.system(`
      select o.id, o.name, o.type, o.created_at,
             (select count(*)::int from org_members m where m.org_id = o.id) as members
      from organizations o order by o.created_at desc limit 100`);
    return { orgs: rows };
  }, { scope: 'users.manage' });

  R.get('/api/admin/audit', async (req) => {
    const q = (req.url.searchParams.get('q') || '').trim();
    const params = [];
    let where = 'true';
    if (q) { params.push(`%${q}%`); where = `(action ilike $1 or entity_type ilike $1 or entity_id ilike $1)`; }
    const rows = await app.db.system(`
      select a.action, a.entity_type, a.entity_id, a.created_at, a.org_id, p.name as actor, u.email as actor_email
      from audit_log a left join profiles p on p.id = a.actor_id left join auth.users u on u.id = a.actor_id
      where ${where} order by a.created_at desc limit 200`, params);
    return { events: rows, note: 'Append-only. UPDATE/DELETE are revoked at the database level.' };
  }, { scope: 'audit.read' });

  R.get('/api/admin/analytics', async () => {
    const zeroResult = await app.db.system(
      "select query, count(*)::int as n from search_events where results_count = 0 group by query order by n desc limit 10");
    const topSearches = await app.db.system(
      'select query, count(*)::int as n from search_events group by query order by n desc limit 10');
    return {
      source: 'real query data only',
      zero_result_searches: zeroResult,
      top_searches: topSearches,
    };
  }, { scope: 'audit.read' });

  // Dev mail outbox: shows what the unconfigured mail adapter recorded
  // (honest 'skipped_unconfigured' status; DEV exposes action links).
  R.get('/api/admin/outbox', async () => {
    const rows = await app.db.system(`
      select id, template_key, payload, status, last_error, created_at
      from notifications where channel = 'email' order by created_at desc limit 50`);
    return { outbox: rows };
  }, { scope: 'settings.manage' });
}
