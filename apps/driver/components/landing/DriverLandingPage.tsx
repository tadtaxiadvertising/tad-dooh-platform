import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import driverTaxi from "../../public/tad-driver-taxi-headrest.png";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileText,
  MonitorPlay,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import styles from "./driver-landing.module.css";
import DriverEarningsLab from "./DriverEarningsLab";

const signupEnabled = process.env.NEXT_PUBLIC_LANDING_SIGNUP_ENABLED === "true";

const benefits = [
  {
    icon: CarFront,
    title: "Tu taxi, conectado a nuevas oportunidades",
    text: "Una pantalla TAD detrás del reposacabezas del copiloto, orientada hacia tus pasajeros, muestra campañas elegibles según disponibilidad, revisión y condiciones del programa.",
  },
  {
    icon: MonitorPlay,
    title: "Tu operación, con una nueva fuente de ingresos",
    text: "Al tener una cuenta aprobada, accede al portal de conductor para usar las herramientas habilitadas para tu perfil.",

  },
  {
    icon: ShieldCheck,
    title: "Todo claro, desde el inicio",
    text: "Revisa las condiciones, simula escenarios y solicita tu incorporación cuando el registro esté habilitado. Sin letras pequeñas.",
  },
];

const steps = [
  {
    number: "01",
    title: "Conoce y prepara",
    text: "Lee las condiciones y ten a mano tu nombre, teléfono y los datos de tu vehículo: modelo y placa.",
  },
  {
    number: "02",
    title: "Solicita tu incorporación",
    text: "Cuando el registro esté disponible, completa la solicitud por el canal habilitado. Enviarla no activa tu cuenta.",
  },
  {
    number: "03",
    title: "Espera la revisión",
    text: "La incorporación requiere aprobación y las condiciones de pago que correspondan. Confirma los siguientes pasos antes de comenzar.",
  },
];

const questions = [
  {
    question: "¿Qué es TAD para un taxista?",
    answer:
      "TAD conecta la publicidad digital con pantallas a bordo de vehículos. Esta página explica cómo conocer la propuesta y el proceso para solicitar tu incorporación como conductor.",
  },
  {
    question: "¿Registrarme significa que ya estoy aprobado?",
    answer:
      "No. La solicitud queda pendiente de revisión y de las condiciones de aprobación y pago aplicables. Crear una cuenta no confirma incorporación, instalación ni activación del servicio.",
  },
  {
    question: "¿Cuáles son las tres formas de generar ingresos?",
    answer:
      "Puedes obtener compensaciones por campañas elegibles en tu pantalla (hasta 15 simultáneas), comisiones por ventas publicitarias aprobadas y bonos de RD$500 por conductores referidos que cumplan la activación. El simulador separa los importes de ejemplo; no son saldo ni pagos prometidos.",
  },
  {
    question: "¿Qué datos necesito para solicitar el registro?",
    answer:
      "El registro actual solicita nombre completo, teléfono, modelo del vehículo, placa y una contraseña. La solicitud está sujeta a revisión. No compartas contraseñas ni información bancaria fuera de los canales correspondientes.",
  },
  {
    question: "¿TAD está disponible para cualquier vehículo o zona?",
    answer:
      "La disponibilidad y la elegibilidad deben confirmarse durante la revisión. Esta página no garantiza cobertura de una ciudad, aceptación de un vehículo ni campañas disponibles para una ruta.",
  },
  {
    question: "Ya soy conductor de TAD. ¿Dónde entro?",
    answer:
      "Usa el enlace Ingresar del menú para abrir el acceso de conductores con tu cuenta existente. Las herramientas disponibles dependen del estado de tu cuenta y de tus permisos.",
  },
];

