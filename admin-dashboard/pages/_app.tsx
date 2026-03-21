import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../components/AuthProvider';
import Layout from '../components/Layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAntigravity } from '@/hooks/useAntigravity';
import { useState } from 'react';

const PUBLIC_PAGES = ['/login', '/check-in'];

function AppWrapper({ Component, pageProps, router }: AppProps & { queryClient: QueryClient }) {
  const isPublic = PUBLIC_PAGES.includes(router.pathname);
  
  // Initialize Realtime Sync Hook
  useAntigravity();

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

  return (
    <QueryClientProvider client={queryClient}>
      <AppWrapper {...props} queryClient={queryClient} />
      <Toaster richColors position="top-right" theme="dark" />
    </QueryClientProvider>
  );
}
