import { NextResponse } from 'next/server';
import { createDemoServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { order_id, status } = await req.json();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: true, offline: true });
    }

    const tenantId = process.env.DEMO_TENANT_ID || '00000000-0000-4000-8000-000000000001';
    const branchId = process.env.DEMO_BRANCH_ID || '00000000-0000-4000-8000-000000000002';

    const supabase = await createDemoServerClient();
    const { data, error } = await supabase
      .from('branch_state')
      .select('state')
      .eq('tenant_id', tenantId)
      .eq('branch_id', branchId)
      .maybeSingle();

    if (error || !data?.state) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const state = data.state as Record<string, any>;
    const orders = ((state.orders as any[]) || []).map((o: any) => {
      if (o.id === order_id) {
        return {
          ...o,
          lines: ((o.lines as any[]) || []).map((l: any) => ({
            ...l,
            prepared_quantity: status === 'ready' ? l.quantity : l.prepared_quantity,
          })),
        };
      }
      return o;
    });

    await supabase
      .from('branch_state')
      .update({ state: { ...state, orders }, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('branch_id', branchId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error in /api/demo/kds route:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
