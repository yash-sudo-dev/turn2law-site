// Acceptance gates (acceptance-test-plan.md). Runs the real server with the
// real migrations and real RLS against PGlite. node --test test/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadConfig } from '../index.js';
import { seed } from '../src/seed.js';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { hmacSign } from '../src/crypto.js';

const DATA = join(import.meta.dirname, '..', '.testdata');
let app, base;
const sessions = {};  // name -> Cookie header string

function cookieFrom(res) {
  const set = res.headers.getSetCookie?.() || [];
  const session = set.find(c => c.startsWith('t2l_session='));
  return session ? session.split(';')[0] : null;
}
async function api(method, path, { body, as, headers } = {}) {
  const who = as || 'anon';
  const h = { 'Content-Type': 'application/json', ...(headers || {}) };
  if (who !== 'anon' && sessions[who]) h.Cookie = sessions[who];
  const res = await fetch(`${base}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data, res };
}
const withCookie = (name) => ({ Cookie: sessions[name] });

async function loginAs(name, email, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const ck = cookieFrom(res);
  if (ck) sessions[name] = ck;
  assert.equal(res.status, 200, `login ${name}`);
}
async function signupUser(name) {
  const email = `${name.toLowerCase()}@test.invalid`;
  const r = await api('POST', '/api/auth/signup', { body: { email, password: 'password-123', name } });
  assert.equal(r.status, 200, `signup ${name}: ${JSON.stringify(r.data)}`);
  await loginAs(name, email, 'password-123');
  return { email };
}

before(async () => {
  rmSync(DATA, { recursive: true, force: true });
  const config = loadConfig({ ...process.env, T2L_DATA_DIR: DATA, PORT: String(5800 + Math.floor(Math.random() * 100)) });
  app = await createApp(config);
  await seed(app);
  await new Promise(r => app.server.listen(config.port, r));
  base = `http://localhost:${config.port}`;
  // login dev admin (super_admin)
  await loginAs('admin', config.devAdminEmail, config.devAdminPassword);
});

after(async () => {
  await app.server.closeAllConnections?.();
  await app.server.close();
  await app.db.close();
  rmSync(DATA, { recursive: true, force: true });
});

// ---- Phase 1 gate: two-org isolation + revocable sessions + append-only audit
test('gate: org A cannot see org B data (API + RLS)', async () => {
  await signupUser('alice'); await signupUser('bob');
  // admin creates a service + publishes
  const s = await api('POST', '/api/admin/services', { as: 'admin', body: { name: 'Pvt Ltd Incorporation', category: 'incorporation', description: 'Company incorporation', professional_fee: 9999 } });
  assert.equal(s.status, 200);
  await api('POST', `/api/admin/services/${s.data.id}/publish`, { as: 'admin', body: {} });

  // both order the same service, pay via the signed-webhook path
  for (const who of ['alice', 'bob']) {
    const oRes = await fetch(`${base}/api/orders`, { method: 'POST', headers: withCookie(who),
      body: JSON.stringify({ service_slug: s.data.slug, idempotency_key: who + '-1' }) });
    const o = await oRes.json();
    assert.equal(oRes.status, 200, `${who} order`);
    const payRes = await fetch(`${base}/api/orders/${o.order.id}/payments`, { method: 'POST', headers: withCookie(who) });
    const pay = await payRes.json();
    const signRes = await (await fetch(`${base}/api/dev/payment/${o.order.id}/sign`, { method: 'POST', headers: withCookie(who) })).json();
    const payload = JSON.stringify(signRes.payload);
    const hook = await fetch(`${base}/api/webhooks/dev-payment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-t2l-signature': signRes.signature },
      body: payload,
    });
    assert.equal(hook.status, 200, `${who} webhook`);
  }

  // isolation: alice sees only her matter
  const a = await api('GET', '/api/matters', { as: 'alice' });
  const b = await api('GET', '/api/matters', { as: 'bob' });
  assert.equal(a.data.matters.length, 1);
  assert.equal(b.data.matters.length, 1);
  assert.notEqual(a.data.matters[0].id, b.data.matters[0].id);

  // direct cross-org object access returns 404 (no IDOR)
  const cross = await fetch(`${base}/api/matters/${b.data.matters[0].id}`, { headers: withCookie('alice') });
  assert.equal(cross.status, 404);

  // RLS at the database level (not just API): alice's context sees only her org rows
  const rls = await app.db.withUser((await app.db.system("select id from auth.users where email='alice@test.invalid'"))[0].id,
    (tx) => tx.query('select count(*)::int as n from matters'));
  assert.equal(rls[0].n, 1, 'RLS must scope matters to alice org only');
});

test('gate: forged payment success never marks an order paid (LS-022)', async () => {
  await signupUser('carol');
  const s = await api('GET', '/api/services', { as: 'anon' });
  const slug = s.data.services[0].slug;
  const o = await (await fetch(`${base}/api/orders`, { method: 'POST', headers: withCookie('carol'),
    body: JSON.stringify({ service_slug: slug, idempotency_key: 'carol-1' }) })).json();

  // 1) visit the success URL: must NOT verify anything
  const success = await api('GET', `/api/orders/${o.order.id}/success`, { as: 'carol' });
  assert.equal(success.status, 200);
  assert.equal(success.data.order_status, 'awaiting_payment', 'success URL must not mark paid');

  // 2) webhook with tampered signature: rejected, still unpaid
  const pay = await (await fetch(`${base}/api/orders/${o.order.id}/payments`, { method: 'POST', headers: withCookie('carol') })).json();
  const payload = JSON.stringify({ payment_id: pay.payment_id, event: 'payment.captured' });
  const bad = await fetch(`${base}/api/webhooks/dev-payment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-t2l-signature': hmacSign('wrong-secret', payload) },
    body: payload,
  });
  assert.equal(bad.status, 401);
  const afterBad = await api('GET', '/api/orders', { as: 'carol' });
  assert.equal(afterBad.data.orders.find(x => x.id === o.order.id).status, 'awaiting_payment');

  // 3) properly signed webhook: paid + matter created; replay is idempotent
  const good = await fetch(`${base}/api/webhooks/dev-payment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-t2l-signature': hmacSign(app.config.devPaymentWebhookSecret, payload) },
    body: payload,
  });
  assert.equal(good.status, 200);
  const again = await fetch(`${base}/api/webhooks/dev-payment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-t2l-signature': hmacSign(app.config.devPaymentWebhookSecret, payload) },
    body: payload,
  });
  assert.equal(again.status, 200);
  const m = await api('GET', '/api/matters', { as: 'carol' });
  assert.equal(m.data.matters.length, 1, 'exactly one matter despite webhook replay');
});

