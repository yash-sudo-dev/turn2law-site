// Introspector (Phase 6): research matters, sessions, and grounded retrieval.
// With no AI provider configured (decision D3) the query endpoint runs in
// retrieval-only mode: it searches stored legal documents, returns passages
// and citations from stored records ONLY, and states the limitation honestly.
// Nothing is generated; no citation is invented (INT-020/021/024 behaviour
// within the unconfigured-provider constraint).
import { audit } from '../auth.js';
import { err } from '../http.js';
import { createHash } from 'node:crypto';

const hash = (s) => createHash('sha256').update(s).digest('hex');

export function registerIntrospectorRoutes(app) {
  const R = app.router;

  R.get('/api/research/matters', async (req) => {
    const rows = await app.db.withUser(req.ctx.userId, (tx) => tx.query(
      'select id, title, tags, created_at from research_matters where org_id = $1 order by created_at desc',
      [req.ctx.orgId]));
    return { matters: rows };
  });

  R.post('/api/research/matters', async (req) => {
    if (!req.body.title) throw err(400, 'invalid', 'Title is required.');
    const rows = await app.db.system(
      'insert into research_matters (org_id, title, created_by, tags) values ($1,$2,$3,$4) returning id, title',
      [req.ctx.orgId, req.body.title, req.ctx.userId, req.body.tags || []]);
    return rows[0];
  });

  R.post('/api/research/matters/:id/sessions', async (req) => {
    const owned = await app.db.withUser(req.ctx.userId, (tx) => tx.query(
      'select id from research_matters where id = $1 and org_id = $2', [req.params.id, req.ctx.orgId]));
    if (!owned.length) throw err(404, 'not_found', 'Research matter not found.');
    const rows = await app.db.system(
      'insert into research_sessions (research_matter_id, user_id, title) values ($1,$2,$3) returning id',
      [req.params.id, req.ctx.userId, req.body.title || 'New session']);
    return rows[0];
  });

  // Ask: retrieval happens BEFORE any answering (INT-020 ordering). Citations
  // come from stored records only; a missing corpus yields an honest answer.
  R.post('/api/research/sessions/:id/queries', async (req) => {
    const question = String(req.body.question || '').trim();
    if (!question) throw err(400, 'invalid', 'question is required.');
    const session = await app.db.withUser(req.ctx.userId, (tx) => tx.query(`
      select s.id, rm.org_id from research_sessions s
      join research_matters rm on rm.id = s.research_matter_id
      where s.id = $1 and rm.org_id = $2`, [req.params.id, req.ctx.orgId]));
    if (!session.length) throw err(404, 'not_found', 'Session not found.');

    const terms = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
    let docs = [];
    if (terms.length) {
      const conds = [], params = [];
      for (const t of terms.slice(0, 6)) {
        params.push(`%${t}%`);
        conds.push(`(title ilike $${params.length} or content ilike $${params.length})`);
      }
      docs = await app.db.system(
        `select id, title, citation, court, doc_type, dated, content, provenance from legal_documents
         where ${conds.join(' or ')} limit 5`, params);
    }

    const q = await app.db.system(
      'insert into research_queries (session_id, question) values ($1,$2) returning id',
      [req.params.id, question]);
    const retrieved = [];
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const idx = d.content.toLowerCase().indexOf(terms[0] || '');
      const start = Math.max(0, idx - 120);
      const passage = d.content.slice(start, start + 400).trim();
      await app.db.system(
        'insert into retrieved_sources (query_id, legal_document_id, passage, rank) values ($1,$2,$3,$4)',
        [q[0].id, d.id, passage, i + 1]);
      await app.db.system(`
        insert into citations (query_id, legal_document_id, case_name, citation_id, court, dated, paragraph, quoted_passage, url, verified)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
        [q[0].id, d.id, d.title, d.citation, d.court, d.dated, null, passage, d.provenance?.url || null]);
      retrieved.push({
        rank: i + 1, title: d.title, citation: d.citation, court: d.court, dated: d.dated,
        doc_type: d.doc_type, passage, provenance: d.provenance,
      });
    }

    const ai = app.adapters.ai;
    return {
      query_id: q[0].id,
      question,
      mode: 'retrieval_only',
      limitation: ai.configured()
        ? null
        : 'AI provider unconfigured (decision D3). Retrieval-only: passages and citations from stored documents. No generated analysis, no invented authorities.',
      retrieved_sources: retrieved,
      citations_verified: retrieved.map((r) => ({
        citation_id: r.citation, verified: true, basis: 'present in stored legal_documents',
      })),
      note: 'If the corpus lacks material for your question, that is the honest answer. Nothing is fabricated (INT-021).',
    };
  });

  R.get('/api/research/sessions/:id', async (req) => {
    const rows = await app.db.withUser(req.ctx.userId, (tx) => tx.query(`
      select q.id, q.question, q.limitation, q.created_at,
             (select count(*) from citations c where c.query_id = q.id) as citation_count
      from research_queries q join research_sessions s on s.id = q.session_id
      join research_matters rm on rm.id = s.research_matter_id
      where s.id = $1 and rm.org_id = $2 order by q.created_at desc`, [req.params.id, req.ctx.orgId]));
    if (!rows.length) throw err(404, 'not_found', 'Session not found or empty.');
    return { queries: rows };
  });

  // Corpus management: editors add legal documents with provenance
  // (introspector.sources.manage). This is the manual path until licensed
  // feeds arrive (decision D2).
  R.post('/api/admin/legal-documents', async (req) => {
    const { title, doc_type, citation, court, jurisdiction, dated, content, source_url } = req.body;
    if (!title || !content) throw err(400, 'invalid', 'Title and content are required.');
    const source = await app.db.system(
      "select id from sources where source_type = 'manual' order by created_at limit 1");
    const rows = await app.db.system(`
      insert into legal_documents (source_id, doc_type, title, citation, court, jurisdiction, dated, content, content_hash, provenance)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id, title`,
      [source[0]?.id || null, doc_type || 'act', title, citation || null, court || null,
       jurisdiction || 'India', dated || null, content, hash(title + content),
       { url: source_url || null, added_by: 'editor', method: 'manual' }]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'legal_document.add',
      entityType: 'legal_document', entityId: rows[0].id });
    return rows[0];
  }, { scope: 'introspector.sources.manage' });
}
