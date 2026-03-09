import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import '../styles/globals.css';

const PUBLIC_PAGES = ['/login'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_PAGES.includes(router.pathname);
    const token = localStorage.getItem('tad_admin_token');

    if (!isPublic && !token) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [router.pathname]);

  // Login page renders without the sidebar Layout
  if (PUBLIC_PAGES.includes(router.pathname)) {
    return <Component {...pageProps} />;
  }

  // Wait for auth check before rendering protected pages
  if (!checked) return null;

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

