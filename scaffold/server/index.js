// App assembly: config, db, adapters, routes, SSR pages, boot, seed.
import { createServer } from 'node:http';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, migrate } from './src/db.js';
import { createRouter, dispatch, verifyFileToken } from './src/http.js';
import { resolveContext } from './src/auth.js';
import { createMailAdapter, createPaymentAdapter, createAiAdapter, createStorageAdapter } from './src/adapters.js';
import { registerAuthRoutes } from './src/routes/auth.js';
import { registerResourceRoutes } from './src/routes/resources.js';
import { registerServiceRoutes } from './src/routes/services.js';
import { registerDocEngineRoutes } from './src/routes/docengine.js';
import { registerIntrospectorRoutes } from './src/routes/introspector.js';
import { registerAdminRoutes } from './src/routes/admin.js';
import { seed } from './src/seed.js';
import { renderPage, ROUTES as WEB_ROUTES } from './src/web.js';

const here = dirname(fileURLToPath(import.meta.url));

export function loadConfig(env = process.env) {
  const dev = (env.NODE_ENV || 'local') !== 'production';
  const root = join(here, '..');
  const dataDir = env.T2L_DATA_DIR || join(root, '.data');
  mkdirSync(dataDir, { recursive: true });
  return {
    dev,
    appUrl: env.APP_URL || 'http://localhost:8787',
    port: Number(env.PORT || 8787),
    secureCookies: !!env.SESSION_SECRET && !dev,
    sessionSecret: env.SESSION_SECRET || 'dev-session-secret-CHANGE-ME',
    devPaymentWebhookSecret: env.DEV_PAYMENT_WEBHOOK_SECRET || 'dev-payment-webhook-secret',
    docEngineSeamSecret: env.DOCENGINE_SEAM_SECRET || 'dev-docengine-seam-secret',
    fileTokenSecret: env.FILE_TOKEN_SECRET || 'dev-file-token-secret',
    storageDir: env.T2L_STORAGE_DIR || join(dataDir, 'storage'),
    dbDir: join(dataDir, 'db'),
    devAdminEmail: env.DEV_ADMIN_EMAIL || 'dev-admin@turn2law.invalid',
    devAdminPassword: env.DEV_ADMIN_PASSWORD || 'dev-admin-password',
  };
}

export async function createApp(config = loadConfig()) {
  const db = await createDb(config.dbDir);
  await migrate(db);
  const router = createRouter();

  const app = {
    config, db, router,
    adapters: {
      mail: createMailAdapter(config, db),
      payment: createPaymentAdapter(config),
      ai: createAiAdapter(config),
      storage: createStorageAdapter(config, db),
    },
    resolveContext: (req, route) => resolveContext(app, req, route),
    log: config.dev ? (m) => console.log(m) : () => {},
  };

  registerAuthRoutes(app);
  registerResourceRoutes(app);
  registerServiceRoutes(app);
  registerDocEngineRoutes(app);
  registerIntrospectorRoutes(app);
  registerAdminRoutes(app);

  app.server = createServer(async (req, res) => {
    app.clientIp = req.socket.remoteAddress || 'unknown';
    app.userAgent = req.headers['user-agent'] || '';
    const u = new URL(req.url, config.appUrl);
    req.url = u;  // handlers receive a parsed URL (searchParams available)
    const pathname = u.pathname;

    // signed file downloads (expiring token; production swaps for object store)
    if (req.method === 'GET' && pathname.startsWith('/api/files/')) {
      const fileId = pathname.split('/')[3];
      if (!verifyFileToken(config.fileTokenSecret, fileId, u.searchParams.get('token') || '')) {
        res.statusCode = 403; return res.end('Expired or invalid link.');
      }
      const meta = await db.system('select org_id, filename, mime from files where id = $1', [fileId]);
      if (!meta.length) { res.statusCode = 404; return res.end('Not found.'); }
      const bytes = await app.adapters.storage.read({ orgId: meta[0].org_id, fileId });
      if (!bytes) { res.statusCode = 404; return res.end('Not found.'); }
      res.setHeader('Content-Type', meta[0].mime);
      res.setHeader('Content-Disposition', `attachment; filename="${meta[0].filename.replace(/"/g, '')}"`);
      return res.end(bytes);
    }

    if (pathname.startsWith('/api/')) return dispatch(app, req, res, pathname);

    // SSR pages (including the DEV payment simulator screen)
    const page = WEB_ROUTES[pathname] || WEB_ROUTES['/'];
    const ctx = await resolveContext(app, { cookies: parseCookieHeader(req.headers.cookie), url: u }, null).catch(() => null);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderPage(page, { ctx, config }));
  });

  return app;
}

function parseCookieHeader(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export async function start() {
  const config = loadConfig();
  const app = await createApp(config);
  await seed(app);
  app.server.listen(config.port, () => {
    console.log(`[t2l-scaffold] ${config.dev ? 'DEV' : 'PROD'} mode on http://localhost:${config.port}`);
    console.log('[t2l-scaffold] adapters: mail=dev-unconfigured payment=dev ai=unconfigured storage=local');
  });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.js')) {
  start().catch((e) => { console.error(e); process.exit(1); });
}
