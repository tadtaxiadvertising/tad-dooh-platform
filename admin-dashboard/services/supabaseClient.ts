import { createClient } from '@supabase/supabase-js';

// Fijamos las llaves verificadas directamente para evitar que errores en el panel de control de EasyPanel
// bloqueen el acceso de los usuarios por DNS no resuelto (.com en vez de .co).
const supabaseUrl = 'https://ltdcdhqixvbpdcitthqf.supabase.co';
const supabaseAnonKey = 'sb_publishable_sa_TwjDpFtkNn93Ynrw5PA_pv3BhfSi';

/**
 * Cliente Supabase para el Admin Dashboard.
 *
 * - persistSession: true → el token se guarda en localStorage automáticamente.
 * - autoRefreshToken: true → renueva el JWT antes de que expire (cada ~50 min).
 * - storageKey: clave única para evitar colisiones con otras apps en el mismo dominio.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tad-auth-token',
  },
});
