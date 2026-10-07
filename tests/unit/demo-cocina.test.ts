import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type KdsOrder,
  type KdsUrgency,
  getUrgencyStatus,
  elapsedMinutes,
  isOrderCompleted,
  isOrderActive,
} from '../../apps/demo/src/components/kds-card';
import { INITIAL_DEMO_STATE } from '../../apps/demo/src/lib/demo-seed';
import { DEMO_TABLES } from '../../apps/demo/src/lib/demo-constants';

describe('KDS Cocina en Tiempo Real (/cocina)', () => {
  describe('KdsOrder Interface and Urgency Calculation Logic', () => {
    it('calculates elapsed minutes accurately with elapsedMinutes', () => {
      const pastTime = new Date(Date.now() - 7 * 60000).toISOString();
      expect(elapsedMinutes(pastTime)).toBe(7);
    });

    it('identifies order urgency as green when elapsed time is under 10 minutes', () => {
      const recent = new Date(Date.now() - 5 * 60000).toISOString();
      const { elapsed, urgency } = getUrgencyStatus(recent);
      expect(elapsed).toBe(5);
      expect(urgency).toBe('green');
    });

    it('identifies order urgency as amber when elapsed time is between 10 and 14 minutes', () => {
      const amberOrder = new Date(Date.now() - 12 * 60000).toISOString();
      const { elapsed, urgency } = getUrgencyStatus(amberOrder);
      expect(elapsed).toBe(12);
      expect(urgency).toBe('amber');
    });

    it('identifies order urgency as red when elapsed time is 15 minutes or more', () => {
      const delayedOrder = new Date(Date.now() - 20 * 60000).toISOString();
      const { elapsed, urgency } = getUrgencyStatus(delayedOrder);
      expect(elapsed).toBe(20);
      expect(urgency).toBe('red');
    });

    it('safely handles future or identical timestamps without negative minutes', () => {
      const futureOrder = new Date(Date.now() + 10000).toISOString();
      const { elapsed, urgency } = getUrgencyStatus(futureOrder);
      expect(elapsed).toBe(0);
      expect(urgency).toBe('green');
    });

    it('validates structure of a valid KdsOrder object', () => {
      const sampleOrder: KdsOrder = {
        id: 'ord-test-1',
        table_number: 12,
        zone: 'Zona Laguna',
        created_at: new Date().toISOString(),
        source: 'guest',
        items: [
          { name: 'Ceviche Clásico', quantity: 2, status: 'pending', emoji: '🐟' },
          { name: 'Chicha Morada 1L', quantity: 1, status: 'preparing', emoji: '🥤' },
          { name: 'Picarones x6', quantity: 1, status: 'ready', emoji: '🍩' },
        ],
      };

      expect(sampleOrder.table_number).toBe(12);
      expect(sampleOrder.source).toBe('guest');
      expect(sampleOrder.items).toHaveLength(3);
      expect(sampleOrder.items[0].status).toBe('pending');
      expect(sampleOrder.items[1].status).toBe('preparing');
      expect(sampleOrder.items[2].status).toBe('ready');
    });
  });

  describe('Demo Seed and Kitchen Orders Mapping', () => {
    it('verifies demo seed has kitchen orders assigned to valid tables and zones', () => {
      expect(INITIAL_DEMO_STATE.orders.length).toBeGreaterThanOrEqual(3);

      for (const order of INITIAL_DEMO_STATE.orders) {
        expect(order.lines.length).toBeGreaterThan(0);
        // Each order has a visit_id ending in the 12-digit padded table number
        const match = order.visit_id.match(/\d+$/);
        expect(match).not.toBeNull();
        const tableNumber = parseInt(match![0], 10);
        const matchingTable = DEMO_TABLES.find(t => t.number === tableNumber);
        expect(matchingTable).toBeDefined();
        expect(matchingTable?.zone).toBeDefined();
      }
    });

    it('verifies that initial orders contain kitchen station items', () => {
      const kitchenLines = INITIAL_DEMO_STATE.orders.flatMap(o =>
        o.lines.filter(l => l.station === 'cocina')
      );
      expect(kitchenLines.length).toBeGreaterThan(0);
      const ceviche = kitchenLines.find(l => l.product_name === 'Ceviche Clásico');
      expect(ceviche).toBeDefined();
      expect(ceviche?.unit_price_minor).toBe(3800);
    });
  });

  describe('KdsCard Component Static Verification', () => {
    it('ensures kds-card.tsx is a client component and exports KdsCard and helpers', () => {
      const filePath = resolve(__dirname, '../../apps/demo/src/components/kds-card.tsx');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain("'use client'");
      expect(content).toContain('export function KdsCard');
      expect(content).toContain('export interface KdsOrder');
      expect(content).toContain('export function elapsedMinutes');
      expect(content).toContain('export function getUrgencyStatus');
      expect(content).toContain('export function isOrderCompleted');
      expect(content).toContain('export function isOrderActive');
      expect(content).toContain('📱 QR');
      expect(content).toContain('Preparando');
      expect(content).toContain('✓ Listo');
      expect(content).toContain('elapsedMinutes');
    });
  });

  describe('Cocina Page Static & Architecture Verification', () => {
    it('ensures /cocina/page.tsx is a client component and mounts necessary KDS features', () => {
      const filePath = resolve(__dirname, '../../apps/demo/src/app/cocina/page.tsx');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain("'use client'");
      expect(content).toContain('export default function CocinaPage');
      expect(content).toContain('<KdsCard');
      expect(content).toContain('<ResetBanner />');
      expect(content).toContain('demo-kds');
      expect(content).toContain('new-kds-order');
      expect(content).toContain('order-status-update');
      expect(content).toContain('TV Display');
      expect(content).toContain('[DEMO]');
      expect(content).toContain('+ Simular Pedido QR');
      expect(content).toContain('setCompletedOrders(finishedTickets.slice(0, 10))');
      expect(content).toContain('ordersRef.current.some');
      // Verify soundEnabledRef decouple so channel never tears down on audio toggle
      expect(content).toContain('soundEnabledRef.current');
      expect(content).toContain('handleIncomingOrderRef.current');
      // Verify pending dismissal tracking
      expect(content).toContain('pendingDismissalsRef.current');
      // Verify urgency status reuse in urgentCount
      expect(content).toContain("getUrgencyStatus(o.created_at).urgency === 'red'");
    });

    it('ensures /api/demo/kds/route.ts exists for background state persistence including preparing state', () => {
      const filePath = resolve(__dirname, '../../apps/demo/src/app/api/demo/kds/route.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('export async function POST');
      expect(content).toContain('branch_state');
      expect(content).toContain('prepared_quantity');
      expect(content).toContain("status === 'preparing'");
      expect(content).toContain("status === 'ready'");
    });

    it('correctly distinguishes fully completed orders from active tickets using production helpers', () => {
      expect(isOrderCompleted([
        { status: 'ready' },
        { status: 'ready' },
      ])).toBe(true);

      expect(isOrderCompleted([
        { status: 'ready' },
        { status: 'preparing' },
      ])).toBe(false);

      expect(isOrderCompleted([
        { status: 'pending' },
      ])).toBe(false);

      expect(isOrderCompleted([])).toBe(false);

      // Verify full ticket object partitioning
      const completedOrder: KdsOrder = {
        id: 'ord-comp',
        table_number: 1,
        zone: 'Laguna',
        created_at: new Date().toISOString(),
        source: 'staff',
        items: [
          { name: 'Ceviche', quantity: 1, status: 'ready', emoji: '🐟' },
          { name: 'Chicha', quantity: 1, status: 'ready', emoji: '🥤' },
        ],
      };
      expect(isOrderCompleted(completedOrder)).toBe(true);
      expect(isOrderActive(completedOrder)).toBe(false);

      const activeOrder: KdsOrder = {
        id: 'ord-act',
        table_number: 2,
        zone: 'Laguna',
        created_at: new Date().toISOString(),
        source: 'guest',
        items: [
          { name: 'Parrilla', quantity: 1, status: 'preparing', emoji: '🥩' },
        ],
      };
      expect(isOrderCompleted(activeOrder)).toBe(false);
      expect(isOrderActive(activeOrder)).toBe(true);
    });
  });
});
