/**
 * scripts/demo/seed.ts
 *
 * Pobla la base de datos de Supabase para la demo "Recreo Campestre La Laguna" (QatuPOS Pitch Demo).
 * Soporta conexión PostgreSQL directa (DATABASE_URL) o la API REST de Supabase (NEXT_PUBLIC_SUPABASE_URL + ANON/SERVICE_KEY).
 */

import pg from 'pg';
import { INITIAL_DEMO_STATE } from '../../apps/demo/src/lib/demo-seed';

const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || '00000000-0000-4000-8000-000000000001';
const DEMO_BRANCH_ID = process.env.DEMO_BRANCH_ID || '00000000-0000-4000-8000-000000000002';

async function seedViaPostgres(connectionString: string) {
  console.log('🌱 Poblando vía conexión PostgreSQL...');
  const pool = new pg.Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Asegurar tenant
    await client.query(
      `INSERT INTO tenants (id, name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [DEMO_TENANT_ID, 'Recreo Campestre La Laguna']
    );

    // 2. Asegurar sucursal/branch
    await client.query(
      `INSERT INTO branches (id, tenant_id, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, id) DO UPDATE SET name = EXCLUDED.name`,
      [DEMO_BRANCH_ID, DEMO_TENANT_ID, 'La Laguna - Huamanga']
    );

    // 3. Insertar o actualizar branch_state con INITIAL_DEMO_STATE
    await client.query(
      `INSERT INTO branch_state (tenant_id, branch_id, version, state, updated_at)
       VALUES ($1, $2, 1, $3, NOW())
       ON CONFLICT (tenant_id, branch_id)
       DO UPDATE SET state = EXCLUDED.state, version = 1, updated_at = NOW()`,
      [DEMO_TENANT_ID, DEMO_BRANCH_ID, JSON.stringify(INITIAL_DEMO_STATE)]
    );

    await client.query('COMMIT');
    console.log('✅ Estado demo inicializado exitosamente en branch_state.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedViaSupabaseRest(supabaseUrl: string, supabaseKey: string) {
  console.log('🌱 Poblando vía Supabase REST API...');
  const normalizedUrl = supabaseUrl.replace(/\/$/, '');
  const res = await fetch(`${normalizedUrl}/rest/v1/branch_state`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      tenant_id: DEMO_TENANT_ID,
      branch_id: DEMO_BRANCH_ID,
      version: 1,
      state: INITIAL_DEMO_STATE,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error en Supabase REST API (${res.status}): ${errorText}`);
  }

  console.log('✅ branch_state actualizado exitosamente en Supabase vía REST.');
}

async function main() {
  console.log('==============================================');
  console.log('  QatuPOS Demo Seed — Recreo La Laguna');
  console.log(`  Tenant ID: ${DEMO_TENANT_ID}`);
  console.log(`  Branch ID: ${DEMO_BRANCH_ID}`);
  console.log('==============================================');

  const databaseUrl = process.env.DATABASE_URL || process.env.QATU_MAINTENANCE_DATABASE_URL || process.env.SUPABASE_DB_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (databaseUrl) {
    await seedViaPostgres(databaseUrl);
  } else if (supabaseUrl && supabaseKey) {
    await seedViaSupabaseRest(supabaseUrl, supabaseKey);
  } else {
    console.warn('⚠️ No se detectaron credenciales de conexión (DATABASE_URL o NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
    console.log('ℹ️ Para ejecutar el seed en Supabase:');
    console.log('   DATABASE_URL="postgres://..." pnpm seed:demo');
    console.log('   o bien:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="eyJ..." pnpm seed:demo');
  }
}

main().catch((err) => {
  console.error('❌ Error durante el seed de demo:', err);
  process.exit(1);
});
