import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createInitialState, executeCommand } from '../../packages/domain/src/index.js';
function closed(date = '2026-10-04', environment: 'laboratory' | 'operational' = 'operational') {
  const s = createInitialState({tenant_id:'test',branch_id:'branch'});
  s.environment=environment; s.business_day.business_date=date; s.business_day.state='provisionally_closed';
  return s;
}
function open(s:ReturnType<typeof closed>,now:string) { return executeCommand(s,{tenant_id:s.tenant_id,branch_id:s.branch.id,user:s.staff.find(u=>u.role==='admin')!},{type:'day.open',operation_id:randomUUID(),expected_day_version:s.business_day.version,reason:'Apertura posterior al cierre físico'},{now,id:randomUUID}); }
it.each(['2026-10-04T16:00:00Z','2026-10-05T04:59:59Z','2026-10-03T16:00:00Z'])('does not fabricate tomorrow or accept a clock rollback in operational mode (%s)',now=>{const s=closed(),before=structuredClone(s);expect(()=>open(s,now)).toThrow('fecha');expect(s).toEqual(before);});
it.each(['2026-10-05T05:00:00Z','2026-10-10T16:00:00Z'])('opens on current Lima date after midnight or several days (%s)',now=>{const result=open(closed(),now);expect(result.state.business_day.business_date).toBe(now.slice(0,10));expect(result.state.business_days).toHaveLength(2);});
it('keeps synthetic next-day progression only in the laboratory',()=>{const s=closed('2026-10-04','laboratory');expect(open(s,'2026-10-04T16:00:00Z').state.business_day.business_date).toBe('2026-10-05');});
