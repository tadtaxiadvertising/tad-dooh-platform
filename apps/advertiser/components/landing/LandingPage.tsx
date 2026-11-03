"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ArrowRight, Check, CarFront, ChartNoAxesCombined, ShieldCheck, MapPin, Radio, Play, MonitorPlay } from "lucide-react";
import CookieBanner from "@tad/ui/components/CookieBanner";
import { trackAnalyticsEvent } from "@tad/services/cookie-consent";
import { CITIES, formatRD, landingLinks, referralCodeFromSearch, type DemoCity } from "../../lib/landing/model";
import { OBJECTIVES, ROLE_CONTENT, ROLE_FAQS, type DemoObjective } from "../../lib/landing/content";
import { estimateCampaign, estimateCampaignDetailed, FIXED_FREQUENCY_SECONDS } from "../advertiser/simulatorPricing";
import CampaignJourney from "./CampaignJourney";
import CityScene from "./CityScene";
import LandingAnalytics from "./LandingAnalytics";
import styles from "./landing.module.css";

const RANGE_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];
const content = ROLE_CONTENT.advertiser;
const money = formatRD;

export default function LandingPage() {
  const [city, setCity] = useState<DemoCity>("sd");
  const [objective, setObjective] = useState<DemoObjective>("awareness");
  const [screens, setScreens] = useState(3);
  const [months, setMonths] = useState(2);
  // Explicit consent, not an automatic upsell: same default as public onboarding.
  const [includeProduction, setIncludeProduction] = useState(false);
  const [referral, setReferral] = useState<string | null>(null);
  useEffect(() => { setReferral(referralCodeFromSearch(window.location.search)); }, []);
  const previousPreview = useRef("");
  const stateRef = useRef({ city, objective, screens, months, includeProduction });

  const reduceMotion = useReducedMotion();
  const links = landingLinks();
  const config = { screens, months, frequencySeconds: FIXED_FREQUENCY_SECONDS, includeProduction };
  const quote = estimateCampaign(config);
  const projection = estimateCampaignDetailed(config);
  const advertiserDestination = referral ? `${links.advertiser}?ref=${encodeURIComponent(referral)}` : links.advertiser;
  const signupDestination = referral ? `${links.advertiserSignup}?ref=${encodeURIComponent(referral)}` : links.advertiserSignup;
  const cta = (destination: string) => trackAnalyticsEvent("cta_clicked", { role: "advertiser", destination });
  const recordPreview = () => {
    const state = stateRef.current;
    const key = `${state.city}:${state.objective}:${state.screens}:${state.months}:${state.includeProduction}`;
    if (previousPreview.current === key) return;
    previousPreview.current = key;
    trackAnalyticsEvent("budget_demo_used", { ...state });
  };

  return (
    <div className={styles.landing}>
      <a className="landing-skip" href="#main-content">Saltar al contenido</a>
      <header className="landing-header landing-wrap">
        <a href="/" className="landing-brand" aria-label="TAD Anunciantes, inicio">TAD<span>.</span><small>TAXI ADVERTISING</small></a>
        <nav aria-label="Navegación principal" className="landing-nav">
          <a href="#como-funciona">Cómo funciona</a><a href="#experiencia">Simula tu campaña</a><a href="#preguntas">Preguntas</a>
        </nav>
        <a href={advertiserDestination} className="landing-access" onClick={() => cta("advertiser_login")}>Ingresar <ArrowUpRight size={16} aria-hidden="true"/></a>
      </header>

      <main id="main-content">
        <section className="landing-hero landing-wrap" aria-labelledby="hero-title">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow"><span/> PUBLICIDAD QUE ACOMPAÑA TU CIUDAD</p>
            <motion.h1 id="hero-title" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}>
              {content.headline[0]}<br/><span>{content.headline[1]}</span>
            </motion.h1>
            <p className="landing-lead">{content.lead}</p>
            <div className="landing-hero-actions">
              <a className="landing-button landing-button-primary" href="#experiencia" onClick={() => cta("advertiser_lab")}>Simular mi campaña <ArrowUpRight size={19} aria-hidden="true"/></a>
              <a className="landing-text-link" href="#recorrido-campana" onClick={() => cta("campaign_story")}>Ver cómo funciona <ArrowRight size={17} aria-hidden="true"/></a>
            </div>
            <div className="landing-hero-proof"><ShieldCheck size={17} aria-hidden="true"/><span>Explora sin crear una cuenta. Datos ilustrativos y tarifas sujetas a validación.</span></div>
          </div>
          <CityScene />
        </section>
        <noscript><p className="landing-wrap landing-noscript">El simulador requiere JavaScript; puedes leer la propuesta y acceder al portal desde los enlaces de esta página.</p></noscript>
        <div className="landing-strip"><div className="landing-wrap">
          <span><CarFront size={18} aria-hidden="true"/> Publicidad en movimiento</span>
          <span><MapPin size={18} aria-hidden="true"/> Santo Domingo y Santiago</span>
          <span><MonitorPlay size={18} aria-hidden="true"/> Creatividad en tablet</span>
          <span><ChartNoAxesCombined size={18} aria-hidden="true"/> Reportes con contexto</span>
        </div></div>
        <div id="como-funciona" className="landing-wrap landing-story-wrap">
          <CampaignJourney onStepView={step => trackAnalyticsEvent("story_step_viewed", { step })}/>
        </div>

        <section id="experiencia" className="landing-experience landing-wrap" aria-labelledby="experience-title">
          <div className="landing-section-heading">
            <div><p className="landing-eyebrow">DISEÑA UNA IDEA. OBSERVA EL PRESUPUESTO.</p><h2 id="experience-title">Tu campaña, <span>a tu manera.</span></h2></div>
            <p>Simula por pantallas, duración y producción creativa opcional. No es una contratación ni confirma inventario.</p>
          </div>
          <div className="landing-role-panel landing-campaign-panel">
            <div className="landing-panel-copy">
              <p className="landing-eyebrow">{content.eyebrow}</p>
              <h3>Haz que tu marca salga a la calle.</h3>
              <p>Descubre cómo se estructura una campaña antes de solicitar una revisión comercial.</p>
              <ul>{content.benefits.map(item => <li key={item}><Check size={16} aria-hidden="true"/>{item}</li>)}</ul>
              <a className="landing-button landing-button-light" href={advertiserDestination} onClick={() => cta("advertiser_login")}>Entrar a mi portal <ArrowUpRight size={18} aria-hidden="true"/></a>
              {links.signupEnabled && <a className="landing-signup" href={signupDestination} onClick={() => cta("advertiser_signup")}>Solicitar registro <ArrowRight size={16} aria-hidden="true"/></a>}
              <p className="landing-disclaimer">Si la incorporación está cerrada, el acceso al portal existente continúa disponible. La simulación no crea campañas ni reserva pantallas.</p>
            </div>
            <div className="landing-preview">
              <div className="landing-card-top"><span><Radio size={13} aria-hidden="true"/> LABORATORIO PUBLICITARIO</span><span className="landing-badge">SIMULACIÓN</span></div>
              <div className="landing-creative" aria-hidden="true">
                <small>TAD · CREATIVIDAD DE EJEMPLO</small>
                <strong>{objective === "launch" ? "Algo nuevo llega a tu recorrido." : objective === "local" ? "Cerca de tu ciudad. Cerca de tu gente." : "Tu marca tiene un nuevo destino."}</strong>
                <span>{CITIES[city]} ↗</span>
              </div>
              <label htmlFor="campaign-city">Ciudad del ejemplo</label>
              <select id="campaign-city" value={city} onChange={e => {
                const value = e.target.value as DemoCity;
                setCity(value);
                stateRef.current = { ...stateRef.current, city: value };
                recordPreview();
              }}>
                {Object.entries(CITIES).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
              </select>
              <label htmlFor="campaign-objective">Objetivo de comunicación</label>
              <select id="campaign-objective" value={objective} onChange={e => {
                const value = e.target.value as DemoObjective;
                setObjective(value);
                stateRef.current = { ...stateRef.current, objective: value };
                recordPreview();
              }}>
                {Object.entries(OBJECTIVES).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
              </select>
              <label htmlFor="campaign-screens">Pantallas del ejemplo <span>{screens}</span></label>
              <input id="campaign-screens" type="range" min={1} max={15} step={1} value={screens}
                aria-valuetext={`${screens} pantallas`} onChange={e => {
                  const value = Number(e.target.value);
                  setScreens(value);
                  stateRef.current = { ...stateRef.current, screens: value };
                }}
                onBlur={recordPreview} onPointerUp={recordPreview} onKeyUp={e => { if (RANGE_KEYS.includes(e.key)) recordPreview(); }}/>
              <div className="landing-range-labels"><span>1 pantalla</span><span>15 pantallas</span></div>
              <label htmlFor="campaign-months">Duración <span>{months} {months === 1 ? "mes" : "meses"}</span></label>
              <input id="campaign-months" type="range" min={1} max={12} step={1} value={months}
                aria-valuetext={`${months} meses`} onChange={e => {
                  const value = Number(e.target.value);
                  setMonths(value);
                  stateRef.current = { ...stateRef.current, months: value };
                }}
                onBlur={recordPreview} onPointerUp={recordPreview} onKeyUp={e => { if (RANGE_KEYS.includes(e.key)) recordPreview(); }}/>
              <div className="landing-range-labels"><span>1 mes</span><span>12 meses</span></div>
              <label className="landing-production-option" htmlFor="campaign-production">
                <input id="campaign-production" type="checkbox" checked={includeProduction} onChange={e => {
                  const value = e.target.checked;
                  setIncludeProduction(value);
                  stateRef.current = { ...stateRef.current, includeProduction: value };
                  recordPreview();
                }}/>
                <span>Quiero contratar producción creativa opcional</span>
              </label>
              <div className="landing-preview-summary">
                <span>Pantallas y duración (precio de referencia)</span><strong>{money(quote.screensCost)}</strong>
                <span>Producción creativa (opcional)</span><strong>{includeProduction ? money(quote.productionFee) : "No incluida · RD$ 0"}</strong>
              </div>
              <p className="landing-total-label">Total estimado del ejemplo · sin impuestos adicionales</p>
              <motion.output className="landing-large-number" key={quote.total} id="budget-total"
                htmlFor="campaign-screens campaign-months campaign-production"
                initial={reduceMotion ? false : { opacity: .7, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
                {money(quote.total)}
              </motion.output>
              <p className="landing-estimate-detail">Impresiones estimadas por modelo: {projection.totalImpressions.min.toLocaleString("es-DO")}–{projection.totalImpressions.max.toLocaleString("es-DO")}. No equivalen a vistas verificadas ni personas únicas.</p>
              <p className="landing-disclaimer">Tarifas basadas en <code>business-rules.ts</code> (ADVERTISER_COST_PER_CAMPAIGN_RD: 1500; DRIVER_RATE_PER_AD_PLAY_RD: 1.25; DRIVER_REFERRAL_BONUS_RD: 500). Las tasas ilustrativas pueden diferir de las tarifas comerciales finales conciliadas con el backend. No es una cotización ni garantía de alcance.</p>
              <div className="landing-rate-summary">
                <p className="landing-rate-label">Los tres sustratos que mueven el negocio publicitario:</p>
                <table className="landing-rate-table">
                  <thead><tr><th>Sustrato</th><th>Disparador</th><th>Tasa de referencia</th><th>Frecuencia</th><th>Límite</th></tr></thead>
                  <tbody>
                    <tr><td>Pantalla digital</td><td>Play de 30s</td><td>RD$1.500/mes · pantalla</td><td>Mensual</td><td>15 (máx.)</td></tr>
                    <tr><td>Producción creativa</td><td>Video o estático</td><td>RD$1.500</td><td>Una vez</td><td>Opcional</td></tr>
                    <tr><td>Campaña</td><td>Suscripción</td><td>RD$1.500/campaña</td><td>Mensual</td><td>15 (máx.)</td></tr>
                  </tbody>
                </table>
                <p className="landing-rate-note">Tasas basadas en <code>business-rules.ts</code> (ADVERTISER_COST_PER_CAMPAIGN_RD: 1500; DRIVER_RATE_PER_AD_PLAY_RD: 1.25; DRIVER_REFERRAL_BONUS_RD: 500). Las tasas ilustrativas pueden diferir de las tarifas comerciales finales conciliadas con el backend.</p>
              </div>
              {projection.warnings.length > 0 && <details className="landing-warning-details"><summary>Ver fuentes y advertencias ({projection.warnings.length})</summary>
                <ul>{projection.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
              </details>}
            </div>
          </div>
        </section>
        <section id="medicion" className="landing-measurement landing-wrap" aria-labelledby="measurement-title">
          <div className="landing-section-heading"><div><p className="landing-eyebrow">LO QUE REALMENTE SIGNIFICAN LOS DATOS</p><h2 id="measurement-title">Medir empieza por <span>entender.</span></h2></div><p>Tres conceptos diferentes. Ninguno garantiza ventas.</p></div>
          <div className="landing-steps">{[
            { icon: Play, title: "Reproducción", body: "La reproducción se registra, sincroniza y valida. No equivale automáticamente a una persona alcanzada." },
            { icon: Radio, title: "Impresión estimada", body: "Exposición modelada usando supuestos, fuentes y rangos de incertidumbre; no confirma atención individual." },
            { icon: ChartNoAxesCombined, title: "Reporte", body: "Los resultados privados ayudan a interpretar la actividad de una campaña con contexto y metodología." },
          ].map((item,index) => <article key={item.title}><div><span>0{index+1}</span><item.icon size={22} aria-hidden="true"/></div><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </section>
        <section id="preguntas" className="landing-faq landing-wrap" aria-labelledby="faq-title">
          <div><p className="landing-eyebrow">CON INFORMACIÓN TRANSPARENTE</p><h2 id="faq-title">Preguntas de <span>anunciantes.</span></h2><p>Antes de iniciar una campaña con TAD.</p></div>
          <div>{ROLE_FAQS.advertiser.map(([question,answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className="landing-final landing-wrap" aria-labelledby="final-title">
          <p className="landing-eyebrow">TU PRÓXIMO MOVIMIENTO</p><h2 id="final-title">{content.finalTitle}</h2>
          <p className="landing-final-copy">{content.finalCopy}</p>
          <a href={advertiserDestination} className="landing-button landing-button-primary" onClick={() => cta("advertiser_login")}>{content.cta}<ArrowUpRight size={19} aria-hidden="true"/></a>
        </section>
      </main>
      <footer className="landing-footer landing-wrap">
        <a href="/" className="landing-brand" aria-label="TAD, inicio">TAD<span>.</span></a>
        <p>Publicidad que acompaña<br/> el movimiento de la ciudad.</p>
        <nav aria-label="Información legal"><a href="/politica-de-privacidad">Privacidad</a><a href="/politica-de-cookies">Cookies</a><a href="/terminos-de-servicio">Términos</a><a href="/aviso-legal">Aviso legal</a></nav>
        <small>© {new Date().getFullYear()} TAD</small>
      </footer>
      <CookieBanner/><LandingAnalytics/>
    </div>
  );
}
