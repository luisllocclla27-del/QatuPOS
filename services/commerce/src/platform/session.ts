import type { Pool, PoolClient } from 'pg';
import type { Actor } from '@qatu/domain';
export interface AuthSession { actor: Actor; csrf_token: string; expires_at: string }
export async function readSession(pool: Pool, tokenHash: string): Promise<AuthSession | null> {
  const result = await pool.query(`SELECT m.id,m.tenant_id,m.branch_id,m.username,m.display_name,m.role,m.station,s.csrf_token,s.expires_at
    FROM staff_sessions s JOIN staff_memberships m ON m.id=s.staff_id AND m.tenant_id=s.tenant_id AND m.branch_id=s.branch_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND m.active=true`,[tokenHash]);
  const row=result.rows[0]; if(!row) return null;
  return { actor:{tenant_id:row.tenant_id,branch_id:row.branch_id,auth_session_token_hash:tokenHash,user:{id:row.id,username:row.username,name:row.display_name,role:row.role,station:row.station}},csrf_token:row.csrf_token,expires_at:new Date(row.expires_at).toISOString() };
}

/** Recheck session inside the branch lock so revocation also stops queued writes. */
export async function requireTransactionalSession(client: PoolClient, actor: Actor): Promise<void> {
  if (!actor.auth_session_token_hash) return; // Internal/guest actors are validated by their own authority.
  const row = await client.query(`SELECT s.staff_id FROM staff_sessions s JOIN staff_memberships m
    ON m.id=s.staff_id AND m.tenant_id=s.tenant_id AND m.branch_id=s.branch_id
    WHERE s.token_hash=$1 AND s.tenant_id=$2 AND s.branch_id=$3 AND s.staff_id=$4 AND s.expires_at>now() AND m.active=true`, [actor.auth_session_token_hash, actor.tenant_id, actor.branch_id, actor.user.id]);
  if (!row.rows[0]) { const { RepositoryError } = await import('./errors.js'); throw new RepositoryError('AUTHENTICATION_REQUIRED', 401, 'Tu sesión fue revocada; inicia sesión nuevamente.'); }
}
