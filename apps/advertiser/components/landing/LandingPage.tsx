"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  CarFront,
  ChartNoAxesCombined,
  ShieldCheck,
  MapPin,
  Radio,
  Play,
  MonitorPlay,
} from "lucide-react";
import CookieBanner from "@tad/ui/components/CookieBanner";
import { trackAnalyticsEvent } from "@tad/services/cookie-consent";
import {
  CITIES,
  campaignSignupHref,
  formatRD,
  landingLinks,
  referralCodeFromSearch,
  type DemoCity,
} from "../../lib/landing/model";
import {
  OBJECTIVES,
  ROLE_CONTENT,
  ROLE_FAQS,
  type DemoObjective,
} from "../../lib/landing/content";
import {
  estimateCampaignDetailed,
  FIXED_FREQUENCY_SECONDS,
} from "../advertiser/simulatorPricing";
import { clearReferralCode } from "../advertiser/referral";
import CampaignJourney from "./CampaignJourney";
import CreativePreview from "./CreativePreview";
import TaxiScrollStory from "./TaxiScrollStory";
import PassengerQrStory from "./PassengerQrStory";
import CityScene from "./CityScene";
import LandingAnalytics from "./LandingAnalytics";
import styles from "./landing.module.css";

const RANGE_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
];
type CtaDestination =
  | "advertiser_login"
  | "advertiser_signup"
  | "advertiser_lab"
  | "campaign_story";

type CtaPlacement =
  "header" | "hero" | "simulator_intro" | "simulator_result" | "final";

const content = ROLE_CONTENT.advertiser;
const money = formatRD;

