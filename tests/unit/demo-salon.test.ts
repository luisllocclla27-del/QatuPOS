import { describe, expect, it } from 'vitest';
import { generateDemoPin } from '../../apps/demo/src/lib/demo-constants';
import { DEMO_TABLES, STATUS_COLORS } from '../../apps/demo/src/lib/demo-constants';
import { INITIAL_DEMO_STATE } from '../../apps/demo/src/lib/demo-seed';

describe('Salon View & Mozo QR Flow (/salon)', () => {
  describe('generateDemoPin', () => {
    it('generates a PIN with format XXXXX-XXXXX', () => {
      const pin = generateDemoPin();
      expect(pin).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
      expect(pin).toHaveLength(11);
    });

    it('generates unique PINs across multiple invocations', () => {
      const pins = new Set(Array.from({ length: 50 }, () => generateDemoPin()));
      expect(pins.size).toBe(50);
    });

    it('excludes ambiguous characters (0, O, 1, I)', () => {
      for (let i = 0; i < 50; i++) {
        const pin = generateDemoPin();
        expect(pin).not.toMatch(/[0O1I]/);
      }
    });
  });

  describe('Salon Tables & Statuses', () => {
    it('has 40 total tables categorized into 4 zones', () => {
      expect(DEMO_TABLES).toHaveLength(40);
      const zones = ['Zona Laguna', 'Zona Jardín', 'Zona Techada', 'Zona VIP'];
      zones.forEach(zone => {
        const tablesInZone = DEMO_TABLES.filter(t => t.zone === zone);
        expect(tablesInZone.length).toBeGreaterThan(0);
      });
    });

    it('has valid status colors defined for all table statuses', () => {
      expect(STATUS_COLORS.free).toBe('#22c55e');
      expect(STATUS_COLORS.active).toBe('#3b82f6');
      expect(STATUS_COLORS.paying).toBe('#f59e0b');
      expect(STATUS_COLORS.alert).toBe('#ef4444');
    });

    it('contains initial orders for sample tables in demo seed', () => {
      // Table 1 check
      const t1Orders = INITIAL_DEMO_STATE.orders.filter(o =>
        o.visit_id.endsWith(String(1).padStart(12, '0'))
      );
      expect(t1Orders.length).toBeGreaterThan(0);
      expect(t1Orders[0].lines.length).toBeGreaterThan(0);

      // Table 2 check
      const t2Orders = INITIAL_DEMO_STATE.orders.filter(o =>
        o.visit_id.endsWith(String(2).padStart(12, '0'))
      );
      expect(t2Orders.length).toBeGreaterThan(0);

      // Table 13 check
      const t13Orders = INITIAL_DEMO_STATE.orders.filter(o =>
        o.visit_id.endsWith(String(13).padStart(12, '0'))
      );
      expect(t13Orders.length).toBeGreaterThan(0);
    });
  });
});
