import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined
) {
  console.warn('⚠️ Supabase credentials missing in frontend environment variables. Running in offline mode.');
}

type SupabaseClientInstance = SupabaseClient<any, 'public', any>;

const createSupabaseClient = (): SupabaseClientInstance =>
  createClient<any>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  });

const getSupabaseClient = (): SupabaseClientInstance => {
  // En servidor, evitar estado global compartido entre requests
  if (typeof window === 'undefined') {
    return createSupabaseClient();
  }

  // Singleton client-side para evitar locks duplicados de Supabase Auth
  const globalStore = globalThis as typeof globalThis & Record<string, SupabaseClientInstance | undefined>;
  const singletonKey = '__tadSupabaseClient';

  if (!globalStore[singletonKey]) {
    globalStore[singletonKey] = createSupabaseClient();
  }

  return globalStore[singletonKey] as SupabaseClientInstance;
};

export const supabase = getSupabaseClient();