test('gate: session revocation works (PLT-002/007)', async () => {
  await signupUser('dave');
  const list = await api('GET', '/api/me/sessions', { as: 'dave' });
  const sid = list.data.sessions.find(x => x.current).id;
  await api('DELETE', `/api/me/sessions/${sid}`, { as: 'dave' });
  const me = await api('GET', '/api/me', { as: 'dave' });
  assert.equal(me.status, 401, 'revoked session must fail');
});

test('gate: audit log is append-only at the database level (PLT-019)', async () => {
  const row = await app.db.system('select id from audit_log limit 1');
  await assert.rejects(() => app.db.withUser(null, (tx) =>
    tx.query('update audit_log set action = $2 where id = $1', [row[0].id, 'tampered'])),
    /permission denied|row-level security/i, 'UPDATE must be denied for request role');
});

// ---- Phase 2 gate: RBAC matrix (server-side, not navigation)
test('gate: RBAC enforced server-side across roles (PLT-011)', async () => {
  // anon gets 401 on admin, 403-free but empty public reads
  assert.equal((await api('GET', '/api/admin/users', { as: 'anon' })).status, 401);

  // editor cannot approve with resources.review missing: give editor only create/edit scopes
  await signupUser('edith');  // default role client_org_admin -> no editor scopes
  const attempt = await api('POST', '/api/editor/resources', { as: 'edith', body: { title: 'x', summary: 'y' } });
  assert.equal(attempt.status, 403, 'no resources.create scope means 403');

  // admin can read audit
  assert.equal((await api('GET', '/api/admin/audit', { as: 'admin' })).status, 200);
});

// ---- Phase 3 gates: separation of duties, dedupe, sanitisation
test('gate: author cannot self-approve; workflow enforces review (RES-012)', async () => {
  // grant editor scopes for the test role, then create + submit
  await signupUser('editor1');
  for (const scope of ['resources.create', 'resources.edit', 'resources.review', 'resources.publish']) {
    await app.db.system('insert into role_scopes (role, scope) values ($1,$2) on conflict do nothing',
      ['client_org_admin', scope]);
  }
  // editor1 (client_org_admin) now has create; create + submit
  const created = await api('POST', '/api/editor/resources', { as: 'editor1',
    body: { title: 'GST rate changes', summary: 'Summary of changes', category: 'news' } });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  await api('POST', `/api/editor/resources/${created.data.id}/submit`, { as: 'editor1', body: {} });

  // grant review scope too, but self-approval must still fail
  const selfApprove = await api('POST', `/api/editor/resources/${created.data.id}/review`,
    { as: 'editor1', body: { decision: 'approve' } });
  assert.equal(selfApprove.status, 403);
  assert.equal(selfApprove.data.error.code, 'self_approval');

  // admin (different user) approves and publishes; public search finds it
  await api('POST', `/api/editor/resources/${created.data.id}/review`, { as: 'admin', body: { decision: 'approve' } });
  await api('POST', `/api/editor/resources/${created.data.id}/publish`, { as: 'admin', body: {} });
  const pub = await api('GET', '/api/resources?q=GST', { as: 'anon' });
  assert.ok(pub.data.results.some(r => r.title === 'GST rate changes'), 'published resource is discoverable');
});

