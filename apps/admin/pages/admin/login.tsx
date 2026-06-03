import React from 'react';
import type { GetServerSideProps } from 'next';
import { PortalAuth, ErrorBoundary } from '@tad/ui';
import { PORTAL_CONFIGS } from '@tad/services';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function AdminLoginPage() {
  return (
    <ErrorBoundary>
      <PortalAuth config={PORTAL_CONFIGS.ADMIN} />
    </ErrorBoundary>
  );
}
