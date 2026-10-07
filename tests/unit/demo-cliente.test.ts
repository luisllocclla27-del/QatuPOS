import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeTaxBreakdown,
  calculateCartTotal,
  calculateCartItemCount,
  type CartItem,
} from '../../apps/demo/src/lib/demo-cart';
import { DEMO_PRODUCTS } from '../../apps/demo/src/lib/demo-constants';

describe('App del Comensal QR (/cliente) - Cart Math & Tax Breakdown', () => {
  describe('computeTaxBreakdown (Peruvian IGV included)', () => {
    it('computes exact base taxable amount and included 18% IGV', () => {
      // S/ 38.00 = 3800 cents
      const ceviche = computeTaxBreakdown(3800);
      expect(ceviche.totalCents).toBe(3800);
      expect(ceviche.subtotalCents).toBe(Math.round(3800 / 1.18)); // 3220
      expect(ceviche.igvCents).toBe(3800 - 3220); // 580
      expect(ceviche.subtotalCents + ceviche.igvCents).toBe(ceviche.totalCents);
    });

    it('ensures Subtotal + IGV always equals Total to the cent across diverse price points', () => {
      const sampleTotals = [
        0, 1, 99, 100, 450, 1400, 2500, 3800, 4850, 7500, 12345, 99999,
      ];
      for (const total of sampleTotals) {
        const { subtotalCents, igvCents, totalCents } = computeTaxBreakdown(total);
        expect(totalCents).toBe(total);
        expect(subtotalCents + igvCents).toBe(total);
        expect(subtotalCents).toBe(Math.round(total / 1.18));
      }
    });

    it('handles zero or negative amounts gracefully', () => {
      expect(computeTaxBreakdown(0)).toEqual({
        subtotalCents: 0,
        igvCents: 0,
        totalCents: 0,
      });
      expect(computeTaxBreakdown(-500)).toEqual({
        subtotalCents: 0,
        igvCents: 0,
        totalCents: 0,
      });
    });
  });

  describe('calculateCartTotal & calculateCartItemCount', () => {
    it('returns 0 for an empty cart', () => {
      expect(calculateCartTotal([], DEMO_PRODUCTS)).toBe(0);
      expect(calculateCartItemCount([])).toBe(0);
    });

    it('calculates totals accurately for multiple items and quantities', () => {
      const p1 = DEMO_PRODUCTS[0]; // e.g. Ceviche Clásico
      const p2 = DEMO_PRODUCTS[1]; // e.g. Ceviche Mixto

      const cart: CartItem[] = [
        { product_id: p1.id, quantity: 2 },
        { product_id: p2.id, quantity: 1 },
      ];

      const expectedTotal = p1.price_cents * 2 + p2.price_cents * 1;
      expect(calculateCartTotal(cart, DEMO_PRODUCTS)).toBe(expectedTotal);
      expect(calculateCartItemCount(cart)).toBe(3);
    });

    it('ignores unknown products in total without erroring', () => {
      const cart: CartItem[] = [
        { product_id: 'unknown-id', quantity: 5 },
      ];
      expect(calculateCartTotal(cart, DEMO_PRODUCTS)).toBe(0);
      expect(calculateCartItemCount(cart)).toBe(5);
    });
  });

  describe('Static & Spec Checks for /cliente', () => {
    it('verifies that GuestAppDemo mounts ResetBanner for countdown visibility', () => {
      const componentPath = resolve(__dirname, '../../apps/demo/src/components/guest-app-demo.tsx');
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain("import { ResetBanner } from '@/components/reset-banner'");
      expect(content).toContain('<ResetBanner />');
    });

    it('verifies that /cliente page wraps GuestAppDemo in Suspense', () => {
      const pagePath = resolve(__dirname, '../../apps/demo/src/app/cliente/page.tsx');
      const content = readFileSync(pagePath, 'utf-8');
      expect(content).toContain('Suspense');
      expect(content).toContain('<GuestAppDemo />');
    });
  });
});
