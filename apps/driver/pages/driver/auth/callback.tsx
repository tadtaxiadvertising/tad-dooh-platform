import React from "react";
import { AuthCallback, ErrorBoundary } from "@tad/ui";
import { PORTAL_CONFIGS } from "@tad/services";
import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function DriverAuthCallback() {
  return (
    <ErrorBoundary>
      <AuthCallback config={PORTAL_CONFIGS.DRIVER} />
    </ErrorBoundary>
  );
}
