import { NextResponse } from 'next/server';
import { resetDemoState } from '@/lib/demo-db';
import { INITIAL_DEMO_STATE } from '@/lib/demo-seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Vercel Cron envía Authorization header con CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    await resetDemoState(INITIAL_DEMO_STATE);
    return NextResponse.json({ ok: true, reset_at: new Date().toISOString() });
  } catch (err) {
    console.error('Error en reset de demo:', err);
    return NextResponse.json({ error: 'Reset fallido' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
