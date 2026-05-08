import React from 'react';
import { PortalAuth, ErrorBoundary } from '@tad/ui';
import { PORTAL_CONFIGS } from '@tad/services';

export default function AdvertiserLoginPage() {
  return (
    <ErrorBoundary>
      <PortalAuth config={PORTAL_CONFIGS.ADVERTISER} />
    </ErrorBoundary>
  );
}
