import { randomUUID } from 'node:crypto';
import type { StaffUser } from '@qatu/contracts';
import { createInitialState, type BranchState, type Scope } from './state.js';
export function createOperationalState(scope: Scope, admin: StaffUser, tableCount: number, now = new Date().toISOString()): BranchState {
  if (!scope.branch_name?.trim() || !/^[a-z][a-z0-9_.-]{2,49}$/.test(admin.username) || admin.name.trim().length < 2 || admin.name.length > 100 || admin.role !== 'admin' || admin.station !== null || !Number.isInteger(tableCount) || tableCount < 1 || tableCount > 500 || !Number.isFinite(Date.parse(now))) throw new Error('Incomplete operational installation profile.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now)); const part = (name: string) => parts.find(p => p.type === name)!.value;
  const state = createInitialState({ ...scope, drawer_id: randomUUID() }, [{ ...admin, active: true, version: 1, credential_ready: true }], now);
  state.environment = 'operational'; state.authority.node_id = 'primary-' + scope.branch_id;
  state.products = []; state.stock = []; state.stock_movements = [];
  state.tables = Array.from({ length: tableCount }, (_, i) => ({ id: randomUUID(), label: 'Mesa ' + String(i + 1).padStart(2, '0'), seats: 4, version: 1, visit_id: null }));
  state.business_day = { ...state.business_day, id: randomUUID(), business_date: `${part('year')}-${part('month')}-${part('day')}` }; state.business_days = [structuredClone(state.business_day)];
  return state;
}