export default function LandingPage() {
  const [city, setCity] = useState<DemoCity>("sd");
  const [objective, setObjective] = useState<DemoObjective>("awareness");
  // Editable in this browser session only; deliberately absent from analytics snapshots.
  const [brandName, setBrandName] = useState("");
  const [screens, setScreens] = useState(3);
  const [months, setMonths] = useState(2);
  // Explicit consent, not an automatic upsell: same default as public onboarding.
  const [includeProduction, setIncludeProduction] = useState(false);
  const [referral, setReferral] = useState<string | null>(null);
  useEffect(() => {
    const search = window.location.search;
    const code = referralCodeFromSearch(search);
    // Do not let an explicit invalid link revive a previous session's code
    // when the visitor proceeds to the portal without a referral parameter.
    if (code === null && new URLSearchParams(search).has("ref")) {
      clearReferralCode();
    }
    setReferral(code);
  }, []);
  const previousPreview = useRef("");
  const links = landingLinks();
  const config = {
    screens,
    months,
    frequencySeconds: FIXED_FREQUENCY_SECONDS,
    includeProduction,
  };
  // A single projection keeps costs, impact ranges and warnings consistent.
  const projection = estimateCampaignDetailed(config);
  const budgetOutputRef = useRef<HTMLOutputElement>(null);
  const previousBudgetTotal = useRef(projection.totalCost);
  useEffect(() => {
    if (previousBudgetTotal.current === projection.totalCost) return;
    previousBudgetTotal.current = projection.totalCost;
    // A stable output avoids remounts, mount animation and keyboard focus loss.
    // Query motion preference at the moment the value changes; no animation SDK needed.
    const output = budgetOutputRef.current;
    if (
      !output ||
      typeof output.animate !== "function" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const animation = output.animate(
      [
        { transform: "translateY(3px)", opacity: 0.94 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      { duration: 180, easing: "ease-out" },
    );
    return () => animation.cancel();
  }, [projection.totalCost]);
  const advertiserDestination = referral
    ? `${links.advertiser}?ref=${encodeURIComponent(referral)}`
    : links.advertiser;
  const signupDestination = campaignSignupHref(
    { screens, months, city },
    referral,
  );
  const finalDestination = links.signupEnabled
    ? signupDestination
    : advertiserDestination;
  const finalEvent = links.signupEnabled
    ? "advertiser_signup"
    : "advertiser_login";
  const nextLabel = links.signupEnabled
    ? "Continuar con mi campaña"
    : "Ingresar al portal";
  const nextHint = links.signupEnabled
    ? "Podrás revisar tu configuración antes de solicitar la campaña."
    : "Acceso para anunciantes registrados.";
  function cta(destination: CtaDestination, placement: CtaPlacement) {
    trackAnalyticsEvent("cta_clicked", {
      role: "advertiser",
      destination,
      placement,
    });
  }
  const recordPreview = (
    patch: Partial<{
      city: DemoCity;
      objective: DemoObjective;
      screens: number;
      months: number;
      includeProduction: boolean;
    }> = {},
  ) => {
    // Read the just-committed interaction directly: React state is updated
    // asynchronously, so the closure still contains the previous selection.
    const snapshot = {
      city,
      objective,
      screens,
      months,
      includeProduction,
      ...patch,
    };
    const key = `${snapshot.city}:${snapshot.objective}:${snapshot.screens}:${snapshot.months}:${snapshot.includeProduction}`;
    if (previousPreview.current === key) return;
    previousPreview.current = key;
    trackAnalyticsEvent("budget_demo_used", snapshot);
  };

  return (
    <div className={styles.landing}>
      <a className="landing-skip" href="#main-content">
        Saltar al contenido
      </a>
      <header className="landing-header landing-wrap">
        <a
          href="/"
          className="landing-brand"
          aria-label="TAD Taxi Advertising, Anunciantes, inicio"
        >
          TAD<span>.</span>
          <small>TAXI ADVERTISING</small>
        </a>
        <nav aria-label="Navegación principal" className="landing-nav">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#interaccion-qr">Promociones con QR</a>
          <a href="#experiencia">Simula tu campaña</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
        <details className="landing-mobile-menu">
          <summary>Secciones</summary>
          <nav aria-label="Secciones de anunciantes en móvil">
            <a
              href="#como-funciona"
              onClick={(e) =>
                e.currentTarget.closest("details")?.removeAttribute("open")
              }
            >
              Cómo funciona
            </a>
            <a
              href="#interaccion-qr"
              onClick={(e) =>
                e.currentTarget.closest("details")?.removeAttribute("open")
              }
            >
              Promociones con QR
            </a>
            <a
              href="#experiencia"
              onClick={(e) =>
                e.currentTarget.closest("details")?.removeAttribute("open")
              }
            >
              Simular campaña
            </a>
            <a
              href="#preguntas"
              onClick={(e) =>
                e.currentTarget.closest("details")?.removeAttribute("open")
              }
            >
              Preguntas frecuentes
            </a>
          </nav>
        </details>
        <a
          href={advertiserDestination}
          className="landing-access"
          onClick={() => cta("advertiser_login", "header")}
        >
          Ingresar <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section
          className="landing-hero landing-wrap"
          aria-labelledby="hero-title"
        >
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">
              <span /> PUBLICIDAD QUE ACOMPAÑA TU CIUDAD
            </p>
            <h1 id="hero-title">
              {content.headline[0]}
              <br />
              <span>{content.headline[1]}</span>
            </h1>
            <p className="landing-lead">{content.lead}</p>
            <div className="landing-hero-actions">
              <a
                className="landing-button landing-button-primary"
                href="#experiencia"
                onClick={() => cta("advertiser_lab", "hero")}
              >
                Simular mi campaña <ArrowUpRight size={19} aria-hidden="true" />
              </a>
              <a
                className="landing-text-link"
                href="#motion-story"
                onClick={() => cta("campaign_story", "hero")}
              >
                Ver cómo funciona <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="landing-hero-proof">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>
                Explora sin crear una cuenta. Datos ilustrativos y tarifas
                sujetas a validación.
              </span>
            </div>
            <div
              className="landing-hero-cities"
              role="group"
              aria-label="Elegir ciudad del escenario publicitario ilustrativo"
            >
              <span>ESCENA URBANA</span>
              {(Object.keys(CITIES) as DemoCity[]).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={city === choice}
                  onClick={() => {
                    setCity(choice);
                    recordPreview({ city: choice });
                  }}
                >
                  {CITIES[choice]}
                </button>
              ))}
            </div>
            <ol
              className="landing-hero-steps"
              aria-label="Así comienza una campaña"
            >
              <li>
                <span>01</span> Imagina
              </li>
              <li>
                <span>02</span> Configura
              </li>
              <li>
                <span>03</span> Solicita revisión
              </li>
            </ol>
          </div>
          <div className="landing-hero-stage">
            <CityScene
              city={city}
              objective={objective}
              brandName={brandName}
            />
            <div
              className="landing-stage-controls"
              role="group"
              aria-label="Personalizar creatividad ilustrativa"
            >
              <label
                className="landing-stage-objective"
                htmlFor="hero-campaign-objective"
              >
                <span>Cambia el mensaje en pantalla</span>
                <select
                  id="hero-campaign-objective"
                  value={objective}
                  onChange={(event) => {
                    const nextObjective = event.target.value as DemoObjective;
                    setObjective(nextObjective);
                    recordPreview({ objective: nextObjective });
                  }}
                >
                  {Object.entries(OBJECTIVES).map(([value, title]) => (
                    <option key={value} value={value}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="landing-stage-brand" htmlFor="hero-brand-name">
                <span>Tu marca en esta pantalla (opcional)</span>
                <input
                  id="hero-brand-name"
                  type="text"
                  autoComplete="off"
                  maxLength={24}
                  placeholder="Ej. Mi negocio"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                />
              </label>
            </div>
            <p className="landing-stage-privacy">
              La pantalla TAD va detrás del reposacabezas del copiloto,
              orientada al pasajero. Esta escena es ilustrativa; el nombre de tu
              marca no se guarda ni se incluye en los eventos de esta demo.
            </p>
          </div>
        </section>
        <noscript>
          <p className="landing-wrap landing-noscript">
            El simulador requiere JavaScript; puedes leer la propuesta y acceder
            al portal desde los enlaces de esta página.
          </p>
        </noscript>
        <div className="landing-strip">
          <div className="landing-wrap">
            <span>
              <CarFront size={18} aria-hidden="true" /> Publicidad en movimiento
            </span>
            <span>
              <MapPin size={18} aria-hidden="true" /> Santo Domingo y Santiago
            </span>
            <span>
              <MonitorPlay size={18} aria-hidden="true" /> Creatividad en tablet
            </span>
            <span>
              <ChartNoAxesCombined size={18} aria-hidden="true" /> Reportes con
              contexto
            </span>
          </div>
        </div>
        <TaxiScrollStory city={city} brandName={brandName} />
        <PassengerQrStory brandName={brandName} />
        <div className="landing-wrap">
          <CreativePreview />
        </div>
        <div id="como-funciona" className="landing-wrap landing-story-wrap">
          <CampaignJourney
            onStepView={(step) =>
              trackAnalyticsEvent("story_step_viewed", { step })
            }
          />
        </div>

        <section
          id="experiencia"
          className="landing-experience landing-wrap"
          aria-labelledby="experience-title"
        >
          <div className="landing-section-heading">
            <div>
              <p className="landing-eyebrow">
                DISEÑA UNA IDEA. OBSERVA EL PRESUPUESTO.
              </p>
              <h2 id="experience-title">
                Tu campaña, <span>a tu manera.</span>
              </h2>
            </div>
            <p>
              Simula por pantallas, duración y producción creativa opcional. No
              es una contratación ni confirma inventario.
            </p>
          </div>
          <div className="landing-role-panel landing-campaign-panel">
            <div className="landing-panel-copy">
              <p className="landing-eyebrow">{content.eyebrow}</p>
              <h3>Haz que tu marca salga a la calle.</h3>
              <p>
                Descubre cómo se estructura una campaña antes de solicitar una
                revisión comercial.
              </p>
              <ul>
                {content.benefits.map((item) => (
                  <li key={item}>
                    <Check size={16} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                className="landing-button landing-button-light"
                href={advertiserDestination}
                onClick={() => cta("advertiser_login", "simulator_intro")}
              >
                Entrar a mi portal <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <p className="landing-disclaimer">
                {links.signupEnabled
                  ? "Revisa tu configuración en el registro y confirma allí la producción opcional. La simulación no reserva pantallas."
                  : "Si la incorporación está cerrada, el acceso al portal existente continúa disponible. La simulación no reserva pantallas."}
              </p>
            </div>
            <div className="landing-preview">
              <div className="landing-card-top">
                <span>
                  <Radio size={13} aria-hidden="true" /> LABORATORIO
                  PUBLICITARIO
                </span>
                <span className="landing-badge">SIMULACIÓN</span>
              </div>
              <div className="landing-creative" aria-hidden="true">
                <small>TAD · CREATIVIDAD DE EJEMPLO</small>
                <strong>
                  {objective === "launch"
                    ? "Algo nuevo llega a tu recorrido."
                    : objective === "local"
                      ? "Cerca de tu ciudad. Cerca de tu gente."
                      : "Tu marca tiene un nuevo destino."}
                </strong>
                <span>{CITIES[city]} ↗</span>
              </div>
              <label htmlFor="campaign-city">Ciudad del ejemplo</label>
              <select
                id="campaign-city"
                value={city}
                onChange={(e) => {
                  const nextCity = e.target.value as DemoCity;
                  setCity(nextCity);
                  recordPreview({ city: nextCity });
                }}
              >
                {Object.entries(CITIES).map(([value, title]) => (
                  <option key={value} value={value}>
                    {title}
                  </option>
                ))}
              </select>
              <label htmlFor="campaign-objective">
                Objetivo de comunicación
              </label>
              <select
                id="campaign-objective"
                value={objective}
                onChange={(e) => {
                  const nextObjective = e.target.value as DemoObjective;
                  setObjective(nextObjective);
                  recordPreview({ objective: nextObjective });
                }}
              >
                {Object.entries(OBJECTIVES).map(([value, title]) => (
                  <option key={value} value={value}>
                    {title}
                  </option>
                ))}
              </select>
              <label htmlFor="campaign-screens">
                Pantallas del ejemplo <span>{screens}</span>
              </label>
              <input
                id="campaign-screens"
                type="range"
                min={1}
                max={15}
                step={1}
                value={screens}
                aria-valuetext={`${screens} pantallas`}
                onChange={(e) => setScreens(Number(e.target.value))}
                onBlur={() => recordPreview()}
                onPointerUp={() => recordPreview()}
                onKeyUp={(e) => {
                  if (RANGE_KEYS.includes(e.key)) recordPreview();
                }}
              />
              <div className="landing-range-labels">
                <span>1 pantalla</span>
                <span>15 pantallas</span>
              </div>
              <label htmlFor="campaign-months">
                Duración{" "}
                <span>
                  {months} {months === 1 ? "mes" : "meses"}
                </span>
              </label>
              <input
                id="campaign-months"
                type="range"
                min={1}
                max={12}
                step={1}
                value={months}
                aria-valuetext={`${months} meses`}
                onChange={(e) => setMonths(Number(e.target.value))}
                onBlur={() => recordPreview()}
                onPointerUp={() => recordPreview()}
                onKeyUp={(e) => {
                  if (RANGE_KEYS.includes(e.key)) recordPreview();
                }}
              />
              <div className="landing-range-labels">
                <span>1 mes</span>
                <span>12 meses</span>
              </div>
              <label
                className="landing-production-option"
                htmlFor="campaign-production"
              >
                <input
                  id="campaign-production"
                  type="checkbox"
                  checked={includeProduction}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncludeProduction(checked);
                    recordPreview({ includeProduction: checked });
                  }}
                />
                <span>Añadir producción creativa opcional al ejemplo</span>
              </label>
              <div className="landing-preview-summary">
                <span>Pantallas y duración (precio de referencia)</span>
                <strong>{money(projection.screensCost)}</strong>
                <span>Producción creativa (opcional)</span>
                <strong>
                  {includeProduction
                    ? money(projection.productionFee)
                    : "No incluida · RD$ 0"}
                </strong>
              </div>
              <p className="landing-total-label">
                Subtotal ilustrativo · impuestos no incluidos
              </p>
              <output
                ref={budgetOutputRef}
                className="landing-large-number"
                id="budget-total"
                htmlFor="campaign-screens campaign-months campaign-production"
              >
                {money(projection.totalCost)}
              </output>
              <p className="landing-estimate-detail">
                Impresiones estimadas por modelo:{" "}
                {projection.totalImpressions.min.toLocaleString("es-DO")}–
                {projection.totalImpressions.max.toLocaleString("es-DO")}. No
                equivalen a vistas verificadas ni personas únicas. Las
                proyecciones utilizan benchmarks internacionales y supuestos del
                modelo; revisa las fuentes y advertencias antes de interpretar
                el alcance.
              </p>
              <p className="landing-disclaimer">
                Las tarifas de esta simulación son ilustrativas y requieren
                confirmación comercial antes de contratar. No constituye
                cotización, inventario reservado ni garantía de alcance.
              </p>
              <aside
                className="landing-rate-summary"
                aria-label="Cómo interpretar esta estimación"
              >
                <strong>Una propuesta para explorar, no una factura.</strong>
                <p>
                  El ejemplo separa pantallas y duración de la producción
                  creativa, que empieza desactivada. Los impuestos aplicables y
                  la disponibilidad se confirman antes de contratar. Los
                  importes del simulador no sustituyen las tarifas aprobadas.
                </p>
              </aside>
              <p
                id="campaign-referral-status"
                className="landing-referral-status"
                role="status"
              >
                {referral
                  ? "Código de referido recibido. El descuento del 40 % sobre pantallas está sujeto a validación del servidor durante el registro. Este subtotal no incluye el descuento."
                  : ""}
              </p>
              <div className="landing-budget-next">
                <a
                  id="campaign-next"
                  className="landing-button landing-button-primary"
                  href={finalDestination}
                  onClick={() => cta(finalEvent, "simulator_result")}
                >
                  {nextLabel}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <p>{nextHint}</p>
              </div>
              {projection.warnings.length > 0 && (
                <details className="landing-warning-details">
                  <summary>
                    Ver fuentes y advertencias ({projection.warnings.length})
                  </summary>
                  <ul>
                    {projection.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </section>
        <section
          id="medicion"
          className="landing-measurement landing-wrap"
          aria-labelledby="measurement-title"
        >
          <div className="landing-section-heading">
            <div>
              <p className="landing-eyebrow">
                LO QUE REALMENTE SIGNIFICAN LOS DATOS
              </p>
              <h2 id="measurement-title">
                Medir empieza por <span>entender.</span>
              </h2>
            </div>
            <p>Tres conceptos diferentes. Ninguno garantiza ventas.</p>
          </div>
          <div className="landing-steps">
            {[
              {
                icon: Play,
                title: "Reproducción",
                body: "La reproducción se registra, sincroniza y valida. No equivale automáticamente a una persona alcanzada.",
              },
              {
                icon: Radio,
                title: "Impresión estimada",
                body: "Exposición modelada usando supuestos, fuentes y rangos de incertidumbre; no confirma atención individual.",
              },
              {
                icon: ChartNoAxesCombined,
                title: "Reporte",
                body: "Los resultados privados ayudan a interpretar la actividad de una campaña con contexto y metodología.",
              },
            ].map((item, index) => (
              <article key={item.title}>
                <div>
                  <span>0{index + 1}</span>
                  <item.icon size={22} aria-hidden="true" />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="preguntas"
          className="landing-faq landing-wrap"
          aria-labelledby="faq-title"
        >
          <div>
            <p className="landing-eyebrow">CON INFORMACIÓN TRANSPARENTE</p>
            <h2 id="faq-title">
              Preguntas de <span>anunciantes.</span>
            </h2>
            <p>Antes de iniciar una campaña con TAD.</p>
          </div>
          <div>
            {ROLE_FAQS.advertiser.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          className="landing-final landing-wrap"
          aria-labelledby="final-title"
        >
          <p className="landing-eyebrow">TU PRÓXIMO MOVIMIENTO</p>
          <h2 id="final-title">{content.finalTitle}</h2>
          <p className="landing-final-copy">{content.finalCopy}</p>
          <a
            href={finalDestination}
            className="landing-button landing-button-primary"
            onClick={() => cta(finalEvent, "final")}
          >
            {links.signupEnabled ? "Continuar con mi campaña" : content.cta}
            <ArrowUpRight size={19} aria-hidden="true" />
          </a>
        </section>
      </main>
      <footer className="landing-footer landing-wrap">
        <a href="/" className="landing-brand" aria-label="TAD, inicio">
          TAD<span>.</span>
        </a>
        <p>
          Publicidad que acompaña
          <br /> el movimiento de la ciudad.
        </p>
        <nav aria-label="Información legal">
          <a href="/politica-de-privacidad">Privacidad</a>
          <a href="/politica-de-cookies">Cookies</a>
          <a href="/terminos-de-servicio">Términos</a>
          <a href="/aviso-legal">Aviso legal</a>
        </nav>
        <small>© {new Date().getFullYear()} TAD</small>
      </footer>
      <CookieBanner />
      <LandingAnalytics />
    </div>
  );
}
