import "../styles/globals.css";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { AuthProvider } from "@tad/ui";
import { Layout } from "@tad/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { logger } from "@tad/logging";
import { PaymentLockOverlay } from "@tad/ui";
import { CookieBanner, ConsentAnalytics } from "@tad/ui";

// Client-only: avoids useQueryClient() during SSR prerendering
const AntigravitySync = dynamic(() => import("../components/AntigravitySync"), {
  ssr: false,
});

// Client-only: Toaster requires React hooks which aren't available during SSR
const ToasterClient = dynamic(() => import("sonner").then((m) => m.Toaster), {
  ssr: false,
});

function AppWrapper({
  Component,
  pageProps,
  router,
}: AppProps & { queryClient: QueryClient }) {
  const isPublic =
    [
      "/login",
      "/admin/login",
      "/advertiser/login",
      "/driver/login",
      "/driver/onboarding",
      "/advertiser/onboarding",
      "/check-in",
      "/politica-de-privacidad",
      "/terminos-de-servicio",
      "/politica-de-cookies",
      "/aviso-legal",
    ].includes(router.pathname) || router.pathname.startsWith("/p");

  // Initialize Logger
  useEffect(() => {
    if (logger) {
      logger.info("App", `Navigated to ${router.pathname}`);
    }
  }, [router.pathname]);

  const content = <Component {...pageProps} />;
  // A minimal shell is not a public authorization bypass. Both status pages
  // are protected by Next middleware and verified against the current API DB
  // account state. Avoid dashboard Layout side-effects for incomplete users.
  const isProtectedStatusPage =
    router.pathname === "/advertiser/pending-review" ||
    router.pathname === "/advertiser/oauth/complete-profile";

  if (isPublic || isProtectedStatusPage) {
    return <AuthProvider>{content}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <Layout>{content}</Layout>
    </AuthProvider>
  );
}

export default function App(props: AppProps) {
  // Ensure QueryClient is only created once on the client
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes cache
            retry: 3,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AntigravitySync />
      <AppWrapper {...props} queryClient={queryClient} />
      <ToasterClient richColors position="top-right" theme="dark" />
      <PaymentLockOverlay />
      <CookieBanner />
      <ConsentAnalytics />
    </QueryClientProvider>
  );
}