const CHANNELS = [
  {
    id: "screen",
    label: "Pantalla",
    statement:
      "Pantalla: campañas elegibles en el vehículo, sujetas a validación y condiciones de operación.",
    cardEyebrow: "PUBLICIDAD A BORDO",
    cardTitle: "Tu taxi, conectado.",
    cardNote: "Una pantalla para mensajes aprobados.",
    journey: [
      "Pantalla en el taxi",
      "Campañas elegibles",
      "Actividad validada",
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    statement:
      "Ventas: las comisiones corresponden a publicidad efectivamente aprobada, no a simples solicitudes.",
    cardEyebrow: "CONEXIONES COMERCIALES",
    cardTitle: "Conecta marcas con rutas.",
    cardNote: "Las ventas requieren revisión y aprobación.",
    journey: ["Contactas una marca", "Venta aprobada", "Comisión validada"],
  },
  {
    id: "referrals",
    label: "Referidos",
    statement:
      "Referidos: el bono es único y depende de la activación y aprobación del conductor referido.",
    cardEyebrow: "RED DE CONDUCTORES",
    cardTitle: "Comparte el recorrido.",
    cardNote: "El registro por sí solo no genera un bono.",
    journey: ["Invitas a un taxista", "Conductor activado", "Bono validado"],
  },
] as const;

type DriverChannel = (typeof CHANNELS)[number]["id"];

function DriverChannelJourney({ channel }: { channel: DriverChannel }) {
  const selected = CHANNELS.find((item) => item.id === channel) ?? CHANNELS[0];
  return (
    <ol
      className={styles.heroVisualSteps}
      data-channel={channel}
      aria-label={`Recorrido ilustrativo: ${selected.label.toLowerCase()}`}
    >
      {selected.journey.map((step, index) => (
        <li key={step}>
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function DriverHeroVisual() {
  return (
    <figure className={styles.heroVisual}>
      <div className={styles.heroVisualFrame}>
        <Image
          src={driverTaxi}
          alt="Taxi gris TAD con ampliación de la pantalla publicitaria detrás del reposacabezas del copiloto, orientada hacia los pasajeros"
          width={1536}
          height={1024}
          priority
          sizes="(max-width: 580px) calc(100vw - 36px), (max-width: 800px) 600px, (max-width: 1100px) 45vw, 600px"
        />
      </div>
      <figcaption>PUBLICIDAD DIGITAL A BORDO · TAD</figcaption>
    </figure>
  );
}

export default function DriverLandingPage() {
  const [channel, setChannel] = useState<DriverChannel>("screen");
  const selectedChannel =
    CHANNELS.find((item) => item.id === channel) ?? CHANNELS[0];

  return (
    <>
      <Head>
        <title>
          TAD Driver | Convierte tus viajes en oportunidades de ingresos
        </title>
        <meta
          name="description"
          content="Conoce TAD Driver: publicidad en una pantalla detrás del reposacabezas del copiloto y oportunidades por campañas elegibles, ventas aprobadas y referidos activados. Participación sujeta a aprobación y condiciones."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://tad.driver.ibusiness.com.do/" />
      </Head>
      <div className={styles.landing} lang="es-DO">
        <a className={styles.skipLink} href="#contenido">
          Saltar al contenido
        </a>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <a
              href="/"
              aria-label="TAD para taxistas, inicio"
              className={styles.brand}
            >
              <Image
                src="/tad-logo-dark-mode.svg"
                alt="TAD"
                width={144}
                height={48}
                priority
              />
              <span>PARA TAXISTAS</span>
            </a>
            <nav aria-label="Navegación principal" className={styles.nav}>
              <a href="#calculadora" className={styles.navSection}>
                Calcula tus oportunidades
              </a>
              <a href="#como-participar" className={styles.navSection}>
                Cómo participar
              </a>
              <a href="#preguntas" className={styles.navSection}>
                Preguntas
              </a>
              <details className={styles.mobileMenu}>
                <summary>Secciones</summary>
                <div>
                  <a
                    href="#calculadora"
                    onClick={(e) =>
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open")
                    }
                  >
                    Calcular oportunidades
                  </a>
                  <a
                    href="#como-participar"
                    onClick={(e) =>
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open")
                    }
                  >
                    Cómo participar
                  </a>
                  <a
                    href="#preguntas"
                    onClick={(e) =>
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open")
                    }
                  >
                    Preguntas frecuentes
                  </a>
                </div>
              </details>
              <a href="/driver/login" className={styles.login}>
                Ingresar <ArrowRight size={16} aria-hidden="true" />
              </a>
            </nav>
          </div>
        </header>

        <main id="contenido" tabIndex={-1}>
          <section
            className={`${styles.container} ${styles.hero}`}
            aria-labelledby="hero-title"
          >
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span aria-hidden="true" /> TAD · PUBLICIDAD EN MOVIMIENTO
              </p>
              <h1 id="hero-title">
                Convierte tus viajes
                <br />
                <span>en oportunidades de ingresos con TAD.</span>
              </h1>
              <p className={styles.heroDescription}>
                La pantalla TAD se instala detrás del reposacabezas del
                copiloto, frente a los pasajeros. Explora tres formas de obtener
                compensaciones: campañas elegibles, ventas publicitarias
                aprobadas y conductores referidos activados. Aplican condiciones
                y revisión.
              </p>
              <div className={styles.actions}>
                <a className={styles.primaryButton} href="#calculadora">
                  Calcula tus ingresos potenciales
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a
                  className={styles.textLink}
                  href={signupEnabled ? "#como-participar" : "#condiciones"}
                >
                  {signupEnabled
                    ? "Conoce cómo participar"
                    : "Ver las condiciones"}{" "}
                  <ArrowDown size={15} aria-hidden="true" />
                </a>
              </div>
              <p className={styles.heroNote}>
                <ShieldCheck size={15} aria-hidden="true" /> Incorporación e
                instalación sujetas a revisión, disponibilidad y condiciones del
                programa.
              </p>
            </div>
            <DriverHeroVisual />
            <div className={styles.heroExperience}>
              <ul
                className={styles.heroChannels}
                aria-label="Explora las tres oportunidades para conductores"
              >
                {CHANNELS.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={channel === item.id}
                      aria-controls="driver-channel-summary"
                      onClick={() => setChannel(item.id)}
                    >
                      <strong>{String(index + 1).padStart(2, "0")}</strong>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p
                id="driver-channel-summary"
                className={styles.channelDescription}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {selectedChannel.statement}
              </p>
              <DriverChannelJourney channel={channel} />
            </div>
          </section>

          <div className={styles.promiseBar}>
            <div className={styles.container}>
              <span>
                <MonitorPlay size={18} aria-hidden="true" /> Publicidad digital
                a bordo
              </span>
              <span>
                <CarFront size={18} aria-hidden="true" /> Una experiencia para
                taxistas
              </span>
              <span>
                <BadgeCheck size={18} aria-hidden="true" /> Condiciones claras
                desde el inicio
              </span>
            </div>
          </div>

          <section
            className={`${styles.container} ${styles.section}`}
            aria-labelledby="benefits-title"
          >
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>UNA FORMA DE CONECTAR</p>
              <h2 id="benefits-title">
                Tu taxi ya se mueve.
                <br />
                <span>Haz que cada ruta cuente.</span>
              </h2>
              <p>
                Conoce la propuesta, revisa los requisitos y decide si TAD
                encaja con la forma en que trabajas.
              </p>
            </div>
            <div className={styles.benefitGrid}>
              {benefits.map(({ icon: Icon, title, text }, index) => (
                <article className={styles.benefitCard} key={title}>
                  <div className={styles.cardTop}>
                    <span className={styles.iconTile}>
                      <Icon size={24} aria-hidden="true" />
                    </span>
                    <span className={styles.cardNumber}>0{index + 1}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <DriverEarningsLab signupEnabled={signupEnabled} />

          <section
            id="como-participar"
            className={`${styles.processSection} ${styles.anchor}`}
            aria-labelledby="process-title"
          >
            <div className={`${styles.container} ${styles.processLayout}`}>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>EL SIGUIENTE PASO, CLARO</p>
                <h2 id="process-title">
                  Así empieza
                  <br />
                  tu recorrido con TAD.
                </h2>
                <p>
                  Primero conoce la propuesta. Después, decide si quieres
                  solicitar tu incorporación.
                </p>
                <a className={styles.textLink} href="#condiciones">
                  Qué necesitas preparar{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
              <ol className={styles.steps}>
                {steps.map((step) => (
                  <li key={step.number}>
                    <span className={styles.stepNumber} aria-hidden="true">
                      {step.number}
                    </span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section
            id="condiciones"
            className={`${styles.container} ${styles.section} ${styles.anchor}`}
            aria-labelledby="requirements-title"
          >
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>ANTES DE EMPEZAR</p>
              <h2 id="requirements-title">
                Lo que necesitas saber.
                <br />
                <span>Desde el principio.</span>
              </h2>
            </div>
            <div className={styles.requirementsGrid}>
              <div className={styles.requirementsCard}>
                <h3>
                  <ClipboardCheck size={22} aria-hidden="true" /> Prepara tu
                  información
                </h3>
                <ul className={styles.requirementsList}>
                  <li>
                    <UserRound size={19} aria-hidden="true" />
                    <div>
                      <strong>Identidad y contacto</strong>
                      <p>
                        Tu nombre completo y un teléfono donde puedan
                        contactarte.
                      </p>
                    </div>
                  </li>
                  <li>
                    <CarFront size={19} aria-hidden="true" />
                    <div>
                      <strong>Datos del vehículo</strong>
                      <p>Modelo y placa del taxi que deseas incorporar.</p>
                    </div>
                  </li>
                  <li>
                    <FileText size={19} aria-hidden="true" />
                    <div>
                      <strong>Revisión de condiciones</strong>
                      <p>
                        Lee los términos y confirma las responsabilidades y
                        condiciones aplicables antes de aceptar.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              <aside
                className={styles.conditionsCard}
                aria-labelledby="conditions-title"
              >
                <span className={styles.smallLabel}>
                  <CircleHelp size={17} aria-hidden="true" /> PARA DECIDIR CON
                  CLARIDAD
                </span>
                <h3 id="conditions-title">
                  La solicitud es el inicio,
                  <br />
                  la aprobación es otro paso.
                </h3>
                <p>
                  El registro no activa tu cuenta ni confirma la instalación de
                  una pantalla. La incorporación está sujeta a aprobación y a
                  las condiciones de pago aplicables.
                </p>
                <ul className={styles.conditionsList}>
                  <li>
                    <Check size={17} aria-hidden="true" /> Confirma costos,
                    pagos y responsabilidades.
                  </li>
                  <li>
                    <Check size={17} aria-hidden="true" /> Consulta
                    disponibilidad para tu vehículo y zona.
                  </li>
                  <li>
                    <Check size={17} aria-hidden="true" /> No hay ingresos ni
                    campañas garantizados.
                  </li>
                </ul>
                <a href="/aviso-legal" className={styles.textLink}>
                  Consultar aviso legal{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </aside>
            </div>
          </section>

          <section
            id="preguntas"
            className={`${styles.container} ${styles.faqSection} ${styles.anchor}`}
            aria-labelledby="faq-title"
          >
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>HABLEMOS CLARO</p>
              <h2 id="faq-title">
                Preguntas
                <br />
                del camino.
              </h2>
              <p>
                Las respuestas para entender la propuesta y lo que viene
                después.
              </p>
            </div>
            <div className={styles.faqList}>
              {questions.map(({ question, answer }) => (
                <details key={question} className={styles.faqItem}>
                  <summary>
                    {question}
                    <ChevronDown size={20} aria-hidden="true" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section
            className={`${styles.container} ${styles.closingSection}`}
            aria-labelledby="closing-title"
          >
            <div className={styles.closingCard}>
              <p className={styles.eyebrow}>TU PRÓXIMO RECORRIDO</p>
              <h2 id="closing-title">
                Conoce la propuesta.
                <br />
                <span>Decide tu próximo paso.</span>
              </h2>
              <p>
                {signupEnabled
                  ? "Solicita tu registro y espera la revisión de tu perfil. La participación requiere aprobación y las condiciones aplicables."
                  : "Por ahora, explora el proceso y las condiciones. Si ya formas parte de TAD, tu portal de conductor está aquí."}
              </p>
              <div className={styles.actions}>
                <a
                  className={styles.primaryButton}
                  href={signupEnabled ? "/register" : "#como-participar"}
                >
                  {signupEnabled
                    ? "Solicitar registro"
                    : "Conoce cómo participar"}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a href="/driver/login" className={styles.secondaryButton}>
                  Ya tengo cuenta
                </a>
              </div>
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={`${styles.container} ${styles.footerInner}`}>
            <div>
              <strong>
                TAD<span> PARA TAXISTAS</span>
              </strong>
              <p>Publicidad digital. Conexiones en movimiento.</p>
            </div>
            <nav aria-label="Enlaces legales">
              <a href="/aviso-legal">Aviso legal</a>
              <a href="/politica-de-cookies">Política de cookies</a>
              <a href="/politica-de-privacidad">Privacidad</a>
              <a href="/terminos-de-servicio">Términos</a>
              <a href="/driver/login">Portal de conductor</a>
              <a href="https://tad.anunciante.ibusiness.com.do/">
                Soy anunciante
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
