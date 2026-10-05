import { createInitialState, syntheticStaff } from '../../packages/domain/src/state.js';
import { createPool } from '../../services/commerce/src/platform/database.js';
import { hashPassword } from '../../services/commerce/src/platform/security.js';
if (process.env.QATU_ENV === 'production') throw new Error('Synthetic seed is forbidden in production.');
const pool = createPool(); const client = await pool.connect();
try {
  await client.query('BEGIN');
  for (const other of [false, true]) {
    const tenant = other ? '90000000-0000-4000-8000-000000000002' : '90000000-0000-4000-8000-000000000001';
    const branch = other ? '91000000-0000-4000-8000-000000000002' : '91000000-0000-4000-8000-000000000001';
    const staff = syntheticStaff.map(s => other ? { ...s, id: s.id.replace('10000000','11000000'), username: 'otro_' + s.username } : s);
    await client.query('INSERT INTO tenants(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING',[tenant,other?'Otro comercio sintético':'El Encanto Huamanguino · sintético']);
    await client.query('INSERT INTO branches(tenant_id,id,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[tenant,branch,other?'Local de aislamiento':'El Encanto Huamanguino']);
    for (const s of staff) {
      const secret = hashPassword('QatuDemo2026!');
      await client.query(`INSERT INTO staff_memberships(id,tenant_id,branch_id,username,display_name,role,station,password_salt,password_hash)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,[s.id,tenant,branch,s.username,s.name,s.role,s.station,secret.salt,secret.hash]);
    }
    const state = createInitialState({tenant_id:tenant,branch_id:branch,branch_name:other?'Otro local · laboratorio':'El Encanto Huamanguino'},staff,new Date().toISOString());
    await client.query('INSERT INTO branch_state(tenant_id,branch_id,version,state) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[tenant,branch,state.version,JSON.stringify(state)]);
  }
  // Rename only the synthetic branch profile; never reset its commercial state.
  await client.query("UPDATE branches SET name=$1 WHERE id=$2 AND tenant_id=$3", ['El Encanto Huamanguino','91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001']);
  await client.query("UPDATE branch_state SET state=jsonb_set(state,'{branch,name}',to_jsonb($1::text)) WHERE branch_id=$2 AND tenant_id=$3", ['El Encanto Huamanguino','91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001']);
  await client.query('COMMIT');
  console.log('Seed no destructivo preparado. Cuentas sintéticas: mozo, caja, noche, admin, cocina, heladeria. Password: QatuDemo2026!');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
