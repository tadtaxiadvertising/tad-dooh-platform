import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@tad/ui';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAntigravity } from '@tad/ui';
import { useState, useEffect } from 'react';
import { logger } from '@tad/logging';


const PUBLIC_PAGES = ['/login', '/check-in'];

function AppWrapper({ Component, pageProps, router }: AppProps & { queryClient: QueryClient }) {
  const isPublic = [
    '/login', 
    '/admin/login', 
    '/advertiser/login', 
    '/driver/login', 
    '/driver/onboarding',
    '/advertiser/onboarding',
    '/check-in'
  ].includes(router.pathname) || router.pathname.startsWith('/p');
  
  // Initialize Logger
  useEffect(() => {
    if (logger) {
      logger.info('App', `Navigated to ${router.pathname}`);
    }
  }, [router.pathname]);
  
  // Initialize Realtime Sync Hook
  useAntigravity(!isPublic);

  const content = (
    <div className="font-sans antialiased">
      <Component {...pageProps} />
    </div>
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
      {content}
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

  return (
    <QueryClientProvider client={queryClient}>
      <AppWrapper {...props} queryClient={queryClient} />
      <Toaster richColors position="top-right" theme="dark" />
    </QueryClientProvider>
  );
}








