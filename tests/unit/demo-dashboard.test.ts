import { describe, expect, it } from 'vitest';
import { formatMoney, DEMO_TABLES, STATUS_COLORS } from '../../apps/demo/src/lib/demo-constants';
import { DEMO_SALES_DATA } from '../../apps/demo/src/components/sales-chart';

describe('Demo Dashboard Unit Tests', () => {
  it('formats monetary values consistently with 2 decimal places and S/ prefix', () => {
    expect(formatMoney(760000)).toBe('S/ 7600.00');
    expect(formatMoney(312000)).toBe('S/ 3120.00');
    expect(formatMoney(285000)).toBe('S/ 2850.00');
    expect(formatMoney(163000)).toBe('S/ 1630.00');
    expect(formatMoney(312000 + 285000 + 163000)).toBe('S/ 7600.00');
    expect(formatMoney(48500)).toBe('S/ 485.00');
    expect(formatMoney(0)).toBe('S/ 0.00');
  });

  it('calculates average ticket accurately in cents and formats with formatMoney', () => {
    const todaySalesCents = 760000;
    const totalOrdersCount = 142;
    const avgTicketCents = Math.round(todaySalesCents / totalOrdersCount);
    expect(avgTicketCents).toBe(5352); // S/ 53.52
    expect(formatMoney(avgTicketCents)).toBe('S/ 53.52');
  });

  it('guarantees DEMO_SALES_DATA hourly distribution matches total sales S/ 7600.00', () => {
    expect(DEMO_SALES_DATA).toHaveLength(10);
    const totalSalesSoles = DEMO_SALES_DATA.reduce((acc, curr) => acc + curr.sales, 0);
    expect(totalSalesSoles).toBe(7600);
    expect(formatMoney(totalSalesSoles * 100)).toBe('S/ 7600.00');

    const maxSale = Math.max(...DEMO_SALES_DATA.map(d => d.sales));
    expect(maxSale).toBe(1450);
    expect(formatMoney(maxSale * 100)).toBe('S/ 1450.00');
  });

  it('verifies mini table map statuses are mapped to valid colors', () => {
    for (const table of DEMO_TABLES) {
      expect(STATUS_COLORS[table.initial_status]).toBeDefined();
      expect(STATUS_COLORS[table.initial_status]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
