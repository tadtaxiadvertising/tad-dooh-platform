import React from 'react';
import { AuthCallback, ErrorBoundary } from '@tad/ui';
import { PORTAL_CONFIGS } from '@tad/services';

export default function AdvertiserAuthCallback() {
  return (
    <ErrorBoundary>
      <AuthCallback config={PORTAL_CONFIGS.ADVERTISER} />
    </ErrorBoundary>
  );
}
