import '../styles/globals.css';
import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { AuthProvider } from '@tad/ui';
import { Layout } from '@tad/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { logger } from '@tad/logging';
import { PaymentLockOverlay } from '@tad/ui';
import { CookieBanner } from '@tad/ui';

// Client-only: avoids useQueryClient() during SSR prerendering
const AntigravitySync = dynamic(() => import('../components/AntigravitySync'), { ssr: false });

// Client-only: Toaster requires React hooks which aren't available during SSR
const ToasterClient = dynamic(() => import('sonner').then(m => m.Toaster), { ssr: false });


const PUBLIC_PAGES = ['/login', '/check-in'];

function AppWrapper({ Component, pageProps, router }: AppProps & { queryClient: QueryClient }) {
  const isPublic = [
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
  ].includes(router.pathname)
    || router.pathname.startsWith('/p');

  // Initialize Logger
  useEffect(() => {
    if (logger) {
      logger.info('App', `Navigated to ${router.pathname}`);
    }
  }, [router.pathname]);

  const content = (
    <Component {...pageProps} />
  );

  if (isPublic) {
    return (
      <AuthProvider>
        {content}
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <Layout>
        {content}
      </Layout>
    </AuthProvider>
  );
}

export default function App(props: AppProps) {
  // Ensure QueryClient is only created once on the client
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 3,
        refetchOnWindowFocus: true,
      },
    },
  }));

  // Check for cookie preferences on client mount
  const [hasShownCookieBanner, setHasShownCookieBanner] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('tad_cookie_preferences');
      setHasShownCookieBanner(!!stored);
    }
  }, []);

  return (
      <QueryClientProvider client={queryClient}>
        <AntigravitySync />
        <AppWrapper {...props} queryClient={queryClient} />
        <ToasterClient richColors position="top-right" theme="dark" />
        <PaymentLockOverlay />
        {typeof window !== 'undefined' && !hasShownCookieBanner && (
          <CookieBanner
            basePath="/advertiser"
            onAccept={() => setHasShownCookieBanner(true)}
            onReject={() => setHasShownCookieBanner(true)}
          />
        )}
      </QueryClientProvider>
    );
  }








