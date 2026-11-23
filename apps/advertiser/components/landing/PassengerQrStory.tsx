"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  QrCode,
  ScanLine,
  Smartphone,
} from "lucide-react";
import styles from "./passenger-qr-story.module.css";

const examples = {
  restaurante: {
    label: "Restaurante",
    business: "TU RESTAURANTE",
    tablet: "Tu próxima parada tiene mucho sabor.",
    action: "VER EL MENÚ",
    mobile: "Descubre nuestro menú",
    mobileCopy: "Explora platos y promociones desde tu celular.",
  },
  comercio: {
    label: "Comercio",
    business: "TU TIENDA",
    tablet: "Descubre algo especial cerca de ti.",
    action: "VER PRODUCTOS",
    mobile: "Encuentra tu favorito",
    mobileCopy: "Explora el catálogo y las novedades de la tienda.",
  },
  evento: {
    label: "Evento",
    business: "TU EVENTO",
    tablet: "Tu próximo plan empieza aquí.",
    action: "CONOCER EL EVENTO",
    mobile: "Un plan para recordar",
    mobileCopy: "Conoce la programación y los detalles del evento.",
  },
} as const;

type Example = keyof typeof examples;
type Props = { brandName?: string };

const steps = [
  {
    number: "01",
    heading: "El pasajero descubre la promoción",
    copy: "La creatividad aparece en la pantalla TAD detrás del reposacabezas del copiloto, orientada hacia los pasajeros.",
  },
  {
    number: "02",
    heading: "Decide escanear el QR",
    copy: "Si la campaña incorpora un código QR válido, el pasajero puede escanearlo voluntariamente con la cámara de su celular.",
  },
  {
    number: "03",
    heading: "Explora la oferta de la marca",
    copy: "El enlace puede abrir un menú, catálogo, promoción o página móvil. La visita no implica una compra garantizada.",
  },
] as const;

export default function PassengerQrStory({ brandName = "" }: Props) {
  const [selected, setSelected] = useState<Example>("restaurante");
  const example = examples[selected];
  // The brand preview remains browser-local; it is never sent to analytics or the API.
  const displayBrand =
    brandName.trim().replace(/\s+/g, " ").slice(0, 24) || example.business;

  return (
    <section
      className={styles.section}
      id="interaccion-qr"
      aria-labelledby="qr-story-title"
    >
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>
            DEL TAXI AL CELULAR · EXPERIENCIA INTERACTIVA
          </p>
          <h2 id="qr-story-title">
            Un anuncio que se ve. <span>Una oferta que se explora.</span>
          </h2>
          <p className={styles.lead}>
            Tu publicidad puede ir más allá de la pantalla. Un código QR
            vinculado a la campaña permite que los pasajeros interesados
            descubran una promoción directamente desde sus celulares.
          </p>
        </div>
        <figure className={styles.editorial}>
          <img
            src="/qr-passenger-journey.svg"
            width={1024}
            height={576}
            loading="lazy"
            decoding="async"
            alt="Ilustración del interior de un taxi: un pasajero apunta su celular a la promoción TAD mostrada detrás del reposacabezas del copiloto."
          />
          <figcaption>
            Así puede comenzar una interacción con tu marca. Imagen conceptual.
          </figcaption>
        </figure>
      </div>

      <div className={styles.demoControls}>
        <div>
          <p className={styles.eyebrow}>PRUEBA LA EXPERIENCIA</p>
          <h3>Elige una promoción de ejemplo</h3>
        </div>
        <div
          className={styles.choices}
          role="group"
          aria-label="Tipo de promoción ilustrativa"
        >
          {(Object.keys(examples) as Example[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={selected === key}
              onClick={() => setSelected(key)}
            >
              {examples[key].label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.activeCaption} aria-live="polite" aria-atomic="true">
        Ejemplo seleccionado: {example.label}. Vista ilustrativa, sin enlace
        activo.
      </p>

      <div className={styles.visual} data-promotion={selected}>
        <div className={styles.scene}>
          <div className={styles.sceneLabel}>01 / PANTALLA EN EL TAXI</div>
          <div className={styles.headrest} aria-hidden="true" />
          <div className={styles.tablet}>
            <div className={styles.ad}>
              <small>TAD · CREATIVIDAD DE EJEMPLO</small>
              <span className={styles.brand}>{displayBrand}</span>
              <strong>{example.tablet}</strong>
              <div className={styles.offerRow}>
                <span>{example.action}</span>
                <span
                  className={styles.qrMark}
                  role="img"
                  aria-label="Símbolo QR decorativo, no escaneable"
                >
                  <QrCode size={38} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
          <p>Tu creatividad frente al pasajero.</p>
        </div>
        <div className={styles.connector} aria-hidden="true">
          <ScanLine size={27} />
          <ArrowRight size={27} />
        </div>
        <div className={styles.scene}>
          <div className={styles.sceneLabel}>02 / ESCANEO VOLUNTARIO</div>
          <div className={styles.phone}>
            <div className={styles.speaker} aria-hidden="true" />
            <div className={styles.camera}>
              <span className={styles.scanCorner}>
                <QrCode size={72} strokeWidth={1.2} aria-hidden="true" />
              </span>
              <small>Cámara del pasajero</small>
              <span className={styles.cameraHint}>Código ilustrativo</span>
            </div>
          </div>
          <p>Escanea solo si le interesa.</p>
        </div>
        <div className={styles.connector} aria-hidden="true">
          <ArrowRight size={27} />
        </div>
        <div className={styles.scene}>
          <div className={styles.sceneLabel}>03 / DESTINO MÓVIL</div>
          <div className={styles.phone}>
            <div className={styles.speaker} aria-hidden="true" />
            <div className={styles.destination}>
              <small>{displayBrand} · DEMO</small>
              <span className={styles.offerIcon}>
                <Smartphone size={26} aria-hidden="true" />
              </span>
              <strong>{example.mobile}</strong>
              <p>{example.mobileCopy}</p>
              <span
                className={styles.fakeButton}
                aria-label="Ejemplo visual de un botón, no interactivo"
              >
                {example.action}
                <ArrowRight size={13} aria-hidden="true" />
              </span>
            </div>
          </div>
          <p>La marca recibe una visita potencial.</p>
        </div>
      </div>

      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.number}>
            <span className={styles.number}>{step.number}</span>
            <div>
              <h3>{step.heading}</h3>
              <p>{step.copy}</p>
            </div>
            <CheckCircle2 size={19} aria-hidden="true" />
          </li>
        ))}
      </ol>
      <p className={styles.disclaimer}>
        Simulación, no una campaña activa: los símbolos QR no son escaneables,
        los botones del celular no navegan y no hay seguimiento de pasajeros.
        Un escaneo no equivale a una venta. La disponibilidad de destinos QR y
        sus métricas depende de la configuración y validación de la campaña.
      </p>
      <a href="#experiencia" className={styles.cta}>
        Simula tu campaña <ArrowRight size={18} aria-hidden="true" />
      </a>
    </section>
  );
}
