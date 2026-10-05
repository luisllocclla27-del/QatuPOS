import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createPool, defaultDatabaseUrl } from '../../services/commerce/src/platform/database.js';
import { hashPassword } from '../../services/commerce/src/platform/security.js';
import { createInitialState, syntheticStaff } from '../../packages/domain/src/state.js';

export const tenant = '90000000-0000-4000-8000-000000000001';
export const branch = '91000000-0000-4000-8000-000000000001';
/** Each suite owns a fresh database. Never touches the interactive laboratory data. */
export async function testDatabase() {
  const name = 'qatupos_lab_test_' + randomUUID().replaceAll('-', '');
  const admin = createPool(defaultDatabaseUrl);
  await admin.query(`CREATE DATABASE "${name}"`);
  const url = new URL(defaultDatabaseUrl); url.pathname = '/' + name;
  const pool = createPool(url.toString());
  const directory = new URL('../../database/migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) {
    await pool.query(await readFile(new URL(file, directory), 'utf8'));
  }
  const secret = hashPassword('QatuDemo2026!');
  async function reset() {
    // Fixed tables inside this freshly created, suite-owned database only.
    await pool.query('TRUNCATE check_discount_audit, fiscal_documents, fiscal_series, order_void_audit, order_quotes, catalog_audit, outbox, external_receipts, command_operations, staff_sessions, branch_state, staff_memberships, branches, tenants RESTART IDENTITY CASCADE');
    for (const other of [false, true]) {
      const t = other ? tenant.replace(/1$/, '2') : tenant;
      const b = other ? branch.replace(/1$/, '2') : branch;
      const staff = syntheticStaff.map(s => other ? { ...s, id: s.id.replace('10000000','11000000'), username: 'otro_' + s.username } : s);
      await pool.query('INSERT INTO tenants VALUES($1,$2)', [t, 'Synthetic tenant']);
      await pool.query('INSERT INTO branches(tenant_id,id,name) VALUES($1,$2,$3)', [t,b,'El Encanto Huamanguino']);
      await pool.query('INSERT INTO fiscal_series(tenant_id, branch_id, doc_type, series, current_number) VALUES($1,$2,$3,$4,$5), ($1,$2,$6,$7,$8), ($1,$2,$9,$10,$11), ($1,$2,$12,$13,$14)', [t, b, 'boleta', 'B001', 0, 'factura', 'F001', 0, 'nota_credito_boleta', 'BC01', 0, 'nota_credito_factura', 'FC01', 0]);
      for (const s of staff) await pool.query('INSERT INTO staff_memberships(id,tenant_id,branch_id,username,display_name,role,station,password_salt,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [s.id,t,b,s.username,s.name,s.role,s.station,secret.salt,secret.hash]);
      const state = createInitialState({tenant_id:t,branch_id:b,branch_name:'El Encanto Huamanguino'},staff,new Date().toISOString());
      await pool.query('INSERT INTO branch_state(tenant_id,branch_id,version,state) VALUES($1,$2,$3,$4)', [t,b,state.version,JSON.stringify(state)]);
    }
  }
  await reset();
  return {pool, url:url.toString(), reset, async close() {
    await pool.end();
    // Identifier was generated here, not supplied by environment or user input.
    if (!/^qatupos_lab_test_[a-f0-9]{32}$/.test(name)) throw new Error('Unsafe test database name');
    try { await admin.query(`DROP DATABASE "${name}"`); } finally { await admin.end(); }
  }};
}
