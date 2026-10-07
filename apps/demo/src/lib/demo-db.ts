import { createDemoServerClient } from './supabase-server';

const DEMO_BRANCH_ID = process.env.DEMO_BRANCH_ID!;
const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID!;

export async function getDemoState() {
  const supabase = await createDemoServerClient();
  const { data, error } = await supabase
    .from('branch_state')
    .select('state, version')
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('branch_id', DEMO_BRANCH_ID)
    .single();

  if (error) throw new Error(`Error leyendo estado demo: ${error.message}`);
  return { state: data.state, version: data.version as number };
}

export async function resetDemoState(initialState: object): Promise<void> {
  const supabase = await createDemoServerClient();
  const { error } = await supabase
    .from('branch_state')
    .update({ state: initialState, version: 1, updated_at: new Date().toISOString() })
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('branch_id', DEMO_BRANCH_ID);

  if (error) throw new Error(`Error reseteando demo: ${error.message}`);
}
