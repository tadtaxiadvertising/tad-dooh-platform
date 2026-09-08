import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@tad/ui';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Toaster } from 'sonner';
import { useAntigravity } from '@tad/ui';
import { useState, useEffect } from 'react';
import { logger } from '@tad/logging';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationToast } from '@/components/Notifications/NotificationToast';
import { NotificationCenter } from '@/components/Notifications/NotificationCenter';
import { CookieBanner } from '@tad/ui';

const PUBLIC_PAGES = [
  '/login',
  '/admin/login',
  '/advertiser/login',
  '/driver/login',
  '/driver/onboarding',
  '/advertiser/onboarding',
  '/check-in',
  '/politica-de-privacidad',
  '/terminos-de-servicio',
  '/politica-de-cookies',
  '/aviso-legal',
];

function AppWrapper({ Component, pageProps, router }: AppProps) {
  const isPublic =
    PUBLIC_PAGES.includes(router.pathname) || router.pathname.startsWith('/p');

  // Initialize Logger
  useEffect(() => {
    if (logger) {
      logger.info('App', `Navigated to ${router.pathname}`);
    }
  }, [router.pathname]);

  // Initialize Realtime Sync Hook
  useAntigravity(!isPublic);

  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="font-sans antialiased">
          <Component {...pageProps} />
        </div>
        <NotificationToast />
        <NotificationCenter />
      </NotificationProvider>
    </AuthProvider>
  );
}

function RootProviders({ queryClient, children }: { queryClient: QueryClient; children: React.ReactNode }) {
  const persister = typeof window !== 'undefined'
    ? createSyncStoragePersister({ storage: window.localStorage })
    : undefined;

  if (persister) {
    return (
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        {children}
      </PersistQueryClientProvider>
    );
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default function App(props: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 3,
        refetchOnWindowFocus: true,
      },
    },
  }));

  const [hasShownCookieBanner, setHasShownCookieBanner] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('tad_cookie_preferences');
      setHasShownCookieBanner(!!stored);
    }
  }, []);

  return (
    <RootProviders queryClient={queryClient}>
      <AppWrapper {...props} />
      <Toaster richColors position="top-right" theme="dark" />
      {typeof window !== 'undefined' && !hasShownCookieBanner && (
        <CookieBanner
          basePath="/driver"
          onAccept={() => setHasShownCookieBanner(true)}
          onReject={() => setHasShownCookieBanner(true)}
        />
      )}
    </RootProviders>
  );
}