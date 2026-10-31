import "../styles/globals.css";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import CookieBanner from "@tad/ui/components/CookieBanner";
import { ConsentAnalytics } from "@tad/ui/components/ConsentAnalytics";

// Public landing does not mount operational providers or their client subscriptions.
// Private routes retain SSR; Next may preload the private module on the server.
const PrivateDriverApp = dynamic<AppProps>(() => import("../components/app/PrivateDriverApp"));

export default function App(props: AppProps) {
  if (props.router.pathname === "/") {
    return <>
      <props.Component {...props.pageProps} />
      <CookieBanner />
      <ConsentAnalytics />
    </>;
  }
  return <PrivateDriverApp {...props} />;
}
