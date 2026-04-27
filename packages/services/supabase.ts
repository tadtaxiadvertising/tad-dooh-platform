import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined
) {
  console.warn('⚠️ Supabase credentials missing in frontend environment variables. Running in offline mode.');
}

declare global {
  // eslint-disable-next-line no-var
  var __tadSupabaseClient: ReturnType<typeof createClient> | undefined;
}

const createSupabaseClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  });

const getSupabaseClient = () => {
  // En servidor, evitar estado global compartido entre requests
  if (typeof window === 'undefined') {
    return createSupabaseClient();
  }

  // Singleton client-side para evitar locks duplicados de Supabase Auth
  if (!globalThis.__tadSupabaseClient) {
    globalThis.__tadSupabaseClient = createSupabaseClient();
  }

  return globalThis.__tadSupabaseClient;
};

export const supabase = getSupabaseClient();
