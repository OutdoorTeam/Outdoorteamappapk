import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  console.log('1) Fetching subscription_plans...');
  const plans = await supabase.from('subscription_plans').select('id, name, price').limit(3);
  if (plans.error) {
    throw plans.error;
  }
  console.log('Fetched plans count:', plans.data.length);
  console.dir(plans.data, { depth: null });

  console.log('2) Upserting logros.diagnostico_tmp...');
  const upsertPayload = {
    code: 'diagnostico_tmp',
    title: 'Diagnóstico temporal',
    points: 0,
    active: true,
  };
  const upsert = await supabase.from('logros').upsert(upsertPayload, { onConflict: 'code' }).select();
  if (upsert.error) {
    throw upsert.error;
  }
  console.log('Upsert result:');
  console.dir(upsert.data, { depth: null });

  console.log('3) Cleaning up diagnostico_tmp logro...');
  const removal = await supabase.from('logros').delete().eq('code', 'diagnostico_tmp').select();
  if (removal.error) {
    throw removal.error;
  }
  console.log('Cleanup result count:', removal.data?.length ?? 0);
}

main()
  .then(() => {
    console.log('Supabase ping completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Supabase ping failed:', error);
    process.exit(1);
  });
