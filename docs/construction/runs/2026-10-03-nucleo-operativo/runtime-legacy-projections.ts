import { writeFile } from 'node:fs/promises';
import { createPool } from '../../../../services/commerce/src/platform/database.js';
import { projectSnapshot, type BranchState } from '../../../../packages/domain/src/index.js';
import { snapshotValid } from '../../../../services/commerce/src/platform/validation.js';
const pool = createPool();
try {
  const rows = (await pool.query('SELECT tenant_id,branch_id,state FROM branch_state ORDER BY tenant_id,branch_id')).rows;
  let checked = 0;
  for (const row of rows) {
    const state = row.state as BranchState;
    for (const user of state.staff) {
      const snapshot = projectSnapshot(state, { tenant_id: row.tenant_id, branch_id: row.branch_id, user });
      if (!snapshotValid(snapshot)) throw new Error('Legacy projection fails current snapshot schema');
      checked++;
    }
  }
  const result = { passed: true, scope: 'read-only projection of preserved interactive branch_state for all existing staff', branches: rows.length, projections_checked: checked, commercial_writes: 0 };
  await writeFile(new URL('runtime-legacy-projections.json', import.meta.url), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
} finally { await pool.end(); }
