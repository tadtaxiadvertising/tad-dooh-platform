import Head from 'next/head';
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/driver/dashboard',
    permanent: false,
  },
});

export default function DriverIndexRedirect() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
      <Head>
        <title>TAD Driver | Redirigiendo</title>
      </Head>
      <section className="text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-yellow-400 font-bold">TAD Driver</p>
        <h1 className="text-2xl font-black">Abriendo portal del conductor…</h1>
        <p className="text-sm text-zinc-400">Si no eres redirigido automáticamente, abre el dashboard del conductor.</p>
      </section>
    </main>
  );
}
