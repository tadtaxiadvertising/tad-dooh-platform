import React from 'react';
import { PortalAuth, ErrorBoundary } from '@tad/ui';
import { PORTAL_CONFIGS } from '@tad/services';

export default function AdminLoginPage() {
  return (
    <ErrorBoundary>
      <PortalAuth config={PORTAL_CONFIGS.ADMIN} />
    </ErrorBoundary>
  );
}
