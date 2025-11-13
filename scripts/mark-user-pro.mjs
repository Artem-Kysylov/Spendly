import { createClient } from '@supabase/supabase-js';

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const status = (process.argv[3] || 'pro').trim().toLowerCase(); // 'pro' | 'free'
  if (!email || !['pro', 'free'].includes(status)) {
    console.error('Usage: node scripts/mark-user-pro.mjs <email> <pro|free>');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Находим пользователя по email через админ-доступ
  const { data: users, error: findErr } = await supabase
    .from('auth.users')
    .select('id, email')
    .ilike('email', email)
    .limit(1);

  if (findErr || !users?.[0]?.id) {
    console.error('User not found:', findErr || 'No match');
    process.exit(1);
  }

  const userId = users[0].id;
  const update = {
    user_metadata: { subscription_status: status, isPro: status === 'pro' }
  };

  const { error: updErr } = await supabase.auth.admin.updateUserById(userId, update);
  if (updErr) {
    console.error('Failed to update user metadata:', updErr);
    process.exit(1);
  }

  console.log(`Updated ${email} -> subscription_status: ${status}, isPro: ${status === 'pro'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});