import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatCountdown,
  getNextReset,
} from '../../apps/demo/src/components/reset-banner';

// Mock demo-db and demo-seed to isolate route testing
vi.mock('@/lib/demo-db', () => ({
  resetDemoState: vi.fn(),
}));
vi.mock('@/lib/demo-seed', () => ({
  INITIAL_DEMO_STATE: { branch_id: 'test-branch', version: 1 },
}));

import { GET, POST } from '../../apps/demo/src/app/api/demo/reset/route';
import { resetDemoState } from '@/lib/demo-db';
import { INITIAL_DEMO_STATE } from '@/lib/demo-seed';

describe('Demo Reset & Countdown', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Countdown formatting and reset calculations', () => {
    it('formats milliseconds to mm:ss correctly', () => {
      expect(formatCountdown(0)).toBe('00:00');
      expect(formatCountdown(-5000)).toBe('00:00');
      expect(formatCountdown(999)).toBe('00:00');
      expect(formatCountdown(1000)).toBe('00:01');
      expect(formatCountdown(59_000)).toBe('00:59');
      expect(formatCountdown(60_000)).toBe('01:00');
      expect(formatCountdown(65_000)).toBe('01:05');
      expect(formatCountdown((29 * 60 + 59) * 1000)).toBe('29:59');
      expect(formatCountdown(30 * 60 * 1000)).toBe('30:00');
    });

    it('calculates next 30-minute reset interval boundary correctly', () => {
      const thirtyMinutesMs = 30 * 60 * 1000;
      // Fixed time: 10:14:20.000 UTC
      const fixedTime = new Date('2026-10-06T10:14:20.000Z').getTime();
      const nextReset = getNextReset(fixedTime);

      // Expected: 10:30:00.000 UTC
      expect(nextReset.toISOString()).toBe('2026-10-06T10:30:00.000Z');
      expect(nextReset.getTime() - fixedTime).toBeLessThanOrEqual(thirtyMinutesMs);
      expect(nextReset.getTime() - fixedTime).toBeGreaterThan(0);

      // Boundary condition: exactly 10:30:00.000 UTC -> should advance to 11:00:00.000 UTC
      const boundaryTime = new Date('2026-10-06T10:30:00.000Z').getTime();
      const afterBoundaryReset = getNextReset(boundaryTime);
      expect(afterBoundaryReset.toISOString()).toBe('2026-10-06T11:00:00.000Z');
    });
  });

  describe('API Route /api/demo/reset', () => {
    it('rejects request with 401 when CRON_SECRET is set and Authorization header is missing or invalid', async () => {
      process.env.CRON_SECRET = 'super-secret-token';

      // Missing header
      const reqMissing = new Request('http://localhost:3001/api/demo/reset', { method: 'POST' });
      const resMissing = await POST(reqMissing);
      expect(resMissing.status).toBe(401);
      const dataMissing = await resMissing.json();
      expect(dataMissing).toEqual({ error: 'No autorizado' });

      // Invalid header
      const reqInvalid = new Request('http://localhost:3001/api/demo/reset', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-token' },
      });
      const resInvalid = await POST(reqInvalid);
      expect(resInvalid.status).toBe(401);
      expect(resetDemoState).not.toHaveBeenCalled();
    });

    it('authorizes request and resets demo state when CRON_SECRET matches', async () => {
      process.env.CRON_SECRET = 'super-secret-token';
      vi.mocked(resetDemoState).mockResolvedValueOnce(undefined);

      const req = new Request('http://localhost:3001/api/demo/reset', {
        method: 'POST',
        headers: { authorization: 'Bearer super-secret-token' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(typeof data.reset_at).toBe('string');
      expect(resetDemoState).toHaveBeenCalledWith(INITIAL_DEMO_STATE);
    });

    it('allows request when CRON_SECRET is not configured (local development)', async () => {
      delete process.env.CRON_SECRET;
      vi.mocked(resetDemoState).mockResolvedValueOnce(undefined);

      const req = new Request('http://localhost:3001/api/demo/reset', { method: 'POST' });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(resetDemoState).toHaveBeenCalledWith(INITIAL_DEMO_STATE);
    });

    it('supports GET requests via alias for Vercel Cron compatibility', async () => {
      delete process.env.CRON_SECRET;
      vi.mocked(resetDemoState).mockResolvedValueOnce(undefined);

      const req = new Request('http://localhost:3001/api/demo/reset', { method: 'GET' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(resetDemoState).toHaveBeenCalledWith(INITIAL_DEMO_STATE);
    });

    it('returns 500 when resetDemoState throws an error', async () => {
      delete process.env.CRON_SECRET;
      vi.mocked(resetDemoState).mockRejectedValueOnce(new Error('Database connection failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const req = new Request('http://localhost:3001/api/demo/reset', { method: 'POST' });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Reset fallido' });

      consoleSpy.mockRestore();
    });
  });
});
