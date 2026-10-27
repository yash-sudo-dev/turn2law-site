// Doc Engine integration seam (Phase 5, decision B1). The live wizard is
// NEVER re-implemented here. This module exposes the documented contract:
// status, org document records, and a signature-verified inbound webhook the
// production wizard calls when a document is generated or executed.
// Contract details: scaffold/docs/docengine-seam.md
import { audit } from '../auth.js';
import { err } from '../http.js';
import { hmacSign, safeEqual } from '../crypto.js';

export function registerDocEngineRoutes(app) {
  const R = app.router;

  R.get('/api/docengine/status', async () => {
    const rows = await app.db.system(
      "select config from integrations where key = 'docengine.wizard'");
    const cfg = rows[0]?.config || {};
    return {
      integrated: !!cfg.base_url,
      wizard_url: cfg.base_url || null,
      note: cfg.note || 'Production wizard not linked yet. Per decision B1 the wizard is preserved in the production codebase and is never rebuilt here.',
    };
  }, { public: true });

  // Org's documents produced by the wizard (arrive via the seam webhook).
  R.get('/api/docengine/documents', async (req) => {
    const rows = await app.db.withUser(req.ctx.userId, (tx) => tx.query(
      'select id, title, template_key, status, external_url, metadata, created_at from doc_records where org_id = $1 order by created_at desc',
      [req.ctx.orgId]));
    return { documents: rows };
  });

  // Admin links the production wizard base URL (config only, no code).
  R.put('/api/admin/integrations/docengine.wizard', async (req) => {
    const { base_url } = req.body;
    if (base_url && !/^https:\/\//.test(base_url)) throw err(400, 'invalid', 'base_url must be https.');
    await app.db.system(`
      update integrations
      set config = coalesce(config, '{}'::jsonb) || jsonb_build_object('base_url', $1::text),
          updated_at = now(), updated_by = $2
      where key = 'docengine.wizard'`, [base_url || null, req.ctx.userId]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'integration.docengine_wizard_set',
      entityType: 'integration', entityId: 'docengine.wizard', after: { base_url: base_url || null } });
    return { ok: true };
  }, { scope: 'settings.manage' });

  // Inbound seam webhook: the production wizard reports completed documents.
  // Signature: HMAC-SHA256 over the raw body with DOCENGINE_SEAM_SECRET,
  // header x-t2l-signature. Idempotent by external_id.
  R.post('/api/webhooks/docengine', async (req) => {
    const signature = req.headers['x-t2l-signature'];
    const expected = hmacSign(app.config.docEngineSeamSecret, req.rawBody || '');
    if (!signature || !safeEqual(signature, expected)) {
      throw err(401, 'bad_signature', 'Doc Engine seam webhook signature verification failed.');
    }
    const { external_id, org_id, title, template_key, external_url, status, metadata } = req.body;
    if (!external_id || !org_id || !title) throw err(400, 'invalid', 'external_id, org_id and title are required.');
    const existing = await app.db.system('select id from doc_records where id = $1', [external_id]);
    if (existing.length) return { ok: true, duplicate: true };
    await app.db.system(`
      insert into doc_records (id, org_id, template_key, title, status, external_url, metadata)
      values ($1,$2,$3,$4,$5,$6,$7)`,
      [external_id, org_id, template_key || null, title, status || 'external', external_url || null, metadata || {}]);
    await audit(app, { orgId: org_id, action: 'docengine.document_received', entityType: 'doc_record', entityId: external_id });
    return { ok: true };
  }, { public: true });
}
