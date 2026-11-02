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
import DriverTaxiDemo from "./DriverTaxiDemo";
import DriverReferralJourney from "./DriverReferralJourney";

const signupEnabled = process.env.NEXT_PUBLIC_LANDING_SIGNUP_ENABLED === "true";

const benefits = [
  {
    icon: CarFront,
    title: "Publicidad que va contigo",
    text: "Conoce una forma de incorporar publicidad digital a bordo de tu taxi, sujeta a evaluación del vehículo y disponibilidad.",
  },
  {
    icon: MonitorPlay,
    title: "Un espacio para tu operación",
    text: "Al tener una cuenta aprobada, accede al portal de conductor para consultar las herramientas habilitadas para tu perfil.",
  },
  {
    icon: ShieldCheck,
    title: "Las condiciones, por delante",
    text: "Revisa los requisitos, el proceso de aprobación y las condiciones económicas antes de decidir si quieres participar.",
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
      "Puedes obtener compensaciones por anuncios elegibles reproducidos en tu pantalla (hasta 15), comisiones por ventas publicitarias aprobadas y bonos de RD$500 por conductores referidos que cumplan la activación. El simulador separa los importes de ejemplo; no son saldo ni pagos prometidos.",
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

export default function DriverLandingPage() {
  return (
    <>
      <Head>
        <title>TAD para taxistas | Conoce cómo participar</title>
        <meta
          name="description"
          content="Conoce TAD para taxistas: publicidad digital a bordo, requisitos de incorporación, proceso de revisión y acceso al portal de conductor. Consulta las condiciones antes de participar."
        />
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
                Tu taxi.
                <br />
                <span>Tres oportunidades.</span>
              </h1>
              <p className={styles.heroDescription}>
                Publicidad a bordo, ventas aprobadas y conductores referidos.
                Explora cada vía y sus condiciones.
              </p>
              <div className={styles.actions}>
                <a className={styles.primaryButton} href="#calculadora">
                  Probar mis ganancias
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
                <ShieldCheck size={15} aria-hidden="true" /> Incorporación
                sujeta a revisión y disponibilidad.
              </p>
            </div>
            <DriverTaxiDemo />
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
                Tu taxi puede ser parte
                <br />
                de algo más.
              </h2>
              <p>
                Una propuesta de publicidad pensada para el espacio a bordo. Tú
                decides con información, antes de dar el siguiente paso.
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
          <DriverReferralJourney signupEnabled={signupEnabled} />

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
