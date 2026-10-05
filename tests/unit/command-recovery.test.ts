import { describe, it, expect, vi } from 'vitest';
import { sendCommand } from '../../apps/pos/src/lib/client.js';
import { saveRecovery, loadRecovery, clearRecovery, recoveryKey } from '../../apps/pos/src/lib/command-recovery.js';
import type { PosCommand } from '@qatu/contracts';
const id='10000000-0000-4000-8000-000000000001';
const command={type:'payment.confirm',operation_id:id,authorization_id:id,received_minor:5000} as const;
function storage(){const m=new Map<string,string>();return{getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);}};}
describe('018 recovery whitelist',()=>{
  it('202 acknowledgment never confirms a command',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({operation_id:id}),{status:202})));try{await expect(sendCommand(command,'synthetic-csrf')).rejects.toMatchObject({code:'NETWORK',status:202});}finally{vi.unstubAllGlobals();}});
  it('canonical 200 response can be confirmed',async()=>{const body={operation_id:id};vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(body),{status:200})));try{await expect(sendCommand(command,'synthetic-csrf')).resolves.toEqual(body);}finally{vi.unstubAllGlobals();}});
  it('roundtrips confirmation with same operation id',()=>{const s=storage();saveRecovery(s,id,command);expect(loadRecovery(s,id)).toEqual(command);clearRecovery(s,id);expect(loadRecovery(s,id)).toBeNull();});
  it('preserves legacy order recovery',()=>{const s=storage();const c={type:'order.create',operation_id:id,visit_id:id,expected_version:2,quote_id:id};s.setItem(recoveryKey(id),JSON.stringify(c));expect(loadRecovery(s,id)).toEqual(c);});
  it('separates users',()=>{const s=storage();saveRecovery(s,id,command);expect(loadRecovery(s,'other')).toBeNull();});
  it('cannot overwrite an unresolved different operation',()=>{const s=storage();saveRecovery(s,id,command);expect(()=>saveRecovery(s,id,{...command,operation_id:'20000000-0000-4000-8000-000000000002'})).toThrow();expect(loadRecovery(s,id)).toEqual(command);});
  it('same identifier cannot silently replace a different amount',()=>{const s=storage();saveRecovery(s,id,command);expect(()=>saveRecovery(s,id,{...command,received_minor:6000})).toThrow();expect(loadRecovery(s,id)).toEqual(command);});
  it('never persists passwords/staff commands',()=>{const s=storage();expect(saveRecovery(s,id,{type:'staff.password',operation_id:id,new_password:'private'} as any)).toBe(false);expect(s.getItem(recoveryKey(id))).toBeNull();});
  it('rejects unexpected secret fields',()=>expect(()=>saveRecovery(storage(),id,{...command,csrf_token:'secret'} as any)).toThrow());
  it('rejects evidence containing credentials',()=>expect(()=>saveRecovery(storage(),id,{...command,received_minor:undefined,evidence:{source:'merchant_verified',merchant_account:'demo',external_reference:'demo',observed_at:'2026-10-05T12:00:00Z',password:'secret'}} as any)).toThrow());
  it('corruption is surfaced and preserved',()=>{const s=storage();s.setItem(recoveryKey(id),'{bad');expect(()=>loadRecovery(s,id)).toThrow();expect(s.getItem(recoveryKey(id))).toBe('{bad');});
  it('unknown stored commands cannot execute',()=>{const s=storage();s.setItem(recoveryKey(id),JSON.stringify({type:'staff.password',operation_id:id}));expect(()=>loadRecovery(s,id)).toThrow();});
  it('storage write failure is surfaced before network can start',()=>{const s=storage();s.setItem=()=>{throw new Error('denied');};expect(()=>saveRecovery(s,id,command)).toThrow();});
  it('invalid operation id is rejected',()=>expect(()=>saveRecovery(storage(),id,{...command,operation_id:'invalid'})).toThrow());
  it('oversized stored recovery is rejected',()=>{const s=storage();s.setItem(recoveryKey(id),' '.repeat(65537));expect(()=>loadRecovery(s,id)).toThrow();});
  for(const c of [
    {type:'cash.move',cash_session_id:id,expected_version:1,kind:'paid_in',amount_minor:1000,reason:'Fondo externo declarado'},
    {type:'cash.move',cash_session_id:id,expected_version:1,kind:'paid_out',amount_minor:1000,reason:'Retiro externo declarado'},
    {type:'collection.authorize',check_id:id,expected_version:1,cash_session_id:id,method:'cash',amount_minor:3500},
    {type:'collection.release',authorization_id:id,expected_version:1,reason:'Cliente cambia método'},
    {type:'payment.unknown',authorization_id:id,reason:'Pendiente proveedor'},
    {type:'payment.resolve',payment_id:id,expected_version:1,cash_session_id:id,evidence:{source:'merchant_verified',merchant_account:'demo',external_reference:'ref',observed_at:'2026-10-05T12:00:00Z'}},
    {type:'sale.note',check_id:id,expected_version:1},
  ]) it(`recovers ${c.type}`,()=>{const s=storage();const input={...c,operation_id:id} as PosCommand;saveRecovery(s,id,input);expect(loadRecovery(s,id)).toEqual(input);});
  it('rejects an invalid cash movement kind',()=>expect(()=>saveRecovery(storage(),id,{type:'cash.move',operation_id:id,cash_session_id:id,expected_version:1,kind:'sale',amount_minor:1000,reason:'Invalid'} as any)).toThrow());
});
