import React from "react";
import type { GetServerSideProps } from "next";
import { UpdatePassword, ErrorBoundary } from "@tad/ui";
import { PORTAL_CONFIGS } from "@tad/services";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function AdminUpdatePassword() {
  return (
    <ErrorBoundary>
      <UpdatePassword config={PORTAL_CONFIGS.ADMIN} />
    </ErrorBoundary>
  );
}
