import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { seedViaSupabaseRest, main, DEMO_TENANT_ID, DEMO_BRANCH_ID } from '../../scripts/demo/seed';
import { INITIAL_DEMO_STATE } from '../../apps/demo/src/lib/demo-seed';

describe('scripts/demo/seed.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('seedViaSupabaseRest', () => {
    it('executes sequential upserts for tenants, branches, and branch_state with merge-duplicates', async () => {
      const calls: Array<{ url: string; method?: string; headers?: Record<string, string>; body?: string }> = [];

      const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({
          url: String(input),
          method: init?.method,
          headers: init?.headers as Record<string, string>,
          body: init?.body as string,
        });

        return {
          ok: true,
          status: 201,
          text: async () => 'OK',
        } as Response;
      });

      await seedViaSupabaseRest(
        'https://example-project.supabase.co',
        'service-role-secret-token',
        mockFetch as unknown as typeof fetch
      );

      expect(calls).toHaveLength(3);

      // 1. Tenants upsert
      expect(calls[0].url).toBe('https://example-project.supabase.co/rest/v1/tenants');
      expect(calls[0].method).toBe('POST');
      expect(calls[0].headers?.Prefer).toBe('resolution=merge-duplicates');
      expect(calls[0].headers?.apikey).toBe('service-role-secret-token');
      expect(calls[0].headers?.Authorization).toBe('Bearer service-role-secret-token');
      const tenantBody = JSON.parse(calls[0].body || '{}');
      expect(tenantBody.id).toBe(DEMO_TENANT_ID);
      expect(tenantBody.name).toBe('Recreo Campestre La Laguna');

      // 2. Branches upsert
      expect(calls[1].url).toBe('https://example-project.supabase.co/rest/v1/branches');
      expect(calls[1].method).toBe('POST');
      expect(calls[1].headers?.Prefer).toBe('resolution=merge-duplicates');
      const branchBody = JSON.parse(calls[1].body || '{}');
      expect(branchBody.id).toBe(DEMO_BRANCH_ID);
      expect(branchBody.tenant_id).toBe(DEMO_TENANT_ID);
      expect(branchBody.name).toBe('La Laguna - Huamanga');

      // 3. Branch State upsert
      expect(calls[2].url).toBe('https://example-project.supabase.co/rest/v1/branch_state');
      expect(calls[2].method).toBe('POST');
      expect(calls[2].headers?.Prefer).toBe('resolution=merge-duplicates');
      const stateBody = JSON.parse(calls[2].body || '{}');
      expect(stateBody.tenant_id).toBe(DEMO_TENANT_ID);
      expect(stateBody.branch_id).toBe(DEMO_BRANCH_ID);
      expect(stateBody.version).toBe(1);
      expect(stateBody.state.branch.name).toBe(INITIAL_DEMO_STATE.branch.name);
      expect(stateBody.state.tables).toHaveLength(40);
    });

    it('throws descriptive error if tenant creation fails', async () => {
      const mockFetch = vi.fn(async () => {
        return {
          ok: false,
          status: 403,
          text: async () => 'Permission denied on table tenants',
        } as Response;
      });

      await expect(
        seedViaSupabaseRest(
          'https://example.supabase.co',
          'anon-key',
          mockFetch as unknown as typeof fetch
        )
      ).rejects.toThrowError(/Error en Supabase REST API \/tenants \(403\)/);
    });

    it('throws descriptive error if branches creation fails', async () => {
      let callCount = 0;
      const mockFetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: true, status: 200, text: async () => 'OK' } as Response;
        }
        return {
          ok: false,
          status: 409,
          text: async () => 'Foreign key violation',
        } as Response;
      });

      await expect(
        seedViaSupabaseRest(
          'https://example.supabase.co',
          'token',
          mockFetch as unknown as typeof fetch
        )
      ).rejects.toThrowError(/Error en Supabase REST API \/branches \(409\)/);
    });

    it('throws descriptive error if branch_state upsert fails', async () => {
      let callCount = 0;
      const mockFetch = vi.fn(async () => {
        callCount++;
        if (callCount <= 2) {
          return { ok: true, status: 200, text: async () => 'OK' } as Response;
        }
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal DB error',
        } as Response;
      });

      await expect(
        seedViaSupabaseRest(
          'https://example.supabase.co',
          'token',
          mockFetch as unknown as typeof fetch
        )
      ).rejects.toThrowError(/Error en Supabase REST API \/branch_state \(500\)/);
    });
  });

  describe('main configuration and RLS warning', () => {
    it('warns when only NEXT_PUBLIC_SUPABASE_ANON_KEY is provided without service role key', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.QATU_MAINTENANCE_DATABASE_URL;
      delete process.env.SUPABASE_DB_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock global fetch to return ok
      const globalFetchMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => 'OK',
      }));
      vi.stubGlobal('fetch', globalFetchMock);

      await main();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY')
      );
    });
  });
});
