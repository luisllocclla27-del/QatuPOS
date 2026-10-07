import { describe, expect, it } from 'vitest';
import {
  DEMO_PRODUCTS,
  DEMO_RESTAURANT_NAME,
  DEMO_RESET_INTERVAL_MINUTES,
  DEMO_STAFF,
  DEMO_TABLES,
  STATUS_COLORS,
  formatMoney,
} from '../../apps/demo/src/lib/demo-constants';
import {
  INITIAL_BRANCH_STATE,
  INITIAL_DEMO_STATE,
  createInitialDemoState,
} from '../../apps/demo/src/lib/demo-seed';
import { projectSnapshot } from '../../packages/domain/src/index.js';

describe('Demo Constants & Carta - Recreo La Laguna', () => {
  it('defines correct restaurant name and reset interval', () => {
    expect(DEMO_RESTAURANT_NAME).toBe('Recreo La Laguna');
    expect(DEMO_RESET_INTERVAL_MINUTES).toBe(30);
  });

  it('contains exactly 28 products with required properties', () => {
    expect(DEMO_PRODUCTS).toHaveLength(28);

    const categories = new Set(DEMO_PRODUCTS.map(p => p.category));
    expect(categories).toContain('Ceviches & Tiraditos');
    expect(categories).toContain('Parrillas');
    expect(categories).toContain('Arroces & Guisos');
    expect(categories).toContain('Bebidas');
    expect(categories).toContain('Postres');

    for (const product of DEMO_PRODUCTS) {
      expect(product.id).toMatch(/^(cv|pr|ar|be|po)-\d{3}$/);
      expect(product.name).toBeTruthy();
      expect(product.price_cents).toBeGreaterThan(0);
      expect(['cocina', 'caja', 'heladeria']).toContain(product.station);
      expect(product.emoji).toBeTruthy();
    }
  });

  it('contains exactly 40 tables distributed across 4 zones', () => {
    expect(DEMO_TABLES).toHaveLength(40);

    const laguna = DEMO_TABLES.filter(t => t.zone === 'Zona Laguna');
    const jardin = DEMO_TABLES.filter(t => t.zone === 'Zona Jardín');
    const techada = DEMO_TABLES.filter(t => t.zone === 'Zona Techada');
    const vip = DEMO_TABLES.filter(t => t.zone === 'Zona VIP');

    expect(laguna).toHaveLength(12);
    expect(jardin).toHaveLength(10);
    expect(techada).toHaveLength(10);
    expect(vip).toHaveLength(8);

    const active = DEMO_TABLES.filter(t => t.initial_status === 'active');
    expect(active).toHaveLength(12);

    for (const table of DEMO_TABLES) {
      expect(table.number).toBeGreaterThanOrEqual(1);
      expect(table.number).toBeLessThanOrEqual(40);
      expect(table.seats).toBeGreaterThan(0);
      expect(['free', 'active', 'paying', 'alert']).toContain(table.initial_status);
    }
  });

  it('defines 4 staff credentials for Carlos, Ana, José, and Admin', () => {
    expect(DEMO_STAFF).toHaveLength(4);
    const usernames = DEMO_STAFF.map(s => s.username);
    expect(usernames).toEqual(['carlos', 'ana', 'chef.pepe', 'admin']);

    const carlos = DEMO_STAFF.find(s => s.username === 'carlos');
    expect(carlos).toEqual({
      username: 'carlos',
      name: 'Carlos Quispe',
      role: 'waiter',
      pin: '1234',
      station: null,
    });
  });

  it('formats money properly from cents', () => {
    expect(formatMoney(3800)).toBe('S/ 38.00');
    expect(formatMoney(450)).toBe('S/ 4.50');
    expect(formatMoney(0)).toBe('S/ 0.00');
  });

  it('provides status colors for all 4 table statuses', () => {
    expect(STATUS_COLORS.free).toBe('#22c55e');
    expect(STATUS_COLORS.active).toBe('#3b82f6');
    expect(STATUS_COLORS.paying).toBe('#f59e0b');
    expect(STATUS_COLORS.alert).toBe('#ef4444');
  });
});

describe('Demo Seed - Initial BranchState', () => {
  it('produces a valid BranchState for Recreo La Laguna', () => {
    expect(INITIAL_DEMO_STATE).toBe(INITIAL_BRANCH_STATE);
    expect(INITIAL_DEMO_STATE.branch.name).toBe('Recreo La Laguna');
    expect(INITIAL_DEMO_STATE.products).toHaveLength(28);
    expect(INITIAL_DEMO_STATE.tables).toHaveLength(40);
    expect(INITIAL_DEMO_STATE.staff).toHaveLength(4);
    expect(INITIAL_DEMO_STATE.visits.length).toBeGreaterThan(0);
    expect(INITIAL_DEMO_STATE.orders).toHaveLength(3);
    expect(INITIAL_DEMO_STATE.business_day.state).toBe('open');
  });

  it('projects a snapshot through pure domain projectSnapshot', () => {
    const actor = {
      tenant_id: INITIAL_DEMO_STATE.tenant_id,
      branch_id: INITIAL_DEMO_STATE.branch.id,
      user: INITIAL_DEMO_STATE.staff[0],
    };

    const snapshot = projectSnapshot(INITIAL_DEMO_STATE, actor);
    expect(snapshot.branch.name).toBe('Recreo La Laguna');
    expect(snapshot.products).toHaveLength(28);
    expect(snapshot.tables).toHaveLength(40);
    expect(snapshot.user.username).toBe('carlos');
  });

  it('createInitialDemoState can generate isolated fresh copies', () => {
    const s1 = createInitialDemoState();
    const s2 = createInitialDemoState();
    expect(s1).not.toBe(s2);
    expect(s1.products).toEqual(s2.products);
  });
});
