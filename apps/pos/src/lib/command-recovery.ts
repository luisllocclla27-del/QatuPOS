import type { PosCommand } from '@qatu/contracts';

type StoragePort = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
// Retain the legacy key to recover pending orders without a migration or two writers.
export const recoveryKey = (userId:string) => `qatu-order-recovery:${userId}`;
const fields: Record<string,{required:string[];optional?:string[]}> = {
  'cash.move':{required:['cash_session_id','expected_version','kind','amount_minor','reason']},
  'order.create':{required:['visit_id','expected_version','quote_id']},
  'collection.authorize':{required:['check_id','expected_version','cash_session_id','method','amount_minor']},
  'collection.release':{required:['authorization_id','expected_version','reason']},
  'payment.confirm':{required:['authorization_id'],optional:['received_minor','evidence']},
  'payment.unknown':{required:['authorization_id','reason']},
  'payment.resolve':{required:['payment_id','expected_version','cash_session_id','evidence']},
  'sale.note':{required:['check_id','expected_version']},
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validate(value: unknown): PosCommand {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Recuperación inválida. Conservamos el registro para revisar la operación.');
  const c=value as Record<string,unknown>,spec=typeof c.type==='string'?fields[c.type]:undefined;
  if (!spec || typeof c.operation_id!=='string' || !uuid.test(c.operation_id)) throw new Error('Tipo o identificador de recuperación inválido.');
  const allowed=['type','operation_id',...spec.required,...spec.optional??[]];
  if (spec.required.some(k=>c[k]===undefined) || Object.keys(c).some(k=>!allowed.includes(k))) throw new Error('Campos de recuperación inválidos.');
  for (const [key,v] of Object.entries(c)) {
    if (key.endsWith('_id') && (typeof v!=='string'||!uuid.test(v))) throw new Error('Identificador de recuperación inválido.');
    if ((key.endsWith('_minor')||key==='expected_version') && (!Number.isSafeInteger(v)||Number(v)<0)) throw new Error('Importe o versión de recuperación inválido.');
  }
  if (c.method!==undefined && !['cash','card','yape'].includes(String(c.method))) throw new Error('Medio de recuperación inválido.');
  if (c.kind!==undefined && !['paid_in','paid_out'].includes(String(c.kind))) throw new Error('Tipo de movimiento inválido.');
  if (c.reason!==undefined && (typeof c.reason!=='string'||c.reason.length>1000)) throw new Error('Motivo de recuperación inválido.');
  if (c.evidence!==undefined) {
    const e=c.evidence;
    if (!e||typeof e!=='object'||Array.isArray(e)) throw new Error('Evidencia de recuperación inválida.');
    const entries=e as Record<string,unknown>,keys=['source','merchant_account','external_reference','observed_at'];
    if (Object.keys(entries).some(k=>!keys.includes(k))||keys.some(k=>typeof entries[k]!=='string')||entries.source!=='merchant_verified') throw new Error('Campos de evidencia inválidos.');
  }
  return c as unknown as PosCommand; // Server still validates command, session, role and authority.
}
export function saveRecovery(storage:StoragePort,userId:string,command:PosCommand) {
  if (!fields[command.type]) return false;
  const text=JSON.stringify(command);if(text.length>65536)throw new Error('La operación supera el límite de recuperación.');
  validate(JSON.parse(text));
  const existing=loadRecovery(storage,userId);
  if(existing && JSON.stringify(existing)!==text) throw new Error('Hay otra operación por recuperar. No reemplazaremos su intención.');
  storage.setItem(recoveryKey(userId),text);
  return true;
}
export function loadRecovery(storage:StoragePort,userId:string):PosCommand|null {
  const text=storage.getItem(recoveryKey(userId));if(text===null)return null;
  if(text.length>65536)throw new Error('Recuperación demasiado extensa; requiere revisión.');
  return validate(JSON.parse(text));
}
export function clearRecovery(storage:StoragePort,userId:string) {storage.removeItem(recoveryKey(userId));}
