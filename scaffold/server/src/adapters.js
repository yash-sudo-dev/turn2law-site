// Integration adapters. Every external provider sits behind one of these.
// Until the founder supplies credentials (order: Supabase, email, AI,
// Razorpay), each adapter runs in a clearly labelled DEV/unconfigured mode
// and NEVER fakes success (PRD rule 10, decision C1).
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { hmacSign, safeEqual } from './crypto.js';

// --- mail ------------------------------------------------------------------
// DEV mode: messages are recorded to the notifications table with status
// 'skipped_unconfigured' and (only in DEV) the actionable link is exposed via
// the admin outbox so flows are testable without a provider. No email is sent.
export function createMailAdapter(config, db) {
  return {
    kind: 'dev-unconfigured',
    async send({ to, template, data }) {
      const link = data?.verify_url || data?.reset_url || null;
      await db.system(`
        insert into notifications (user_id, channel, template_key, payload, status, last_error)
        values ((select id from auth.users where email = $1), 'email', $2, $3, 'skipped_unconfigured',
                'Email provider not configured (decision C1). Not sent.')`,
        [to, template, JSON.stringify({ to, ...data })]);
      if (config.dev) console.log(`[DEV mail] to=${to} template=${template} link=${link || '-'}`);
      return { delivered: false, reason: 'email_provider_unconfigured', devLink: config.dev ? link : undefined };
    },
  };
}

// --- payments -----------------------------------------------------------------
// DEV provider: creates an intent and a clearly labelled local checkout
// screen. The ONLY path that marks a payment captured is the signed webhook
// (LS-022): /api/webhooks/dev-payment with HMAC over the raw body. The
// browser success URL deliberately verifies nothing.
export function createPaymentAdapter(config) {
  return {
    kind: 'dev-unconfigured',
    async createIntent({ orderId, amount, currency }) {
      return {
        provider: 'dev',
        checkout_url: `${config.appUrl}/dev/payment/${orderId}`,
        note: 'DEV payment simulator. Razorpay not configured (decision C1).',
      };
    },
    verifyWebhookSignature(rawBody, signature) {
      if (!signature) return false;
      return safeEqual(signature, hmacSign(config.devPaymentWebhookSecret, rawBody));
    },
  };
}

// --- ai ---------------------------------------------------------------------
// Decision D3: no provider confirmed yet. The adapter is honestly
// unconfigured; callers must handle 'ai_unavailable' by degrading (for
// research: retrieval-only answers) or refusing (for document generation).
export function createAiAdapter(config) {
  return {
    kind: 'unconfigured',
    configured: () => false,
    label: () => 'AI provider unconfigured (decision D3: provider must have no-training terms).',
    async complete() {
      throw Object.assign(new Error(this.label()), { code: 'ai_unavailable' });
    },
  };
}

// --- storage ----------------------------------------------------------------
// DEV: local filesystem under .data/storage with expiring HMAC tokens as the
// signed-URL equivalent. Production swaps in object storage; the contract
// (store, metadata row, expiring token) is identical.
export function createStorageAdapter(config, db) {
  const root = config.storageDir;
  mkdirSync(root, { recursive: true });
  const ALLOWED = new Set([
    'application/pdf', 'image/png', 'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]);
  return {
    kind: 'dev-local',
    maxBytes: 10_000_000,
    async store({ orgId, uploaderId, filename, mime, size, bytes }) {
      if (!ALLOWED.has(mime)) throw new Error(`Unsupported file type: ${mime}`);
      if (size > this.maxBytes) throw new Error('File exceeds the 10 MB limit.');
      const id = crypto.randomUUID();
      const dir = join(root, orgId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, id), bytes);
      await db.system(`
        insert into files (id, org_id, uploader_id, bucket, path, filename, mime, size, scan_status)
        values ($1,$2,$3,'local',$4,$5,$6,$7,'skipped')`,
        [id, orgId, uploaderId, `${orgId}/${id}`, filename, mime, size]);
      return { id };
    },
    async read({ orgId, fileId }) {
      const p = join(root, orgId, fileId);
      if (!existsSync(p)) return null;
      return readFileSync(p);
    },
    scanNote: 'Malware scan skipped: no scanner configured (PLT-014 partial).',
  };
}
