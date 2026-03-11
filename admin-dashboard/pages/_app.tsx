import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../components/AuthProvider';
import Layout from '../components/Layout';

const PUBLIC_PAGES = ['/login'];

export default function App({ Component, pageProps, router }: AppProps) {
  const isPublic = PUBLIC_PAGES.includes(router.pathname);

  // Login page renders without the sidebar Layout
  if (isPublic) {
    return (
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    );
  }

  // Protected pages: AuthProvider handles session check + loading screen
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
