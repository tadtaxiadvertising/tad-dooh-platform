import Head from "next/head";
import Link from "next/link";

/**
 * Minimal account-status route for signed-in advertisers awaiting approval.
 *
 * Do not read a status from URL parameters, localStorage, or an unverified JWT.
 * The Next middleware checks the issuer + current status before serving this
 * route; anonymous users are redirected to advertiser login.
 *
 * This screen performs no writes, registration, billing or account mutation.
 */
export default function AdvertiserPendingReview() {
  return (
    <>
      <Head>
        <title>Cuenta en revisión | TAD Ad</title>
        <meta
          name="description"
          content="Tu cuenta de anunciante TAD está pendiente de revisión."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="min-h-screen bg-[#090909] text-white flex items-center justify-center px-5 py-12">
        <section
          aria-labelledby="pending-title"
          className="w-full max-w-xl rounded-3xl border border-white/15 bg-white/[0.035] p-7 sm:p-10 shadow-2xl"
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FDCB01] mb-5">
            TAD · Plataforma de anunciantes
          </p>
          <div className="inline-flex items-center gap-3 rounded-full border border-[#FDCB01]/35 bg-[#FDCB01]/10 px-4 py-2 mb-6">
            <span
              className="h-2 w-2 rounded-full bg-[#FDCB01]"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-[#FDCB01]">
              Solicitud en revisión
            </span>
          </div>
          <h1
            id="pending-title"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4"
          >
            Tu cuenta está en revisión.
          </h1>
          <p className="text-base leading-relaxed text-neutral-300 mb-5">
            Ya recibimos tu registro como anunciante. No necesitas crear otra
            cuenta ni volver a enviar el formulario.
          </p>
          <p className="text-sm leading-relaxed text-neutral-400 mb-8">
            El acceso al panel de campañas se habilitará cuando la cuenta haya
            sido aprobada. Vuelve a iniciar sesión más adelante para consultar
            el estado actualizado.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FDCB01] px-6 py-3 font-bold text-black transition-colors hover:bg-[#ffe15b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDCB01]"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    </>
  );
}
