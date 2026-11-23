import { ArrowRight, CheckCircle2, QrCode, Smartphone, ScanLine } from "lucide-react";
import styles from "./passenger-qr-story.module.css";

const steps = [
  {
    number: "01",
    heading: "El pasajero descubre tu promoción",
    copy: "Durante el recorrido, una creatividad aparece en la pantalla TAD instalada detrás del reposacabezas del copiloto.",
  },
  {
    number: "02",
    heading: "Escanea el QR desde su celular",
    copy: "Si la campaña incluye un QR, el pasajero puede abrir voluntariamente la cámara y escanearlo sin descargar una app.",
  },
  {
    number: "03",
    heading: "Explora tu oferta en su pantalla",
    copy: "El enlace puede llevar a una promoción, menú, catálogo o página de destino adaptada a móviles.",
  },
] as const;

export default function PassengerQrStory() {
  return (
    <section className={styles.section} id="interaccion-qr" aria-labelledby="qr-story-title">
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>DEL TAXI AL CELULAR · EXPERIENCIA INTERACTIVA</p>
          <h2 id="qr-story-title">Un anuncio que se ve. <span>Una oferta que se explora.</span></h2>
        </div>
        <p>Tu mensaje no tiene que terminar cuando el pasajero baja del taxi. Un código QR puede conectar la creatividad de la tablet con una experiencia móvil de tu marca.</p>
      </div>

      <div className={styles.visual} role="img" aria-label="Ilustración conceptual: una promoción aparece en la tablet detrás del asiento del copiloto, el pasajero escanea un código QR con su celular y abre una oferta móvil.">
        <div className={styles.scene}>
          <div className={styles.sceneLabel}>01 / PANTALLA EN EL TAXI</div>
          <div className={styles.headrest} aria-hidden="true" />
          <div className={styles.tablet}>
            <div className={styles.ad}>
              <small>PUBLICIDAD DE EJEMPLO · TAD</small>
              <strong>Tu próxima parada merece algo especial.</strong>
              <div className={styles.offerRow}><span>DESCUBRE LA OFERTA</span><QrCode size={42} strokeWidth={1.8} aria-hidden="true" /></div>
            </div>
          </div>
          <p>La promoción aparece frente al pasajero.</p>
        </div>
        <div className={styles.connector} aria-hidden="true"><ScanLine size={30}/><ArrowRight size={28}/></div>
        <div className={styles.scene}>
          <div className={styles.sceneLabel}>02 / ESCANEO VOLUNTARIO</div>
          <div className={styles.phone}>
            <div className={styles.speaker} />
            <div className={styles.camera}>
              <span className={styles.scanCorner}><QrCode size={72} strokeWidth={1.3} aria-hidden="true" /></span>
              <small>Apunta al código QR</small>
            </div>
          </div>
          <p>El celular abre el enlace de la campaña.</p>
        </div>
        <div className={styles.connector} aria-hidden="true"><ArrowRight size={28}/></div>
        <div className={styles.scene}>
          <div className={styles.sceneLabel}>03 / EXPERIENCIA DE MARCA</div>
          <div className={styles.phone}>
            <div className={styles.speaker} />
            <div className={styles.destination}>
              <small>MI MARCA · DEMO</small>
              <span className={styles.offerIcon}><Smartphone size={26} aria-hidden="true" /></span>
              <strong>¡Tu oferta te espera!</strong>
              <p>Descubre más en nuestra página.</p>
              <span className={styles.fakeButton}>EXPLORAR PROMOCIÓN <ArrowRight size={13}/></span>
            </div>
          </div>
          <p>El pasajero decide si continúa.</p>
        </div>
      </div>

      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.number}>
            <span className={styles.number}>{step.number}</span>
            <div><h3>{step.heading}</h3><p>{step.copy}</p></div>
            <CheckCircle2 size={19} aria-hidden="true"/>
          </li>
        ))}
      </ol>
      <p className={styles.disclaimer}>Representación ilustrativa, no una campaña activa. El QR, el destino móvil y la medición dependen de la configuración y validación de cada campaña. Un escaneo no equivale a una compra ni garantiza resultados. Los códigos aquí mostrados son gráficos de ejemplo y no son escaneables.</p>
      <a href="#experiencia" className={styles.cta}>Imagina tu campaña <ArrowRight size={18} aria-hidden="true"/></a>
    </section>
  );
}
