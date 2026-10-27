// Legal Services: catalogue admin, discovery, ordering with idempotency,
// dev payment with server-verified webhook only, matters with configurable
// workflow, document exchange (Phase 4). LS-010 to LS-034.
import { audit } from '../auth.js';
import { err, signFileToken, verifyFileToken } from '../http.js';
import { hmacSign } from '../crypto.js';
import { slugify } from './resources.js';

export function registerServiceRoutes(app) {
  const R = app.router;

  // ---- catalogue admin (services.manage; nothing hardcoded, LS-003) ----
  R.post('/api/admin/services', async (req) => {
    const b = req.body;
    if (!b.name || b.professional_fee == null) throw err(400, 'invalid', 'Name and professional fee are required.');
    const rows = await app.db.system(`
      insert into services (category_id, name, slug, description, scope, exclusions, timeline,
        professional_fee, government_fee, publication_status)
      values ((select id from service_categories where slug = $1),$2,$3,$4,$5,$6,$7,$8,$9,'draft')
      returning id, slug, version`,
      [b.category || 'incorporation', b.name, slugify(b.name) + '-' + Date.now().toString(36),
       b.description || '', b.scope || '', b.exclusions || '', b.timeline || null,
       b.professional_fee, b.government_fee || 0]);
    await app.db.system(`insert into service_versions (service_id, version, snapshot, editor_id, change_note)
      values ($1, 1, (select to_jsonb(s) from services s where s.id = $1), $2, 'created')`,
      [rows[0].id, req.ctx.userId]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'service.create', entityType: 'service', entityId: rows[0].id });
    return rows[0];
  }, { scope: 'services.manage' });

  R.post('/api/admin/services/:id/publish', async (req) => {
    const rows = await app.db.system(
      "update services set publication_status = 'published', version = version + 1, updated_at = now() where id = $1 returning id, version",
      [req.params.id]);
    if (!rows.length) throw err(404, 'not_found', 'Service not found.');
    await app.db.system(`insert into service_versions (service_id, version, snapshot, editor_id, change_note)
      select id, version, to_jsonb(s), $2, 'published' from services s where id = $1`, [req.params.id, req.ctx.userId]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'service.publish', entityType: 'service', entityId: req.params.id });
    return rows[0];
  }, { scope: 'services.manage' });

  R.patch('/api/admin/services/:id/price', async (req) => {
    const rows = await app.db.system(
      'update services set professional_fee = $2, version = version + 1, updated_at = now() where id = $1 returning id, version, professional_fee',
      [req.params.id, req.body.professional_fee]);
    if (!rows.length) throw err(404, 'not_found', 'Service not found.');
    await app.db.system(`insert into service_versions (service_id, version, snapshot, editor_id, change_note)
      select id, version, to_jsonb(s), $2, 'price update' from services s where id = $1`, [req.params.id, req.ctx.userId]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'service.price_update',
      entityType: 'service', entityId: req.params.id, after: { professional_fee: req.body.professional_fee } });
    return rows[0];
  }, { scope: 'services.manage' });

  // ---- discovery (LS-010/011) ----
  R.get('/api/services', async (req) => {
    const q = (req.url.searchParams.get('q') || '').trim();
    const params = ['published'];
    let where = 'publication_status = $1';
    if (q) { params.push(`%${q}%`); where += ` and (name ilike $${params.length} or description ilike $${params.length})`; }
    return { services: await app.db.withUser(null, (tx) => tx.query(
      `select s.id, s.name, s.slug, s.description, s.timeline, s.professional_fee, s.government_fee,
              s.tax_rate, c.name as category
       from services s left join service_categories c on c.id = s.category_id
       where ${where} order by s.name`, params)) };
  }, { public: true });

  R.get('/api/services/:slug', async (req) => {
    const rows = await app.db.withUser(null, (tx) => tx.query(
      'select s.*, c.name as category from services s left join service_categories c on c.id = s.category_id where s.slug = $1 and s.publication_status = $2',
      [req.params.slug, 'published']));
    if (!rows.length) throw err(404, 'not_found', 'Service not found.');
    const ws = await app.db.system(
      'select state_key, label, kind, order_idx from matter_workflow_states where service_id is null order by order_idx');
    return {
      service: rows[0],
      price_breakdown: {
        professional_fee: rows[0].professional_fee,
        government_fee: rows[0].government_fee,
        tax_rate: rows[0].tax_rate,
        total: Number(rows[0].professional_fee) + Number(rows[0].government_fee),
      },
      workflow_preview: ws,  // internal vs external_authority states distinguished (LS-033)
    };
  }, { public: true });

  // ---- ordering (LS-020/023) ----
  R.post('/api/orders', async (req) => {
    const { service_slug, questionnaire, idempotency_key } = req.body;
    if (!service_slug) throw err(400, 'invalid', 'service_slug is required.');
    const svc = await app.db.system(
      "select id, professional_fee, government_fee, tax_rate, name from services where slug = $1 and publication_status = 'published'",
      [service_slug]);
    if (!svc.length) throw err(404, 'not_found', 'Service not found.');
    if (idempotency_key) {
      const existing = await app.db.system(
        'select id, status from orders where idempotency_key = $1 and org_id = $2', [idempotency_key, req.ctx.orgId]);
      if (existing.length) return { order: existing[0], idempotent_replay: true };
    }
    const pricing = {
      service: svc[0].name,
      professional_fee: Number(svc[0].professional_fee),
      government_fee: Number(svc[0].government_fee),
      tax_rate: Number(svc[0].tax_rate),
      total: Number(svc[0].professional_fee) + Number(svc[0].government_fee),
    };
    const rows = await app.db.system(`
      insert into orders (org_id, user_id, service_id, questionnaire_responses, pricing_snapshot, idempotency_key, status)
      values ($1,$2,$3,$4,$5,$6,'awaiting_payment') returning id, status`,
      [req.ctx.orgId, req.ctx.userId, svc[0].id, questionnaire || {}, pricing, idempotency_key || null]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'order.create',
      entityType: 'order', entityId: rows[0].id, after: { status: 'awaiting_payment' } });
    return { order: rows[0], pricing };
  });

  R.get('/api/orders', async (req) => {
    const rows = await app.db.withUser(req.ctx.userId, (tx) => tx.query(`
      select o.id, o.status, o.pricing_snapshot, o.created_at, s.name as service
      from orders o join services s on s.id = o.service_id
      where o.org_id = $1 order by o.created_at desc`, [req.ctx.orgId]));
    return { orders: rows };
  });

  // ---- payment: dev provider. Verification ONLY via signed webhook (LS-022).
  R.post('/api/orders/:id/payments', async (req) => {
    const rows = await app.db.system(
      'select o.id, o.status, o.pricing_snapshot from orders o where o.id = $1 and o.org_id = $2',
      [req.params.id, req.ctx.orgId]);
    if (!rows.length) throw err(404, 'not_found', 'Order not found.');
    if (rows[0].status !== 'awaiting_payment') throw err(409, 'invalid_state', 'Order is not awaiting payment.');
    const amount = rows[0].pricing_snapshot?.total || 0;
    const pay = await app.db.system(`
      insert into payments (order_id, provider, provider_ref, amount) values ($1,'dev',$2,$3) returning id`,
      [req.params.id, 'dev_' + crypto.randomUUID(), amount]);
    const intent = await app.adapters.payment.createIntent({ orderId: req.params.id, amount });
    return { payment_id: pay[0].id, ...intent };
  });

  // The success URL verifies nothing on purpose. It reports status only.
  // The acceptance gate proves a visit here never marks an order paid.
  R.get('/api/orders/:id/success', async (req) => {
    const rows = await app.db.system('select status from orders where id = $1 and org_id = $2',
      [req.params.id, req.ctx.orgId]);
    if (!rows.length) throw err(404, 'not_found', 'Order not found.');
    return {
      order_status: rows[0].status,
      note: 'Browser redirects never verify payments. Status changes only via the signed provider webhook.',
    };
  });

  // Signed webhook: the ONLY path to 'captured' (LS-022/023). Idempotent.
  R.post('/api/webhooks/dev-payment', async (req) => {
    const signature = req.headers['x-t2l-signature'];
    if (!app.adapters.payment.verifyWebhookSignature(req.rawBody || '', signature)) {
      throw err(401, 'bad_signature', 'Webhook signature verification failed.');
    }
    const { payment_id, event } = req.body;
    if (event !== 'payment.captured') return { ignored: true };
    const pay = await app.db.system(
      "select id, order_id, status from payments where id = $1 and status = 'created'", [payment_id]);
    if (!pay.length) return { ok: true, already_processed: true };
    const order = await app.db.system('select id, org_id, service_id from orders where id = $1', [pay[0].order_id]);
    await app.db.system("update payments set status = 'captured', verified_at = now() where id = $1", [payment_id]);
    await app.db.system("update orders set status = 'paid' where id = $1", [pay[0].order_id]);
    const ref = 'T2L-' + new Date().getFullYear() + '-' + crypto.randomUUID().slice(0, 4).toUpperCase();
    const matter = await app.db.system(`
      insert into matters (order_id, org_id, reference, service_id, workflow_state)
      values ($1,$2,$3,$4,'received') returning id, reference`,
      [pay[0].order_id, order[0].org_id, ref, order[0].service_id]);
    await app.db.system(`insert into matter_status_events (matter_id, from_state, to_state, note)
      values ($1, null, 'received', 'Payment verified via signed webhook')`, [matter[0].id]);
    await audit(app, { orgId: order[0].org_id, action: 'payment.captured', entityType: 'payment',
      entityId: payment_id, after: { order_id: pay[0].order_id } });
    return { ok: true, matter: matter[0] };
  }, { public: true });

  // ---- matters (LS-030 to LS-034) ----
  R.get('/api/matters', async (req) => {
    return { matters: await app.db.withUser(req.ctx.userId, (tx) => tx.query(`
      select m.id, m.reference, m.workflow_state, m.opened_at, m.sla_due_at, s.name as service,
             (select max(created_at) from matter_status_events e where e.matter_id = m.id) as last_update
      from matters m join services s on s.id = m.service_id
      where m.org_id = $1 order by m.opened_at desc`, [req.ctx.orgId])) };
  });

  R.get('/api/matters/:id', async (req) => {
    const rows = await app.db.withUser(req.ctx.userId, (tx) => tx.query(`
      select m.*, s.name as service, s.timeline from matters m join services s on s.id = m.service_id
      where m.id = $1 and m.org_id = $2`, [req.params.id, req.ctx.orgId]));
    if (!rows.length) throw err(404, 'not_found', 'Matter not found.');  // 404, not 403: no existence leak
    const events = await app.db.withUser(req.ctx.userId, (tx) => tx.query(
      'select from_state, to_state, note, created_at from matter_status_events where matter_id = $1 order by created_at',
      [req.params.id]));
    const docs = await app.db.withUser(req.ctx.userId, (tx) => tx.query(`
      select md.id, md.kind, md.verification_status, md.rejection_reason, md.version, f.filename, f.size, md.created_at
      from matter_documents md join files f on f.id = md.file_id where md.matter_id = $1`, [req.params.id]));
    const states = await app.db.system(
      'select state_key, label, kind, order_idx, allowed_transitions from matter_workflow_states where service_id is null order by order_idx');
    return { matter: rows[0], timeline: events, documents: docs, workflow: states };
  });

  // Client document upload (LS-034). Base64 JSON; storage adapter validates.
  R.post('/api/matters/:id/documents', async (req) => {
    const { filename, mime, data_b64 } = req.body;
    if (!filename || !data_b64) throw err(400, 'invalid', 'filename and data_b64 are required.');
    const matter = await app.db.withUser(req.ctx.userId, (tx) => tx.query(
      'select id from matters where id = $1 and org_id = $2', [req.params.id, req.ctx.orgId]));
    if (!matter.length) throw err(404, 'not_found', 'Matter not found.');
    const bytes = Buffer.from(data_b64, 'base64');
    const stored = await app.adapters.storage.store({
      orgId: req.ctx.orgId, uploaderId: req.ctx.userId,
      filename: String(filename).slice(0, 120), mime: mime || 'application/octet-stream',
      size: bytes.length, bytes,
    });
    const rows = await app.db.system(`
      insert into matter_documents (matter_id, file_id, kind, uploaded_by)
      values ($1,$2,'client_upload',$3) returning id`, [req.params.id, stored.id, req.ctx.userId]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'matter.document_uploaded',
      entityType: 'matter', entityId: req.params.id });
    return { document_id: rows[0].id, file_id: stored.id,
      scan: app.adapters.storage.scanNote };
  }, { bodyLimit: 16_000_000 });

  // Expiring download token (dev stand-in for signed URLs, same contract).
  R.get('/api/matters/:id/documents/:docId/link', async (req) => {
    const rows = await app.db.withUser(req.ctx.userId, (tx) => tx.query(`
      select md.id, f.id as file_id from matter_documents md
      join matters m on m.id = md.matter_id join files f on f.id = md.file_id
      where md.id = $1 and m.id = $2 and m.org_id = $3`,
      [req.params.docId, req.params.id, req.ctx.orgId]));
    if (!rows.length) throw err(404, 'not_found', 'Document not found.');
    const token = signFileToken(app.config.fileTokenSecret, rows[0].file_id, 5 * 60_000);
    return { url: `/api/files/${rows[0].file_id}?token=${token}`, expires_in_ms: 300_000 };
  });

  // Internal: verify/reject client documents (documents.review).
  R.post('/api/matters/:id/documents/:docId/verify', async (req) => {
    const { decision, reason } = req.body;  // 'verified' | 'rejected'
    const rows = await app.db.system(`
      update matter_documents set verification_status = $2, rejection_reason = $3, reviewed_by = $4
      where id = $1 returning id`, [req.params.docId, decision === 'verified' ? 'verified' : 'rejected',
      decision === 'verified' ? null : (reason || 'No reason provided'), req.ctx.userId]);
    if (!rows.length) throw err(404, 'not_found', 'Document not found.');
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: `matter.document_${decision}`,
      entityType: 'matter_document', entityId: req.params.docId });
    return { ok: true };
  }, { scope: 'documents.review' });

  // Internal: workflow transitions validated against the configured set (LS-032).
  R.post('/api/matters/:id/transition', async (req) => {
    const { to_state, note } = req.body;
    const m = await app.db.system('select id, workflow_state from matters where id = $1', [req.params.id]);
    if (!m.length) throw err(404, 'not_found', 'Matter not found.');
    const allowed = await app.db.system(
      'select allowed_transitions from matter_workflow_states where service_id is null and state_key = $1',
      [m[0].workflow_state]);
    const list = allowed[0]?.allowed_transitions || [];
    if (!list.includes(to_state)) {
      throw err(409, 'invalid_transition',
        `Transition ${m[0].workflow_state} -> ${to_state} is not allowed. Allowed: ${list.join(', ') || 'none'}.`);
    }
    await app.db.system('update matters set workflow_state = $2 where id = $1', [req.params.id, to_state]);
    await app.db.system(`insert into matter_status_events (matter_id, from_state, to_state, actor_id, note)
      values ($1,$2,$3,$4,$5)`, [req.params.id, m[0].workflow_state, to_state, req.ctx.userId, note || null]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'matter.transition',
      entityType: 'matter', entityId: req.params.id, before: { state: m[0].workflow_state }, after: { state: to_state } });
    return { ok: true, state: to_state };
  }, { scope: 'orders.update' });

  // Internal: all matters across orgs (ops view, LS-040).
  R.get('/api/ops/matters', async () => {
    const rows = await app.db.system(`
      select m.id, m.reference, m.workflow_state, m.opened_at, o.name as org, s.name as service
      from matters m join organizations o on o.id = m.org_id join services s on s.id = m.service_id
      order by m.opened_at desc limit 100`);
    return { matters: rows };
  }, { scope: 'orders.read' });

  // DEV ONLY: the payment simulator signs a provider-style callback so the
  // signed-webhook path is exercisable without Razorpay. Loudly labelled;
  // disabled entirely when NODE_ENV=production.
  R.post('/api/dev/payment/:orderId/sign', async (req) => {
    if (!app.config.dev) throw err(404, 'not_found', 'Not available.');
    const rows = await app.db.system(`
      select p.id from payments p join orders o on o.id = p.order_id
      where o.id = $1 and o.org_id = $2 and p.status = 'created'`, [req.params.orderId, req.ctx.orgId]);
    if (!rows.length) throw err(404, 'not_found', 'No open payment for this order.');
    const payload = { payment_id: rows[0].id, event: 'payment.captured' };
    return {
      dev_only: true,
      note: 'DEV payment simulator (decision C1). This stands in for the provider server that would normally sign the webhook.',
      webhook_url: '/api/webhooks/dev-payment',
      payload, signature: devSign(app, payload),
    };
  });
}

// Helper used by the dev payment screen: signs a webhook payload the way the
// (simulated) provider would, using the DEV webhook secret. DEV ONLY.
export function devSign(app, payload) {
  return hmacSign(app.config.devPaymentWebhookSecret, JSON.stringify(payload));
}
