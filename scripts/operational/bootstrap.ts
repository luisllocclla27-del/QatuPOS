import { randomUUID } from 'node:crypto';
import { createPool } from '../../services/commerce/src/platform/database.js';
import { runtimeConfig } from '../../services/commerce/src/platform/runtime.js';
import { hashPassword } from '../../services/commerce/src/platform/security.js';
import { createOperationalState } from '../../packages/domain/src/operational.js';
if (process.env.QATU_ENV === undefined) process.loadEnvFile('.env.operational');
const config = runtimeConfig(); if (config.environment !== 'operational') throw new Error('Bootstrap requires explicit production configuration and separate database.');
const username = process.env.QATU_ADMIN_USERNAME ?? '', name = process.env.QATU_ADMIN_NAME ?? '', password = process.env.QATU_ADMIN_PASSWORD ?? '', branchName = process.env.QATU_RESTAURANT_NAME ?? '';
if (password.length < 12 || password.length > 128 || password === 'QatuDemo2026!') throw new Error('An individual administrative password is required; never demo credentials.');
const tenant = randomUUID(), branch = randomUUID(), adminId = randomUUID();
const state = createOperationalState({ tenant_id: tenant, branch_id: branch, branch_name: branchName }, { id: adminId, username, name, role: 'admin', station: null }, Number(process.env.QATU_TABLE_COUNT));
const secret = hashPassword(password); const pool = createPool(), client = await pool.connect();
try {
  await client.query('BEGIN'); await client.query("SELECT pg_advisory_xact_lock(hashtext('qatupos-operational-bootstrap'))");
  if (Number((await client.query('SELECT count(*) FROM tenants')).rows[0].count) !== 0) throw new Error('Database already initialized; never overwrite an existing installation.');
  await client.query('INSERT INTO tenants(id,name) VALUES($1,$2)', [tenant, branchName]); await client.query('INSERT INTO branches(tenant_id,id,name) VALUES($1,$2,$3)', [tenant, branch, branchName]);
  const admin = state.staff[0]!; await client.query('INSERT INTO staff_memberships(id,tenant_id,branch_id,username,display_name,role,station,password_salt,password_hash,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true)', [adminId, tenant, branch, username, name, 'admin', null, secret.salt, secret.hash]);
  await client.query('INSERT INTO branch_state(tenant_id,branch_id,version,state) VALUES($1,$2,$3,$4)', [tenant, branch, state.version, JSON.stringify(state)]);
  await client.query('COMMIT'); console.log('Operational installation created with individual admin and empty catalog/inventory; no demonstration data or fiscal series.');
} catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); await pool.end(); }
