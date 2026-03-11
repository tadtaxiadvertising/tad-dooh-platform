import { createClient } from '@supabase/supabase-js';

// Usar fallbacks directos para asegurar que la app no crashee si Vercel pierde el caché de variables
// Nota: Estas llaves son públicas por diseño (Anon Key/Url), por lo que es seguro incrustarlas en el Frontend PWA.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ltdcdhqixvbpdcitthqf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0ZGNkaHFpeHZiZGNpdHRocWYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0MTI2MTkxNSwiZXhwIjoyMDU2ODM3OTE1fQ.NlsjS5w0e1U2Qp9WJq_6Kk4B7oFk_5GZ-_Qk0_wQvO8';

/**
 * Cliente Supabase para el Admin Dashboard.
 *
 * - persistSession: true → el token se guarda en localStorage automáticamente.
 * - autoRefreshToken: true → renueva el JWT antes de que expire (cada ~50 min).
 * - storageKey: clave única para evitar colisiones con otras apps en el mismo dominio.
 */
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'tad-auth-token',
      },
    })
  : (null as any); // Previene ejecución si falta la config en build time
