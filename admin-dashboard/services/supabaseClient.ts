import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente Supabase para el Admin Dashboard.
 *
 * - persistSession: true → el token se guarda en localStorage automáticamente.
 * - autoRefreshToken: true → renueva el JWT antes de que expire (cada ~50 min).
 * - storageKey: clave única para evitar colisiones con otras apps en el mismo dominio.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tad-auth-token',
  },
});
