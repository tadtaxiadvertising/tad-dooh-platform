import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
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
    text: "Una pantalla TAD orientada a tus pasajeros conecta tu taxi con campañas publicitarias, según disponibilidad, revisión y condiciones del programa.",
  },
  {
    icon: MonitorPlay,
    title: "Oportunidades que se adaptan a tu ruta",
    text: "Conoce las opciones de compensación por pantalla, ventas aprobadas y referidos activados antes de decidir cómo quieres participar.",
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
    statement: "Pantalla: campañas elegibles en el vehículo, sujetas a validación y condiciones de operación.",
    cardEyebrow: "PUBLICIDAD A BORDO",
    cardTitle: "Tu taxi, conectado.",
    cardNote: "Una pantalla para mensajes aprobados.",
  },
  {
    id: "sales",
    label: "Ventas",
    statement: "Ventas: las comisiones corresponden a publicidad efectivamente aprobada, no a simples solicitudes.",
    cardEyebrow: "CONEXIONES COMERCIALES",
    cardTitle: "Conecta marcas con rutas.",
    cardNote: "Las ventas requieren revisión y aprobación.",
  },
  {
    id: "referrals",
    label: "Referidos",
    statement: "Referidos: el bono es único y depende de la activación y aprobación del conductor referido.",
    cardEyebrow: "RED DE CONDUCTORES",
    cardTitle: "Comparte el recorrido.",
    cardNote: "El registro por sí solo no genera un bono.",
  },
] as const;

type DriverChannel = (typeof CHANNELS)[number]["id"];

const DRIVER_HERO_IMAGE = "data:image/webp;base64,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";

function DriverHeroVisual() {
  return (
    <figure className={styles.heroVisual}>
      <div className={styles.heroVisualFrame}>
        <Image
          src={DRIVER_HERO_IMAGE}
          alt="Taxi TAD con una pantalla publicitaria visible detrás del reposacabezas del pasajero"
          width={520}
          height={780}
          priority
          sizes="(max-width: 580px) 86vw, (max-width: 800px) 320px, 400px"
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
        <title>TAD Driver | Haz que cada viaje cuente</title>
        <meta
          name="description"
          content="Conoce TAD Driver: una pantalla a bordo conecta tu taxi con campañas publicitarias. La participación y las oportunidades están sujetas a aprobación y condiciones."
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
                Cada viaje puede abrir
                <br />
                <span>una nueva oportunidad con TAD.</span>
              </h1>
              <p className={styles.heroDescription}>
                Una pantalla TAD orientada a tus pasajeros muestra campañas mientras realizas
                tu ruta. Si tu solicitud es aprobada, podrás conocer oportunidades de
                compensación y las condiciones de participación antes de empezar.
              </p>
              <div className={styles.actions}>
                <a className={styles.primaryButton} href="#calculadora">
                  Explora tu potencial con TAD
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
                <ShieldCheck size={15} aria-hidden="true" /> Incorporación e instalación
                sujetas a revisión, disponibilidad y condiciones del programa.
              </p>
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
            </div>
            <DriverHeroVisual />
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
                Conoce la propuesta, revisa los requisitos y decide si TAD encaja
                con la forma en que trabajas.
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
