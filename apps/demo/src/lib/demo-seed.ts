// apps/demo/src/lib/demo-seed.ts

import type { BranchState } from '@qatu/domain';
import type {
  Check,
  DiningTable,
  Order,
  Product,
  StaffUser,
  StockItem,
  TableVisit,
} from '@qatu/contracts';
import {
  DEMO_PRODUCTS,
  DEMO_RESTAURANT_NAME,
  DEMO_STAFF,
  DEMO_TABLES,
} from './demo-constants';

const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || '00000000-0000-4000-8000-000000000001';
const DEMO_BRANCH_ID = process.env.DEMO_BRANCH_ID || '00000000-0000-4000-8000-000000000002';
const DEMO_DRAWER_ID = '40000000-0000-4000-8000-000000000001';
const DEMO_DAY_ID = '90000000-0000-4000-8000-000000000001';

const STAFF_IDS: Record<string, string> = {
  carlos: '10000000-0000-4000-8000-000000000001',
  ana: '10000000-0000-4000-8000-000000000002',
  'chef.pepe': '10000000-0000-4000-8000-000000000003',
  admin: '10000000-0000-4000-8000-000000000004',
};

export function createInitialDemoState(now = '2026-10-06T12:00:00.000Z'): BranchState {
  const staff: StaffUser[] = DEMO_STAFF.map(s => ({
    id: STAFF_IDS[s.username] || `10000000-0000-4000-8000-${s.username}`,
    username: s.username,
    name: s.name,
    role: s.role,
    station: s.station,
    active: true,
    version: 1,
  }));

  const products: Product[] = DEMO_PRODUCTS.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price_minor: p.price_cents,
    station: p.station,
    stock_policy: 'none' as const,
    stock_item_id: null,
    active: true,
    version: 1,
  }));

  const tables: DiningTable[] = DEMO_TABLES.map(t => {
    const tableId = `50000000-0000-4000-8000-${String(t.number).padStart(12, '0')}`;
    const isOccupied = t.initial_status !== 'free';
    const visitId = isOccupied
      ? `60000000-0000-4000-8000-${String(t.number).padStart(12, '0')}`
      : null;

    return {
      id: tableId,
      label: `Mesa ${String(t.number).padStart(2, '0')}`,
      seats: t.seats,
      version: 1,
      visit_id: visitId,
    };
  });

  const occupiedTables = DEMO_TABLES.filter(t => t.initial_status !== 'free');

  const visits: TableVisit[] = occupiedTables.map(t => {
    const tableId = `50000000-0000-4000-8000-${String(t.number).padStart(12, '0')}`;
    const visitId = `60000000-0000-4000-8000-${String(t.number).padStart(12, '0')}`;
    const checkId = `70000000-0000-4000-8000-${String(t.number).padStart(12, '0')}`;

    return {
      id: visitId,
      table_id: tableId,
      check_id: checkId,
      version: 1,
      status: 'open',
      opened_by: STAFF_IDS.carlos,
      opened_at: now,
      closed_at: null,
      responsible_waiter_id: STAFF_IDS.carlos,
      responsible_waiter_name: 'Carlos Quispe',
    };
  });

  const checks: Check[] = occupiedTables.map(t => {
    const visitId = `60000000-0000-4000-8000-${String(t.number).padStart(12, '0')}`;
    const checkId = `70000000-0000-4000-8000-${String(t.number).padStart(12, '0')}`;
    const totalMinor = t.initial_status === 'paying' ? 12400 : 7800;

    return {
      id: checkId,
      visit_id: visitId,
      version: 1,
      status: 'open',
      total_minor: totalMinor,
      paid_minor: 0,
      held_minor: 0,
      remaining_collectible_minor: totalMinor,
      fiscal_status: 'pending',
      currency: 'PEN',
      discount_minor: 0,
    };
  });

  // 3 comandas iniciales en cocina
  const orders: Order[] = [
    {
      id: '80000000-0000-4000-8000-000000000001',
      visit_id: `60000000-0000-4000-8000-${String(1).padStart(12, '0')}`,
      check_id: `70000000-0000-4000-8000-${String(1).padStart(12, '0')}`,
      batch_number: 1,
      created_by: STAFF_IDS.carlos,
      created_at: now,
      business_day_id: DEMO_DAY_ID,
      status: 'accepted',
      source: 'staff',
      lines: [
        {
          id: '91000000-0000-4000-8000-000000000001',
          order_id: '80000000-0000-4000-8000-000000000001',
          product_id: 'cv-001',
          product_name: 'Ceviche Clásico',
          station: 'cocina',
          unit_price_minor: 3800,
          quantity: 2,
          prepared_quantity: 0,
          fulfilled_quantity: 0,
          voided_quantity: 0,
          stock_policy: 'none',
          stock_item_id: null,
          note: 'Sin ají',
          version: 1,
        },
        {
          id: '91000000-0000-4000-8000-000000000002',
          order_id: '80000000-0000-4000-8000-000000000001',
          product_id: 'be-004',
          product_name: 'Chicha Morada 1L',
          station: 'caja',
          unit_price_minor: 1200,
          quantity: 1,
          prepared_quantity: 0,
          fulfilled_quantity: 0,
          voided_quantity: 0,
          stock_policy: 'none',
          stock_item_id: null,
          note: '',
          version: 1,
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000002',
      visit_id: `60000000-0000-4000-8000-${String(2).padStart(12, '0')}`,
      check_id: `70000000-0000-4000-8000-${String(2).padStart(12, '0')}`,
      batch_number: 1,
      created_by: STAFF_IDS.carlos,
      created_at: now,
      business_day_id: DEMO_DAY_ID,
      status: 'accepted',
      source: 'guest',
      lines: [
        {
          id: '91000000-0000-4000-8000-000000000003',
          order_id: '80000000-0000-4000-8000-000000000002',
          product_id: 'pr-002',
          product_name: 'Parrilla Mixta',
          station: 'cocina',
          unit_price_minor: 8900,
          quantity: 1,
          prepared_quantity: 0,
          fulfilled_quantity: 0,
          voided_quantity: 0,
          stock_policy: 'none',
          stock_item_id: null,
          note: 'Término medio',
          version: 1,
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000003',
      visit_id: `60000000-0000-4000-8000-${String(13).padStart(12, '0')}`,
      check_id: `70000000-0000-4000-8000-${String(13).padStart(12, '0')}`,
      batch_number: 1,
      created_by: STAFF_IDS.carlos,
      created_at: now,
      business_day_id: DEMO_DAY_ID,
      status: 'accepted',
      source: 'staff',
      lines: [
        {
          id: '91000000-0000-4000-8000-000000000004',
          order_id: '80000000-0000-4000-8000-000000000003',
          product_id: 'ar-004',
          product_name: 'Lomo Saltado',
          station: 'cocina',
          unit_price_minor: 3800,
          quantity: 2,
          prepared_quantity: 0,
          fulfilled_quantity: 0,
          voided_quantity: 0,
          stock_policy: 'none',
          stock_item_id: null,
          note: '',
          version: 1,
        },
        {
          id: '91000000-0000-4000-8000-000000000005',
          order_id: '80000000-0000-4000-8000-000000000003',
          product_id: 'po-001',
          product_name: 'Picarones x6',
          station: 'heladeria',
          unit_price_minor: 1400,
          quantity: 1,
          prepared_quantity: 0,
          fulfilled_quantity: 0,
          voided_quantity: 0,
          stock_policy: 'none',
          stock_item_id: null,
          note: '',
          version: 1,
        },
      ],
    },
  ];

  const stock: StockItem[] = [
    { id: '30000000-0000-4000-8000-000000000001', name: 'Inca Kola 500ml', sku: 'BEB-INK-500', unit: 'unit', station: 'caja', on_hand: 48, reserved: 0, available: 48, version: 1 },
    { id: '30000000-0000-4000-8000-000000000002', name: 'Cerveza Cristal 620ml', sku: 'BEB-CRI-620', unit: 'unit', station: 'caja', on_hand: 60, reserved: 0, available: 60, version: 1 },
    { id: '30000000-0000-4000-8000-000000000003', name: 'Cerveza Pilsen 620ml', sku: 'BEB-PIL-620', unit: 'unit', station: 'caja', on_hand: 60, reserved: 0, available: 60, version: 1 },
    { id: '30000000-0000-4000-8000-000000000004', name: 'Agua San Luis 625ml', sku: 'BEB-AGU-625', unit: 'unit', station: 'caja', on_hand: 36, reserved: 0, available: 36, version: 1 },
  ];

  return {
    tenant_id: DEMO_TENANT_ID,
    last_event_at: now,
    environment: 'laboratory',
    authority: { mode: 'cloud', node_id: 'demo-supabase', epoch: 1 },
    version: 1,
    branch: {
      id: DEMO_BRANCH_ID,
      name: DEMO_RESTAURANT_NAME,
      currency: 'PEN',
      timezone: 'America/Lima',
      drawer_id: DEMO_DRAWER_ID,
    },
    staff,
    products,
    tables,
    visits,
    orders,
    checks,
    stock,
    stock_movements: [],
    guest_accesses: [],
    print_jobs: [],
    authorizations: [],
    payments: [],
    cash_sessions: [],
    cash_movements: [],
    handovers: [],
    inventory_counts: [],
    cash_close_approvals: [],
    business_day: {
      id: DEMO_DAY_ID,
      business_date: '2026-10-06',
      timezone: 'America/Lima',
      state: 'open',
      version: 1,
    },
    business_days: [
      {
        id: DEMO_DAY_ID,
        business_date: '2026-10-06',
        timezone: 'America/Lima',
        state: 'open',
        version: 1,
      },
    ],
    day_closes: [],
    sales_notes: [],
    audit: [],
    catalog_audit: [],
    void_audit: [],
    fiscal_documents: [],
    discount_audit: [],
    count_versions: {},
  };
}

export const INITIAL_DEMO_STATE: BranchState = createInitialDemoState();
export const INITIAL_BRANCH_STATE: BranchState = INITIAL_DEMO_STATE;

export {
  DEMO_PRODUCTS,
  DEMO_TABLES,
  DEMO_STAFF,
  DEMO_RESTAURANT_NAME,
};
