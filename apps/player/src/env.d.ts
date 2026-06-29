/// <reference types="vite/client" />

interface Window {
  tadKillSwitchActive: boolean;
}

declare module '@supabase/supabase-js' {
  export function createClient(url: string, key: string): any;
}