test('gate: ingestion dedupes by content hash; re-run creates zero duplicates (RES-023)', async () => {
  const src = await api('POST', '/api/admin/sources', { as: 'admin', body: { name: 'Manual edits', url: 'https://manual.local/editors' } });
  await api('POST', `/api/admin/sources/${src.data.id}/items`, { as: 'admin',
    body: { title: 'MCA circular on CSR', summary: 'Circular text', url: 'https://example.in/1' } });
  const run1 = await api('POST', '/api/admin/ingestion/run', { as: 'admin', body: { source_id: src.data.id } });
  assert.equal(run1.data.created, 1);
  const run2 = await api('POST', '/api/admin/ingestion/run', { as: 'admin', body: { source_id: src.data.id } });
  assert.equal(run2.data.created, 0);
  assert.equal(run2.data.duplicates, 1);
});

test('gate: sanitised body strips scripts (XSS, RES-026 defence)', async () => {
  const { sanitiseHtml } = await import('../src/routes/resources.js');
  const dirty = '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>';
  const clean = sanitiseHtml(dirty);
  assert.ok(!clean.includes('script'), clean);
  assert.ok(!clean.includes('onerror'), clean);
  assert.ok(!clean.includes('javascript:'), clean);
});

// ---- Phase 4 gate: configurable workflow transitions (LS-032)
test('gate: matter transitions follow the configured workflow', async () => {
  const matters = await api('GET', '/api/matters', { as: 'admin' });
  // admin org has no matter; use ops view to grab one from alice org
  const ops = await api('GET', '/api/ops/matters', { as: 'admin' });
  const m = ops.data.matters[0];
  const bad = await api('POST', `/api/matters/${m.id}/transition`, { as: 'admin', body: { to_state: 'delivered' } });
  assert.equal(bad.status, 409, 'skipping states must fail');
  const ok = await api('POST', `/api/matters/${m.id}/transition`, { as: 'admin', body: { to_state: 'information_required' } });
  assert.equal(ok.status, 200);
});

// ---- Phase 6 gate: retrieval-only Introspector refuses to fabricate
test('gate: introspector cites stored records only; honest empty answer (INT-021)', async () => {
  await api('POST', '/api/admin/legal-documents', { as: 'admin', body: {
    title: 'Companies Act 2013 s. 149', citation: 'Companies Act 2013, s. 149',
    content: 'Every company shall have a board of directors consisting of individuals and the number shall not be fewer than three in a public company.' } });
  await signupUser('ravi');
  const rm = await api('POST', '/api/research/matters', { as: 'ravi', body: { title: 'Board composition' } });
  const sess = await api('POST', `/api/research/matters/${rm.data.id}/sessions`, { as: 'ravi', body: {} });
  const hit = await api('POST', `/api/research/sessions/${sess.data.id}/queries`, { as: 'ravi',
    body: { question: 'How many directors minimum in a public company board of directors?' } });
  assert.equal(hit.status, 200);
  assert.ok(hit.data.limitation.includes('AI provider unconfigured'));
  assert.ok(hit.data.retrieved_sources.length >= 1, 'retrieval must find the stored act');
  assert.ok(hit.data.citations_verified.every(c => c.verified));

  const miss = await api('POST', `/api/research/sessions/${sess.data.id}/queries`, { as: 'ravi',
    body: { question: 'Quantum physics of black holes jurisprudence zzzunknownterm' } });
  assert.equal(miss.status, 200);
  assert.equal(miss.data.retrieved_sources.length, 0, 'no stored material means no retrieved sources');
  assert.ok(miss.data.note.includes('honest answer'));

  // isolation: bob cannot read alice org research
  const foreign = await fetch(`${base}/api/research/matters`, { headers: withCookie('bob') });
  const bobMatters = await foreign.json();
  assert.equal(bobMatters.matters.length, 0);
});

// ---- Phase 5 gate: Doc Engine seam
test('gate: doc engine seam reports unintegrated; wizard never rebuilt (B1)', async () => {
  const st = await api('GET', '/api/docengine/status', { as: 'anon' });
  assert.equal(st.status, 200);
  assert.equal(st.data.integrated, false);
  // linking the wizard is config, not code
  await api('PUT', '/api/admin/integrations/docengine.wizard', { as: 'admin', body: { base_url: 'https://turn2law.in/docengine' } });
  const st2 = await api('GET', '/api/docengine/status', { as: 'anon' });
  assert.equal(st2.data.integrated, true);
  assert.ok(st2.data.wizard_url.includes('turn2law.in'));
});

test('gate: audit captures sensitive actions across the run (ADM-110)', async () => {
  const auditRows = await api('GET', '/api/admin/audit?q=payment.captured', { as: 'admin' });
  assert.ok(auditRows.data.events.length >= 1, 'payment captures are audited');
});
