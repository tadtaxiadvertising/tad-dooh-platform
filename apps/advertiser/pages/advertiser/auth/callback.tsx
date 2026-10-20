import React from "react";
import { AuthCallback, ErrorBoundary } from "@tad/ui";
import { PORTAL_CONFIGS } from "@tad/services";
import type { GetServerSideProps } from "next";
// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function AdvertiserAuthCallback() {
  return (
    <ErrorBoundary>
      <AuthCallback config={PORTAL_CONFIGS.ADVERTISER} />
    </ErrorBoundary>
  );
}
