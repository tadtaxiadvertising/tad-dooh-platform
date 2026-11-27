import React from "react";
import type { GetServerSideProps } from "next";
import { PortalAuth } from "@tad/ui";
import { PORTAL_CONFIGS } from "@tad/services";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function AdminForgotPassword() {
  return <PortalAuth config={PORTAL_CONFIGS.ADMIN} initialView="forgot" />;
}
