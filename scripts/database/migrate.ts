import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPool } from '../../services/commerce/src/platform/database.js';
const pool = createPool();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = new URL('../../database/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name,directory),'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    const previous = await client.query('SELECT sha256 FROM schema_migrations WHERE name=$1',[name]);
    if(previous.rows[0]) {
      if(previous.rows[0].sha256!==hash) throw new Error('Migración aplicada fue modificada: '+name);
      continue;
    }
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)',[name,hash]);
  }
  await client.query('COMMIT');
  console.log('Migración de laboratorio aplicada.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
