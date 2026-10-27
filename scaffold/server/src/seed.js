// Structural seed: roles, scope assignments (from permissions/scopes.csv),
// and one clearly DEV-labelled bootstrap admin (.invalid email domain).
// No fabricated business data (PRD rule 3). Test fixtures create their own.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './crypto.js';

const here = dirname(fileURLToPath(import.meta.url));

export async function seed(app) {
  const csv = readFileSync(join(here, '..', '..', 'permissions', 'scopes.csv'), 'utf8').trim().split('\n');
  const header = csv[0].split(',');
  if (header[0] !== 'scope') throw new Error('scopes.csv format changed; update seed.');
  for (const line of csv.slice(1)) {
    const cols = line.split(',');
    const scope = cols[0];
    const roles = cols.slice(2).join(',').split(',').map(s => s.trim()).filter(Boolean);
    for (const role of roles) {
      await app.db.system(
        'insert into role_scopes (role, scope) values ($1,$2) on conflict do nothing', [role, scope]);
    }
  }

  const existing = await app.db.system(
    'select id from auth.users where email = $1', [app.config.devAdminEmail]);
  if (!existing.length) {
    const id = crypto.randomUUID();
    await app.db.system('insert into auth.users (id, email, encrypted_password, email_verified_at) values ($1,$2,$3, now())',
      [id, app.config.devAdminEmail, hashPassword(app.config.devAdminPassword)]);
    await app.db.system("insert into profiles (id, name) values ($1,'DEV Bootstrap Admin')", [id]);
    const orgId = crypto.randomUUID();
    await app.db.system(`insert into organizations (id, name, slug, type, created_by)
      values ($1,'Turn2Law Internal (DEV)','t2l-internal-dev','internal',$2)`, [orgId, id]);
    await app.db.system(`insert into org_members (org_id, user_id, role, member_status, joined_at)
      values ($1,$2,'super_admin','active', now())`, [orgId, id]);
    console.log(`[seed] DEV bootstrap admin: ${app.config.devAdminEmail} (super_admin, .invalid domain; change or remove before any real deployment)`);
  }
}
