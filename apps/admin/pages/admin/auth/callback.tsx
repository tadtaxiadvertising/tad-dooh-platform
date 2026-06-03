import React from 'react';
import type { GetServerSideProps } from 'next';
import { AuthCallback, ErrorBoundary } from '@tad/ui';
import { PORTAL_CONFIGS } from '@tad/services';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function AdminAuthCallback() {
  return (
    <ErrorBoundary>
      <AuthCallback config={PORTAL_CONFIGS.ADMIN} />
    </ErrorBoundary>
  );
}
