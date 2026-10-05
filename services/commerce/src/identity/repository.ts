import { requireTransactionalSession } from '../platform/session.js';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor, BranchState } from '@qatu/domain';
import type { StaffPasswordRequest, StaffPasswordResponse, PosCommand } from '@qatu/contracts';
import { RepositoryError } from '../platform/errors.js';
import { canonical, digest, hashPassword, verifyPassword, token } from '../platform/security.js';
export async function syncStaff(client: PoolClient, scope: string[], previous: BranchState, next: BranchState, command: PosCommand) {
  if (!['staff.create', 'staff.update'].includes(command.type)) return;
  for (const staff of next.staff) {
    const old = previous.staff.find(s => s.id === staff.id); if (old && canonical(old) === canonical(staff)) continue;
    if (!old) { await client.query('INSERT INTO staff_memberships(id,tenant_id,branch_id,username,display_name,role,station,password_salt,password_hash,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [staff.id, ...scope, staff.username, staff.name, staff.role, staff.station, token(), '00'.repeat(64), false]); }
    else {
      const changed = await client.query('UPDATE staff_memberships SET display_name=$4,role=$5,station=$6,active=$7 WHERE tenant_id=$1 AND branch_id=$2 AND id=$3', [...scope, staff.id, staff.name, staff.role, staff.station, staff.active !== false]);
      if (changed.rowCount !== 1) throw new RepositoryError('IDENTITY_PROJECTION_MISMATCH', 409, 'El registro de acceso no coincide con el personal. Conserva los datos y solicita revisión administrativa.');
      await client.query('DELETE FROM staff_sessions WHERE tenant_id=$1 AND branch_id=$2 AND staff_id=$3', [...scope, staff.id]);
    }
  }
}
export async function setStaffPassword(pool: Pool, actor: Actor, staffId: string, input: StaffPasswordRequest): Promise<StaffPasswordResponse> {
  const client = await pool.connect(); const scope = [actor.tenant_id, actor.branch_id];
  try {
    await client.query('BEGIN');
    const rows = await client.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2 FOR UPDATE', scope);
    if (!rows.rows[0]) throw new RepositoryError('NOT_FOUND', 404, 'No existe este local.');
    await requireTransactionalSession(client, actor);
    const state = rows.rows[0].state as BranchState, admin = state.staff.find(s => s.id === actor.user.id);
    if (!admin || admin.active === false || admin.role !== 'admin' || actor.user.role !== 'admin') throw new RepositoryError('FORBIDDEN', 403, 'Solo administración activa puede establecer credenciales.');
    const credential = await client.query('SELECT password_salt,password_hash FROM staff_memberships WHERE tenant_id=$1 AND branch_id=$2 AND id=$3 AND active=true', [...scope, admin.id]);
    if (!credential.rows[0] || !await verifyPassword(input.current_password, credential.rows[0].password_salt, credential.rows[0].password_hash)) throw new RepositoryError('REAUTHENTICATION_REQUIRED', 403, 'Verifica tu contraseña administrativa actual.');
    const target = state.staff.find(s => s.id === staffId); if (!target) throw new RepositoryError('NOT_FOUND', 404, 'No existe esa persona en tu local.');
    if ((target.version ?? 1) !== input.expected_version) throw new RepositoryError('VERSION_CONFLICT', 409, 'La persona cambió; actualiza antes de establecer su contraseña.');
    if (input.new_password === 'QatuDemo2026!' || input.new_password.length < 12 || input.new_password.length > 128 || input.reason.trim().length < 3 || input.reason.length > 500) throw new RepositoryError('VALIDATION_ERROR', 400, 'Usa contraseña individual de 12 a 128 caracteres y motivo; no uses la contraseña de demostración.');
    const hashed = hashPassword(input.new_password);
    const changed = await client.query('UPDATE staff_memberships SET password_salt=$4,password_hash=$5 WHERE tenant_id=$1 AND branch_id=$2 AND id=$3', [...scope, target.id, hashed.salt, hashed.hash]);
    if (changed.rowCount !== 1) throw new RepositoryError('IDENTITY_PROJECTION_MISMATCH', 409, 'El registro de acceso no coincide con el personal. La contraseña no fue modificada; solicita revisión administrativa.');
    await client.query('DELETE FROM staff_sessions WHERE tenant_id=$1 AND branch_id=$2 AND staff_id=$3', [...scope, target.id]);
    target.credential_ready = true; target.version = (target.version ?? 1) + 1;
    const op = randomUUID(), now = new Date().toISOString(); state.version++; state.last_event_at = now;
    state.audit.push({ id: randomUUID(), actor_id: admin.id, operation_id: op, action: 'staff.password', entity_id: target.id, reason: input.reason.trim(), created_at: now });
    await client.query('UPDATE branch_state SET state=$3,version=$4,updated_at=now() WHERE tenant_id=$1 AND branch_id=$2', [...scope, JSON.stringify(state), state.version]);
    // Only safe audit metadata; passwords and hashes never enter state, operations or outbox.
    await client.query('INSERT INTO command_operations(tenant_id,branch_id,operation_id,actor_id,request_sha256,command_type,entity_id) VALUES($1,$2,$3,$4,$5,$6,$7)', [...scope, op, admin.id, digest(canonical({ staffId, previous_version: input.expected_version, reason: input.reason.trim() })), 'staff.password', target.id]);
    await client.query('INSERT INTO outbox(tenant_id,branch_id,operation_id,type,entity_id) VALUES($1,$2,$3,$4,$5)', [...scope, op, 'staff.password', target.id]);
    await client.query('COMMIT'); return { staff_id: target.id, version: target.version, credential_ready: true };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
