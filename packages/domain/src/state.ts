import type { PosSnapshot, StaffUser, StockItem, CashSession, ShiftHandover } from '@qatu/contracts';

export interface Scope { tenant_id: string; branch_id: string; branch_name?: string; drawer_id?: string; business_date?: string }
export interface Actor { tenant_id: string; branch_id: string; user: StaffUser; auth_session_token_hash?: string }
export interface BranchState extends Omit<PosSnapshot, 'user' | 'capabilities' | 'server_time' | 'stock' | 'cash_sessions' | 'handovers'> {
  tenant_id: string;
  last_event_at: string;
  stock: StockItem[];
  cash_sessions: CashSession[];
  handovers: ShiftHandover[];
  count_versions: Record<string, Record<string, number>>;
}

export const syntheticStaff: StaffUser[] = [
  { id: '10000000-0000-4000-8000-000000000001', username: 'mozo', name: 'Ana · moza', role: 'waiter', station: null },
  { id: '10000000-0000-4000-8000-000000000002', username: 'caja', name: 'Luis · caja diurna', role: 'cashier', station: 'caja' },
  { id: '10000000-0000-4000-8000-000000000003', username: 'noche', name: 'Rosa · caja nocturna', role: 'cashier', station: 'caja' },
  { id: '10000000-0000-4000-8000-000000000004', username: 'admin', name: 'Elena · administración', role: 'admin', station: null },
  { id: '10000000-0000-4000-8000-000000000005', username: 'cocina', name: 'Cocina', role: 'kitchen', station: 'cocina' },
  { id: '10000000-0000-4000-8000-000000000006', username: 'heladeria', name: 'Heladería', role: 'kitchen', station: 'heladeria' },
];

export function createInitialState(scope: Scope, staff: StaffUser[] = syntheticStaff, now = '2026-10-01T12:00:00Z'): BranchState {
  const stock = [
    { id: '30000000-0000-4000-8000-000000000001', name: 'Cerveza personal', sku: 'BEB-CERV-330', station: 'caja' as const, on_hand: 48 },
    { id: '30000000-0000-4000-8000-000000000002', name: 'Gaseosa personal', sku: 'BEB-GAS-500', station: 'caja' as const, on_hand: 36 },
    { id: '30000000-0000-4000-8000-000000000003', name: 'Agua', sku: 'BEB-AGUA-625', station: 'caja' as const, on_hand: 24 },
    { id: '30000000-0000-4000-8000-000000000004', name: 'Helado individual', sku: 'HEL-IND', station: 'heladeria' as const, on_hand: 20 },
  ].map(s => ({ ...s, unit: 'unit' as const, reserved: 0, available: s.on_hand, version: 1 }));
  const definitions = [
    ['Ceviche clásico', 'Platos', 3500, 'cocina', null],
    ['Arroz con mariscos', 'Platos', 3200, 'cocina', null],
    ['Jalea mixta', 'Platos', 4200, 'cocina', null],
    ['Cerveza personal', 'Bebidas', 1000, 'caja', stock[0]!.id],
    ['Gaseosa personal', 'Bebidas', 600, 'caja', stock[1]!.id],
    ['Agua', 'Bebidas', 400, 'caja', stock[2]!.id],
    ['Refresco de maracuyá', 'Heladería', 800, 'heladeria', null],
    ['Helado individual', 'Heladería', 700, 'heladeria', stock[3]!.id],
    ['Porción de torta', 'Heladería', 900, 'heladeria', null],
  ] as const;
  return {
    tenant_id: scope.tenant_id, last_event_at: now, environment: 'laboratory', authority: { mode: 'cloud', node_id: 'laboratory-postgres', epoch: 1 }, version: 1,
    branch: { id: scope.branch_id, name: scope.branch_name ?? 'Marisquería · laboratorio', currency: 'PEN', timezone: 'America/Lima', drawer_id: scope.drawer_id ?? '40000000-0000-4000-8000-000000000001' },
    staff: structuredClone(staff),
    products: definitions.map((d, i) => ({ id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, name: d[0], category: d[1], price_minor: d[2], station: d[3], stock_policy: d[4] ? 'unit' : 'none', stock_item_id: d[4], active: true, version: 1 })),
    tables: Array.from({ length: 10 }, (_, i) => ({ id: `50000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, label: `Mesa ${String(i + 1).padStart(2, '0')}`, seats: 4, version: 1, visit_id: null })),
    guest_accesses: [], visits: [], orders: [], checks: [], stock,
    stock_movements: stock.map((s, i) => ({ id: `60000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, stock_item_id: s.id, quantity_delta: s.on_hand, kind: 'opening', operation_id: '00000000-0000-4000-8000-000000000001', actor_id: staff.find(u => u.role === 'admin')?.id ?? staff[0]!.id, created_at: now, reason: 'Existencia sintética inicial' })),
    print_jobs: [], authorizations: [], payments: [], cash_sessions: [], cash_movements: [], handovers: [], inventory_counts: [], cash_close_approvals: [],
    business_day: { id: '70000000-0000-4000-8000-000000000001', business_date: scope.business_date ?? '2026-10-01', timezone: 'America/Lima', state: 'open', version: 1 },
    business_days: [{ id: '70000000-0000-4000-8000-000000000001', business_date: scope.business_date ?? '2026-10-01', timezone: 'America/Lima', state: 'open', version: 1 }],
    day_closes: [], sales_notes: [], audit: [], catalog_audit: [], void_audit: [], fiscal_documents: [], discount_audit: [], count_versions: {},
  };
}
