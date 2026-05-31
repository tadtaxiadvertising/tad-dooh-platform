import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Toaster } from 'sonner';
import { AuthProvider, useAntigravity } from '@tad/ui';
import { logger } from '@tad/logging';

const PUBLIC_PAGES = [
  '/login',
  '/admin/login',
  '/advertiser/login',
  '/driver/login',
  '/driver/auth/callback',
  '/driver/onboarding',
  '/advertiser/onboarding',
  '/check-in',
];

function AppWrapper({ Component, pageProps, router }: AppProps) {
  const isPublic = PUBLIC_PAGES.includes(router.pathname) || router.pathname.startsWith('/p');

  useEffect(() => {
    logger?.info('App', `Navigated to ${router.pathname}`);
  }, [router.pathname]);

  useAntigravity(!isPublic);

  return (
    <AuthProvider>
      <div className="font-sans antialiased">
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}

export default function App(props: AppProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24,
            staleTime: 1000 * 60 * 5,
            retry: 3,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  const persister =
    typeof window !== 'undefined'
      ? createSyncStoragePersister({
          storage: window.localStorage,
        })
      : undefined;

  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <AppWrapper {...props} />
        <Toaster richColors position="top-right" theme="dark" />
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <AppWrapper {...props} />
      <Toaster richColors position="top-right" theme="dark" />
    </PersistQueryClientProvider>
  );
}
