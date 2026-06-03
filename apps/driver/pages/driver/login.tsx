import React from 'react';
import { PortalAuth, ErrorBoundary } from '@tad/ui';
import { PORTAL_CONFIGS } from '@tad/services';
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function DriverLoginPage() {
  return (
    <ErrorBoundary>
      <PortalAuth config={PORTAL_CONFIGS.DRIVER} />
    </ErrorBoundary>
  );
}
