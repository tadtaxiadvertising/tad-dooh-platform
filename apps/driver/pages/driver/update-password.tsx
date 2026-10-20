import React from "react";
import { UpdatePassword, ErrorBoundary } from "@tad/ui";
import { PORTAL_CONFIGS } from "@tad/services";
import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function DriverUpdatePassword() {
  return (
    <ErrorBoundary>
      <UpdatePassword config={PORTAL_CONFIGS.DRIVER} />
    </ErrorBoundary>
  );
}
