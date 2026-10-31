"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowRight, Check, CarFront, ChartNoAxesCombined, ShieldCheck, MapPin, Radio, Play, MoveUpRight } from "lucide-react";
import CookieBanner from "@tad/ui/components/CookieBanner";
import { trackAnalyticsEvent } from "@tad/services/cookie-consent";
import { CITIES, ROLES, estimateDriverEarnings, formatRD, landingLinks, normalizeBudget, referralCodeFromSearch, type DemoCity, type LandingRole } from "../../lib/landing/model";
import { OBJECTIVES, ROLE_CONTENT, ROLE_FAQS, type DemoObjective } from "../../lib/landing/content";
import CampaignJourney from "./CampaignJourney";
import CityScene from "./CityScene";
import LandingAnalytics from "./LandingAnalytics";
import styles from "./landing.module.css";

const RANGE_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

export default function LandingPage() {
  const [role, setRole] = useState<LandingRole>("advertiser");
  const [budget, setBudget] = useState(25000);
  const [city, setCity] = useState<DemoCity>("sd");
  const [objective, setObjective] = useState<DemoObjective>("awareness");
  const [slots, setSlots] = useState(8);
  const [cpa, setCpa] = useState(0);
  const [referral, setReferral] = useState<string | null>(null);
  useEffect(() => { setReferral(referralCodeFromSearch(window.location.search)); }, []);
  const previousPreviews = useRef({ budget: "sd:25000:awareness", earnings: "8:0" });
  const links = landingLinks();
  const content = ROLE_CONTENT[role];
  const earnings = estimateDriverEarnings(slots, cpa);
  const advertiserDestination = referral ? `${links.advertiser}?ref=${encodeURIComponent(referral)}` : links.advertiser;
  const mainDestination = role === "driver" ? links.driverLanding : advertiserDestination;
  const signupDestination = role === "advertiser" ? links.advertiserSignup : links.driverSignup;
  const referredSignup = referral ? `${signupDestination}?ref=${encodeURIComponent(referral)}` : signupDestination;
  const destinationName = role === "driver" ? "driver_landing" : `${role}_login`;

  const recordBudget = (nextBudget = budget, nextCity = city, nextObjective = objective) => {
    const key = `${nextCity}:${nextBudget}:${nextObjective}`;
    if (previousPreviews.current.budget === key) return;
    previousPreviews.current.budget = key;
    trackAnalyticsEvent("budget_demo_used", { city: nextCity, budget: nextBudget, objective: nextObjective });
  };
  const recordEarnings = () => {
    const key = `${slots}:${cpa}`;
    if (previousPreviews.current.earnings === key) return;
    previousPreviews.current.earnings = key;
    trackAnalyticsEvent("earnings_demo_used", { slots, cpa });
  };
  const selectRole = (next: LandingRole) => {
    if (next !== role) {
      trackAnalyticsEvent("perspective_selected", { role: next });
    }
    setRole(next);
  };
  const cta = (destination: string, selectedRole: LandingRole = role) => trackAnalyticsEvent("cta_clicked", { role: selectedRole, destination });
  const roleButtons = (hero = false) => <div className={hero ? "landing-perspectives" : "landing-roles"} role="group" aria-label={hero ? "Tu perspectiva" : "Elige tu perfil"}>
    {ROLES.map((item, index) => <button key={item.id} type="button" aria-label={item.label} aria-pressed={role === item.id} onClick={() => selectRole(item.id)}>
      {!hero && <span className="landing-role-number">0{index + 1}</span>}
      <span><strong>{item.label}</strong>{!hero && <small>{item.detail}</small>}</span>
      {!hero && <ArrowUpRight size={20} aria-hidden="true" />}
    </button>)}
  </div>;

  return <div className={styles.landing}>
    <a className="landing-skip" href="#main-content">Saltar al contenido</a>
    <header className="landing-header landing-wrap">
      <a href="/" className="landing-brand" aria-label="TAD, inicio">TAD<span>.</span><small>TAXI ADVERTISING</small></a>
      <nav aria-label="Navegación principal" className="landing-nav"><a href="#como-funciona">Cómo funciona</a><a href="#experiencia">Prueba TAD</a><a href="#preguntas">Preguntas</a></nav>
      <a href={role === "driver" ? links.driver : mainDestination} className="landing-access" onClick={() => cta(`${role}_login`)}>Ingresar <ArrowUpRight size={16} aria-hidden="true" /></a>
    </header>
    <main id="main-content">
      <section className="landing-hero landing-wrap" aria-labelledby="hero-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span /> TU CIUDAD. TU PERSPECTIVA.</p>
          {roleButtons(true)}
          <h1 id="hero-title">{content.headline[0]}<br /><span>{content.headline[1]}</span></h1>
          <p className="landing-lead">{content.lead}</p>
          <div className="landing-hero-actions"><a className="landing-button landing-button-primary" href="#experiencia" onClick={() => cta("experience")}>{content.heroCta}<ArrowUpRight size={19} aria-hidden="true" /></a><a className="landing-text-link" href="#recorrido-campana" onClick={() => cta("campaign_story")}>Ver cómo funciona <ArrowRight size={17} aria-hidden="true" /></a></div>
          <div className="landing-hero-proof"><ShieldCheck size={17} aria-hidden="true" /><span>Explora a tu ritmo. Demos sin datos reales.</span></div>
        </div>
        <CityScene role={role} />
      </section>
      <p className="landing-sr-only" role="status" aria-live="polite">Perspectiva: {ROLES.find(item => item.id === role)?.label}. {content.title}</p>
      <noscript><p className="landing-wrap landing-noscript">Los ejemplos interactivos necesitan JavaScript. Puedes conocer ambos perfiles y acceder a sus portales más abajo.</p></noscript>
      <div className="landing-strip"><div className="landing-wrap"><span><CarFront size={18} aria-hidden="true" /> Pantallas en taxis</span><span><MapPin size={18} aria-hidden="true" /> Contexto urbano</span><span><ChartNoAxesCombined size={18} aria-hidden="true" /> Reportes con contexto</span><span><ShieldCheck size={18} aria-hidden="true" /> Acceso por perfil</span></div></div>
      <div id="como-funciona" className="landing-wrap landing-story-wrap"><CampaignJourney onStepView={step => trackAnalyticsEvent("story_step_viewed", { step })} /></div>

      <section id="experiencia" className="landing-experience landing-wrap" aria-labelledby="experience-title">
        <div className="landing-section-heading"><div><p className="landing-eyebrow">MENOS IMAGINAR. MÁS EXPLORAR.</p><h2 id="experience-title">Haz tu próximo <span>movimiento.</span></h2></div><p>Elige una perspectiva y prueba su demo.<br />Nada se contrata desde esta página.</p></div>
        {roleButtons()}
        <div className="landing-role-panel" data-role={role}>
          <div className="landing-panel-copy">
            <p className="landing-eyebrow">{content.eyebrow}</p><h3>{content.title}</h3><p>{content.description}</p>
            <ul>{content.benefits.map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul>
            <a href={mainDestination} className="landing-button landing-button-light" onClick={() => cta(destinationName)}>{content.cta}<ArrowUpRight size={18} aria-hidden="true" /></a>
            {role === "driver" && <a className="landing-signup" href={links.driver} onClick={() => cta("driver_login")}>Ingresar como conductor <ArrowRight size={16} aria-hidden="true" /></a>}
            {links.signupEnabled && <a className="landing-signup" href={referredSignup} onClick={() => cta(`${role}_signup`)}>Solicitar registro <ArrowRight size={16} aria-hidden="true" /></a>}
          </div>
          {role === "advertiser" && <div className="landing-preview">
            <div className="landing-card-top"><span><Radio size={13} aria-hidden="true" /> TU IDEA DE CAMPAÑA</span><span className="landing-badge">EJEMPLO</span></div>
            <div className="landing-creative" aria-hidden="true"><small>TAD · CREATIVIDAD ILUSTRATIVA</small><strong>{objective === "launch" ? "Algo nuevo llega a tu recorrido." : objective === "local" ? "Cerca de tu ciudad. Cerca de tu gente." : "Tu marca tiene un nuevo destino."}</strong><span>{CITIES[city]} ↗</span></div>
            <label htmlFor="campaign-city">Ciudad de tu campaña</label><select id="campaign-city" value={city} onChange={event => { const next = event.target.value as DemoCity; setCity(next); recordBudget(budget, next); }}>{Object.entries(CITIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <label htmlFor="campaign-objective">Objetivo del ejemplo</label><select id="campaign-objective" value={objective} onChange={event => { const next = event.target.value as DemoObjective; setObjective(next); recordBudget(budget, city, next); }}>{Object.entries(OBJECTIVES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <label htmlFor="campaign-budget">Presupuesto de campaña <span>RD$</span></label><output id="budget-total" className="landing-large-number" htmlFor="campaign-budget">{formatRD(budget)}</output>
            <input id="campaign-budget" aria-label="Presupuesto de campaña" type="range" min="5000" max="150000" step="5000" value={budget} aria-valuetext={formatRD(budget)} onChange={event => setBudget(normalizeBudget(Number(event.target.value)))} onPointerUp={() => recordBudget()} onBlur={() => recordBudget()} onKeyUp={event => { if (RANGE_KEYS.includes(event.key)) recordBudget(); }} />
            <div className="landing-range-labels"><span>RD$ 5,000</span><span>RD$ 150,000</span></div>
            <div className="landing-preview-summary"><span>Ciudad de ejemplo</span><strong>{CITIES[city]}</strong><span>Tu objetivo</span><strong>{OBJECTIVES[objective]}</strong><span>Siguiente paso</span><strong>Revisión y planificación</strong></div>
            <p className="landing-disclaimer">Ejemplo educativo. No estima alcance ni confirma disponibilidad. El presupuesto no se convierte automáticamente en pantallas, impresiones o resultados.</p>
          </div>}
          {role === "driver" && <div className="landing-preview">
            <div className="landing-card-top"><span><CarFront size={14} aria-hidden="true" /> UN EJEMPLO PARA TU RECORRIDO</span><span className="landing-badge">BRUTO ILUSTRATIVO</span></div>
            <p className="landing-preview-intro">Cada pieza suma al ejemplo. Tú eliges cuántas.</p>
            <div className="landing-slots" aria-label={`${slots} de 15 slots en el ejemplo`}>{Array.from({ length: 15 }, (_, index) => <span key={index} data-slot-active={index < slots} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>)}</div>
            <label htmlFor="driver-slots">Slots publicitarios <span>{slots} / 15</span></label><input id="driver-slots" aria-label="Slots publicitarios" type="range" min="0" max="15" step="1" value={slots} aria-valuetext={`${slots} de 15 slots`} onChange={event => setSlots(Number(event.target.value))} onPointerUp={recordEarnings} onBlur={recordEarnings} onKeyUp={event => { if (RANGE_KEYS.includes(event.key)) recordEarnings(); }} />
            <label htmlFor="driver-cpa">Eventos CPA validados <span>{cpa}</span></label><input id="driver-cpa" aria-label="Eventos CPA validados" type="range" min="0" max="100" step="1" value={cpa} aria-valuetext={`${cpa} eventos validados en el ejemplo`} onChange={event => setCpa(Number(event.target.value))} onPointerUp={recordEarnings} onBlur={recordEarnings} onKeyUp={event => { if (RANGE_KEYS.includes(event.key)) recordEarnings(); }} />
            <div className="landing-preview-summary"><span>{slots} slots × RD$ 500</span><strong>{formatRD(earnings.adsRD)}</strong><span>{cpa} CPA validados × RD$ 500</span><strong>{formatRD(earnings.cpaRD)}</strong></div>
            <p className="landing-total-label">Total bruto del ejemplo</p><output id="driver-total" className="landing-large-number" htmlFor="driver-slots driver-cpa">{formatRD(earnings.totalRD)}</output>
            <p className="landing-disclaimer">No es una nómina ni un saldo. No garantiza ingresos. Sujeto a elegibilidad, actividad verificada, ajustes y contrato. Un referido pendiente no es un CPA validado. El máximo de 100 CPA es solo un límite de esta demo.</p>
          </div>}
        </div>
        {role === "driver" && <ol className="landing-driver-path" aria-label="Camino de participación del conductor">{["Conoce las condiciones", "Revisa los requisitos", "Solicita evaluación cuando esté habilitada", "Participa tras la aprobación"].map((step, index) => <li key={step}><span>0{index + 1}</span>{step}</li>)}</ol>}
      </section>

      <section id="medicion" className="landing-measurement landing-wrap" aria-labelledby="measurement-title">
        <div className="landing-section-heading"><div><p className="landing-eyebrow">APRENDE ALGO EN UN MINUTO</p><h2 id="measurement-title">Medir empieza por <span>entender.</span></h2></div><p>Tres conceptos, tres significados.<br />Ninguno garantiza una venta.</p></div>
        <div className="landing-steps">{[
          { icon: Play, title: "Una reproducción", body: "Un evento de contenido reproducido que debe sincronizarse y validarse. No equivale a una persona única ni confirma que alguien prestó atención." },
          { icon: Radio, title: "Una impresión estimada", body: "Una estimación de exposición según una metodología y sus supuestos. Se interpreta con incertidumbre; no es una mirada individual verificada." },
          { icon: ChartNoAxesCombined, title: "Un reporte de campaña", body: "Reúne actividad y estimaciones para tomar decisiones con contexto. La información real se consulta en el portal autorizado." },
        ].map((item, index) => <article key={item.title}><div><span>0{index + 1}</span><item.icon size={22} aria-hidden="true" /></div><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </section>
      <section id="perfiles" className="landing-profiles landing-wrap" aria-labelledby="profiles-title">
        <div className="landing-section-heading"><div><p className="landing-eyebrow">DOS CAMINOS. UN PUNTO DE ENCUENTRO.</p><h2 id="profiles-title">Encuentra <span>tu lugar.</span></h2></div><p>También puedes ir directo a tu perfil.</p></div>
        <div className="landing-profile-grid">{ROLES.map((item, index) => <article key={item.id}><span className="landing-profile-index">0{index + 1} / {item.label}</span><h3>{ROLE_CONTENT[item.id].title}</h3><p>{ROLE_CONTENT[item.id].description}</p><a href={item.id === "driver" ? links.driverLanding : advertiserDestination} onClick={() => cta(item.id === "driver" ? "driver_landing" : `${item.id}_login`, item.id)}>{ROLE_CONTENT[item.id].cta}<MoveUpRight size={17} aria-hidden="true" /></a></article>)}</div>
      </section>
      <section id="preguntas" className="landing-faq landing-wrap" aria-labelledby="faq-title">
        <div><p className="landing-eyebrow">CON LA INFORMACIÓN CLARA</p><h2 id="faq-title">Preguntas desde<br /><span>tu perspectiva.</span></h2><p>{ROLES.find(item => item.id === role)?.label}: lo que conviene saber antes de dar el siguiente paso.</p></div>
        <div key={role}>{ROLE_FAQS[role].map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </section>
      <section className="landing-final landing-wrap" aria-labelledby="final-title"><p className="landing-eyebrow">TU PRÓXIMO MOVIMIENTO</p><h2 id="final-title">{content.finalTitle}</h2><p className="landing-final-copy">{content.finalCopy}</p><a href={mainDestination} className="landing-button landing-button-primary" onClick={() => cta(destinationName)}>{content.cta}<ArrowUpRight size={19} aria-hidden="true" /></a></section>
    </main>
    <footer className="landing-footer landing-wrap"><a href="/" className="landing-brand" aria-label="TAD, inicio">TAD<span>.</span></a><p>Publicidad que acompaña<br />el movimiento de la ciudad.</p><nav aria-label="Información legal"><a href="/politica-de-privacidad">Privacidad</a><a href="/politica-de-cookies">Cookies</a><a href="/terminos-de-servicio">Términos</a><a href="/aviso-legal">Aviso legal</a></nav><small>© {new Date().getFullYear()} TAD</small></footer>
    <CookieBanner /><LandingAnalytics />
  </div>;
}
