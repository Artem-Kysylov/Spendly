import { createClient, SupabaseClient } from "@supabase/supabase-js";

// IMPORTANT: static access so Next.js inlines values ​​into the client bundle
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing Supabase env var: NEXT_PUBLIC_SUPABASE_URL. Make sure it's set in .env.local",
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env var: NEXT_PUBLIC_SUPABASE_ANON_KEY. Make sure it's set in .env.local",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var supabase: SupabaseClient | undefined;
}

// Один инстанс клиента (кэш через globalThis, чтобы переживать HMR в dev)
export const supabase: SupabaseClient =
  globalThis.supabase ?? createClient(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== "production") {
  globalThis.supabase = supabase;
}
