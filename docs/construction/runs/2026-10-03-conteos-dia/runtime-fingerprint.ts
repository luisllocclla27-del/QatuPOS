import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPool } from '../../../../services/commerce/src/platform/database.js';
const pool = createPool();
try {
  const rows = (await pool.query('SELECT tenant_id,branch_id,version,state FROM branch_state ORDER BY tenant_id,branch_id')).rows;
  const report = {
    captured_at: new Date().toISOString(), branches: rows.length,
    state_sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    pending_counts: rows.reduce((n, r) => n + r.state.inventory_counts.filter((c: any) => c.status === 'declared').length, 0),
    legacy_pending_counts: rows.reduce((n, r) => n + r.state.inventory_counts.filter((c: any) => c.status === 'declared' && !c.business_day_id).length, 0),
  };
  const suffix = process.argv[2]; if (!['before', 'after'].includes(suffix ?? '')) throw new Error('Expected before/after');
  await writeFile(new URL(`runtime-${suffix}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await pool.end(); }
