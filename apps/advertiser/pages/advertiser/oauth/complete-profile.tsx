import Head from "next/head";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@tad/services";

/**
 * OAuth identity is already created and verified. This form only finishes
 * the EXISTING advertiser business profile; never requests a password,
 * creates a new Supabase user, makes a campaign or approves the account.
 */
export default function CompleteOAuthAdvertiserProfile() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      // getSession supplies the bearer token; it does NOT authorize the
      // operation. The API verifies signature, role, entity and DB status.
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) {
        throw new Error("Tu sesión ha expirado. Vuelve a iniciar sesión.");
      }
      const res = await fetch(
        "/api/proxy/onboarding/advertiser/oauth/profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            companyName: companyName.trim(),
            contactName: contactName.trim(),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
          }),
        },
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            "No se pudo validar tu sesión. Vuelve a iniciar sesión.",
          );
        }
        throw new Error("No pudimos guardar tu perfil. Intenta nuevamente.");
      }
      const result: { status?: string } = await res.json();
      if (result.status !== "PENDING_REVIEW") {
        throw new Error("La confirmación del registro no fue válida.");
      }
      await router.replace("/advertiser/pending-review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar tu perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>Completar perfil de anunciante | TAD</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="min-h-screen bg-[#090909] text-white px-4 py-12 flex items-center justify-center">
        <section
          className="w-full max-w-xl rounded-3xl border border-white/15 bg-white/[0.035] p-6 sm:p-10"
          aria-labelledby="oauth-profile-title"
        >
          <p className="mb-4 text-xs uppercase font-bold tracking-[0.2em] text-[#FDCB01]">
            TAD · Anunciantes
          </p>
          <h1
            id="oauth-profile-title"
            className="mb-3 text-3xl sm:text-4xl font-extrabold tracking-tight"
          >
            Completa tu perfil
          </h1>
          <p className="mb-8 text-neutral-300 leading-relaxed">
            Ya verificamos tu acceso con Google. Completa los datos de tu
            empresa para enviar tu cuenta a revisión. No necesitas registrarte
            otra vez ni crear una contraseña.
          </p>
          <form className="space-y-5" onSubmit={submit}>
            <div>
              <label
                htmlFor="oauth-company"
                className="block text-sm font-semibold mb-2"
              >
                Empresa o marca
              </label>
              <input
                id="oauth-company"
                autoComplete="organization"
                required
                minLength={2}
                maxLength={120}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full min-h-12 rounded-xl border border-white/30 bg-white/10 px-4 text-white focus-visible:outline-2 focus-visible:outline-[#FDCB01]"
                placeholder="Nombre comercial"
              />
            </div>
            <div>
              <label
                htmlFor="oauth-contact"
                className="block text-sm font-semibold mb-2"
              >
                Persona de contacto
              </label>
              <input
                id="oauth-contact"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full min-h-12 rounded-xl border border-white/30 bg-white/10 px-4 text-white focus-visible:outline-2 focus-visible:outline-[#FDCB01]"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label
                htmlFor="oauth-phone"
                className="block text-sm font-semibold mb-2"
              >
                Teléfono de contacto{" "}
                <span className="text-neutral-400 font-normal">(opcional)</span>
              </label>
              <input
                id="oauth-phone"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={25}
                pattern="[+0-9 ()-]{7,25}"
                className="w-full min-h-12 rounded-xl border border-white/30 bg-white/10 px-4 text-white focus-visible:outline-2 focus-visible:outline-[#FDCB01]"
                placeholder="+1 809 000 0000"
              />
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-900/20 border border-red-400/35 p-3 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-12 rounded-xl bg-[#FDCB01] text-black font-bold px-6 py-3 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDCB01]"
            >
              {saving ? "Guardando perfil…" : "Enviar perfil a revisión"}
            </button>
          </form>
          <p className="mt-5 text-xs leading-relaxed text-neutral-400">
            El envío no activa campañas ni genera cobros. La aprobación de la
            cuenta corresponde a TAD.
          </p>
        </section>
      </main>
    </>
  );
}
