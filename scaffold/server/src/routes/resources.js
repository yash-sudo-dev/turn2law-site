// Resources: public discovery, editorial CMS with separation of duties,
// manual-connector ingestion with dedupe (Phases 2-3). RES-001 to RES-012,
// RES-023 to RES-025 (manual form per decision D2).
import { audit } from '../auth.js';
import { err } from '../http.js';
import { createHash } from 'node:crypto';

const hash = (s) => createHash('sha256').update(s).digest('hex');

// Allowlist sanitiser for CMS bodies (RES-026 defence-in-depth: strip all
// tags except a safe subset, drop every attribute except href on <a>, and
// neutralise javascript: URLs). Test E5 exercises this.
export function sanitiseHtml(input) {
  let s = String(input || '');
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?\s*>/gi, '');
  s = s.replace(/<([a-z0-9]+)([^>]*)>/gi, (m, tag, attrs) => {
    if (!['p','br','strong','em','ul','ol','li','h2','h3','h4','blockquote','a','code','pre','table','thead','tbody','tr','th','td'].includes(tag.toLowerCase())) return '';
    if (tag.toLowerCase() === 'a') {
      const href = (attrs.match(/href\s*=\s*"([^"]*)"/i) || [])[1] || '';
      if (href && !/^https?:\/\//i.test(href)) return '<a>';
      return href ? `<a href="${href.replace(/"/g, '&quot;')}" rel="noopener">` : '<a>';
    }
    return `<${tag}>`;
  });
  return s;
}

