import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@tad/services';

function safeDriverDestination(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return '/driver/dashboard';
  if (next.startsWith('//')) return '/driver/dashboard';
  return next;
}

export default function DriverAuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState('Validando sesión del conductor…');

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function finishAuth() {
      const destination = safeDriverDestination(router.query.next);
      const code = typeof router.query.code === 'string' ? router.query.code : null;

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          await supabase.auth.getSession();
        }

        if (!cancelled) {
          setMessage('Sesión confirmada. Abriendo portal…');
          router.replace(destination);
        }
      } catch (error) {
        console.error('Driver auth callback failed:', error);
        if (!cancelled) {
          setMessage('No pudimos confirmar la sesión. Volviendo al login…');
          router.replace('/driver/login');
        }
      }
    }

    finishAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
      <Head>
        <title>TAD Driver | Autenticando</title>
      </Head>
      <section className="max-w-sm text-center space-y-4">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
        <p className="text-xs uppercase tracking-[0.4em] text-yellow-400 font-bold">TAD Driver</p>
        <h1 className="text-2xl font-black">Procesando acceso seguro</h1>
        <p className="text-sm text-zinc-400">{message}</p>
      </section>
    </main>
  );
}
