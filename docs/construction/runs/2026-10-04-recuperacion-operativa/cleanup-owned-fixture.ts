import { createPool } from '../../../../services/commerce/src/platform/database.js';
import { writeFile } from 'node:fs/promises';
// Exact suite-owned ID from recovery-third.txt; never enumerate/drop other test databases.
const name='qatupos_lab_test_92e426acb6f243d9a0ef7c92cc425381';
if(!/^qatupos_lab_test_[a-f0-9]{32}$/.test(name))throw new Error('Unsafe fixture');
const pool=createPool();
try{
  const active=await pool.query('SELECT count(*) AS count FROM pg_stat_activity WHERE datname=$1',[name]);
  if(Number(active.rows[0].count)!==0)throw new Error('Previous writer still connected; do not clean');
  const exists=(await pool.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount!==0;
  if(exists)await pool.query(`DROP DATABASE "${name}"`);
  await writeFile(new URL('cleanup-owned-fixture.json',import.meta.url),JSON.stringify({fixture:name,previous_writer_finished:true,connections:0,removed:exists,interactive_database_modified:false},null,2)+'\n');
}finally{await pool.end();}
