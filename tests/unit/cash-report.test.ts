import {describe,it,expect} from 'vitest';
import {createInitialState,projectSnapshot} from '../../packages/domain/src/index.js';
import {cashReportScope,documentsInSession} from '../../apps/pos/src/lib/cash-report.js';
import type {FiscalDocument} from '@qatu/contracts';
function sample(){const state=createInitialState({tenant_id:'t',branch_id:'b'}),user=state.staff.find(u=>u.username==='caja')!;const s=projectSnapshot(state,{tenant_id:'t',branch_id:'b',user});s.server_time='2026-10-03T20:00:00Z';const session={id:'session',drawer_id:'d',business_day_id:'day',owner_id:user.id,shift_label:'diurno' as const,opening_minor:0,expected_minor:0,counted_minor:null,difference_minor:null,state:'open' as const,version:1,opened_at:'2026-10-03T10:00:00Z',closed_at:null,predecessor_handover_id:null};s.cash_sessions=[session];s.fiscal_documents=['2026-10-02T15:00:00Z','2026-10-03T10:00:00Z','2026-10-03T12:00:00Z','2026-10-03T21:00:00Z'].map((created_at,i)=>({id:String(i),created_at} as FiscalDocument));return {s,session};}
describe('read-only scoped cash report',()=>{
 it('includes only documents emitted within current shift',()=>{const {s}=sample();expect(cashReportScope(s).documents.map(d=>d.id)).toEqual(['1','2']);});
 it('excludes documents at closed shift boundary',()=>{const {s,session}=sample();expect(documentsInSession(s,{...session,state:'closed',closed_at:'2026-10-03T12:00:00Z'}).map(d=>d.id)).toEqual(['1']);});
 it('does not turn a redacted expected amount into zero',()=>{const {s}=sample();s.cash_sessions[0]!.expected_minor=null;expect(cashReportScope(s).available).toBe(false);});
 it('keeps report unavailable during own blind count',()=>{const {s}=sample();s.cash_sessions[0]!.state='counting';expect(cashReportScope(s).available).toBe(false);});
 it('does not use another cashier session or fiscal history',()=>{const {s}=sample();s.cash_sessions[0]!.owner_id='other';const report=cashReportScope(s);expect(report.available).toBe(false);expect(report.documents).toEqual([]);});
});