export const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export function registerResourceRoutes(app) {
  const R = app.router;

  // ---- public discovery (reads DB only; never scrapes, RES-002/RES-025) ----
  R.get('/api/resources', async (req) => {
    const q = (req.url.searchParams.get('q') || '').trim();
    const category = req.url.searchParams.get('category');
    const params = ['published'];
    let where = 'review_status = $1';
    if (q) { params.push(`%${q}%`); where += ` and (title ilike $${params.length} or summary ilike $${params.length})`; }
    if (category) { params.push(category); where += ` and category_id = (select id from resource_categories where slug = $${params.length})`; }
    const rows = await app.db.withUser(null, async (tx) => tx.query(
      `select r.id, r.title, r.slug, r.summary, r.kind, r.source_url, r.published_at, r.last_verified_at,
              r.verification_status, c.name as category
       from resources r left join resource_categories c on c.id = r.category_id
       where ${where} order by r.published_at desc nulls last limit 50`, params));
    if (req.ctx) await app.db.system(
      'insert into search_events (user_id, query, results_count) values ($1,$2,$3)',
      [req.ctx.userId, q || '(browse)', rows.length]);
    return { results: rows };
  }, { public: true });

  R.get('/api/resources/:slug', async (req) => {
    const rows = await app.db.withUser(null, async (tx) => tx.query(
      `select r.*, c.name as category, p.name as author_name
       from resources r left join resource_categories c on c.id = r.category_id
       left join profiles p on p.id = r.author_id
       where r.slug = $1 and (r.review_status = 'published' or r.author_id = auth.uid())`, [req.params.slug]));
    if (!rows.length) throw err(404, 'not_found', 'Resource not found.');
    const r = rows[0];
    return { resource: { ...r, body: sanitiseHtml(r.body) },
      provenance: { source_url: r.source_url, content_hash: r.content_hash,
        last_verified_at: r.last_verified_at, verification_status: r.verification_status } };
  }, { public: true });

  // ---- editorial CMS (RES-010/011/012) ----
  R.post('/api/editor/resources', async (req) => {
    const { title, summary, body, category, source_url, kind } = req.body;
    if (!title || !summary) throw err(400, 'invalid', 'Title and summary are required.');
    const slug = slugify(title) + '-' + hash(title).slice(0, 6);
    const rows = await app.db.system(`
      insert into resources (category_id, kind, title, slug, summary, body, author_id, source_url, content_hash)
      values ((select id from resource_categories where slug = $1), $2, $3, $4, $5, $6, $7, $8, $9)
      returning id, slug, review_status`,
      [category || 'news', kind || 'article', title, slug, summary, sanitiseHtml(body || ''),
       req.ctx.userId, source_url || null, hash(title + summary + body)]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'resource.create', entityType: 'resource', entityId: rows[0].id });
    return rows[0];
  }, { scope: 'resources.create' });

  R.post('/api/editor/resources/:id/submit', async (req) => {
    const rows = await app.db.system(
      "update resources set review_status = 'in_review', updated_at = now() where id = $1 and review_status = 'draft' returning id",
      [req.params.id]);
    if (!rows.length) throw err(409, 'invalid_state', 'Only drafts can be submitted.');
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'resource.submit', entityType: 'resource', entityId: req.params.id });
    return { ok: true };
  }, { scope: 'resources.edit' });

  R.post('/api/editor/resources/:id/review', async (req) => {
    const { decision } = req.body;  // 'approve' | 'reject'
    const rows = await app.db.system('select author_id, review_status from resources where id = $1', [req.params.id]);
    if (!rows.length) throw err(404, 'not_found', 'Resource not found.');
    const r = rows[0];
    if (r.review_status !== 'in_review') throw err(409, 'invalid_state', 'Resource is not in review.');
    if (r.author_id === req.ctx.userId) {
      throw err(403, 'self_approval', 'Separation of duties: you cannot review your own submission (RES-012).');
    }
    if (decision === 'approve') {
      await app.db.system("update resources set review_status = 'approved', reviewer_id = $2 where id = $1", [req.params.id, req.ctx.userId]);
    } else {
      await app.db.system("update resources set review_status = 'draft', reviewer_id = $2 where id = $1", [req.params.id, req.ctx.userId]);
    }
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: `resource.review.${decision}`, entityType: 'resource', entityId: req.params.id });
    return { ok: true };
  }, { scope: 'resources.review' });

  R.post('/api/editor/resources/:id/publish', async (req) => {
    const rows = await app.db.system(
      "update resources set review_status = 'published', published_at = now(), last_verified_at = now(), verification_status = 'editor_verified', version = version + 1 where id = $1 and review_status = 'approved' returning id, version",
      [req.params.id]);
    if (!rows.length) throw err(409, 'invalid_state', 'Only approved resources can be published.');
    await app.db.system(`insert into resource_versions (resource_id, version, snapshot, editor_id)
      select id, version, to_jsonb(r), $2 from resources r where id = $1`, [req.params.id, req.ctx.userId]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'resource.publish', entityType: 'resource', entityId: req.params.id });
    return rows[0];
  }, { scope: 'resources.publish' });

  R.post('/api/resources/:id/save', async (req) => {
    await app.db.system('insert into bookmarks (user_id, resource_id) values ($1,$2) on conflict do nothing',
      [req.ctx.userId, req.params.id]);
    return { ok: true };
  });

  // ---- ingestion: manual connector (decision D2) ----
  R.post('/api/admin/sources', async (req) => {
    const { name, url, category, attribution_text } = req.body;
    if (!name || !url) throw err(400, 'invalid', 'Name and URL are required.');
    const rows = await app.db.system(`
      insert into sources (name, url, source_type, authority, category_id, attribution_text, health)
      values ($1,$2,'manual','editorial',(select id from resource_categories where slug = $3),$4,'unlicensed')
      returning id, name, health`, [name, url, category || 'news', attribution_text || name]);
    await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'source.create', entityType: 'source', entityId: rows[0].id });
    return rows[0];
  }, { scope: 'sources.manage' });

  // Stage a manual item for ingestion (the licensed-feed connector plugs into
  // the same staging table later; the pipeline below is shared).
  R.post('/api/admin/sources/:id/items', async (req) => {
    const { title, url, summary, body, published_at } = req.body;
    if (!title) throw err(400, 'invalid', 'Title is required.');
    const rows = await app.db.system(`
      insert into source_items (source_id, title, url, summary, body, published_at, content_hash)
      values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [req.params.id, title, url || null, summary || '', body || '', published_at || null,
       hash(title + '|' + (url || '') + '|' + (body || summary || ''))]);
    return rows[0];
  }, { scope: 'sources.manage' });

  // Manual ingestion run: normalize, dedupe by content_hash, create drafts
  // (RES-023/024: nothing auto-publishes; every item lands in review queue).
  // Idempotent by hash: re-running creates zero duplicates.
  R.post('/api/admin/ingestion/run', async (req) => {
    const { source_id } = req.body;
    const job = await app.db.system(`
      insert into ingestion_jobs (source_id, kind, state, started_at) values ($1,'manual','running', now()) returning id`,
      [source_id || null]);
    try {
      const items = await app.db.system('select * from source_items where source_id = $1', [source_id]);
      let created = 0, duplicates = 0;
      for (const it of items) {
        const dupe = await app.db.system('select 1 from resources where content_hash = $1', [it.content_hash]);
        if (dupe.length) { duplicates++; continue; }
        const src = await app.db.system('select name, attribution_text, category_id from sources where id = $1', [source_id]);
        await app.db.system(`
          insert into resources (category_id, kind, title, slug, summary, body, source_id, source_url,
            source_published_at, author_id, content_hash, review_status)
          values ($1,'article',$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft')`,
          [src[0]?.category_id, it.title, slugify(it.title) + '-' + it.content_hash.slice(0, 6),
           it.summary, sanitiseHtml(it.body), source_id, it.url, it.published_at,
           req.ctx.userId, it.content_hash]);
        created++;
      }
      const counts = await app.db.system(`
        update ingestion_jobs set state = 'succeeded', finished_at = now() where id = $1
        returning id`, [job[0].id]);
      await audit(app, { actorId: req.ctx.userId, orgId: req.ctx.orgId, action: 'ingestion.run',
        entityType: 'ingestion_job', entityId: job[0].id, after: { created, duplicates } });
      return { job_id: job[0].id, created, duplicates, policy: 'All items land as drafts for review (RES-024).' };
    } catch (e) {
      await app.db.system("update ingestion_jobs set state = 'failed', finished_at = now(), error = $2 where id = $1",
        [job[0].id, e.message]);
      throw e;
    }
  }, { scope: 'ingestion.run' });

  R.get('/api/admin/ingestion/jobs', async () => {
    const rows = await app.db.system(`
      select j.id, j.kind, j.state, j.queued_at, j.finished_at, j.error, s.name as source
      from ingestion_jobs j left join sources s on s.id = j.source_id
      order by j.queued_at desc limit 50`);
    return { jobs: rows };
  }, { scope: 'ingestion.run' });
}
