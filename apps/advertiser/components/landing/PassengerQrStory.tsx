"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Hotel,
  House,
  QrCode,
  ScanLine,
  ShoppingBag,
  Smartphone,
  Utensils,
  Wrench,
} from "lucide-react";
import styles from "./passenger-qr-story.module.css";

const examples = {
  restaurante: {
    label: "Restaurante",
    icon: Utensils,
    business: "TU RESTAURANTE",
    tablet: "Tu próxima parada tiene mucho sabor.",
    action: "VER EL MENÚ",
    mobile: "Descubre nuestro menú",
    mobileCopy: "Explora platos y promociones desde tu celular.",
  },
  comercio: {
    label: "Comercio",
    icon: ShoppingBag,
    business: "TU TIENDA",
    tablet: "Descubre algo especial cerca de ti.",
    action: "VER PRODUCTOS",
    mobile: "Encuentra tu favorito",
    mobileCopy: "Explora el catálogo y las novedades de la tienda.",
  },
  evento: {
    label: "Evento",
    icon: CalendarDays,
    business: "TU EVENTO",
    tablet: "Tu próximo plan empieza aquí.",
    action: "CONOCER EL EVENTO",
    mobile: "Un plan para recordar",
    mobileCopy: "Conoce la programación y los detalles del evento.",
  },
  inmobiliaria: {
    label: "Inmobiliaria",
    icon: House,
    business: "TU INMOBILIARIA",
    tablet: "Imagina tu próximo hogar.",
    action: "VER PROPIEDADES",
    mobile: "Explora propiedades",
    mobileCopy: "Descubre opciones y detalles de cada espacio.",
  },
  hotel: {
    label: "Hotel",
    icon: Hotel,
    business: "TU HOTEL",
    tablet: "Tu próxima escapada comienza aquí.",
    action: "VER EXPERIENCIAS",
    mobile: "Descubre tu estancia",
    mobileCopy: "Explora habitaciones y experiencias del hotel.",
  },
  servicios: {
    label: "Servicios",
    icon: Wrench,
    business: "TU NEGOCIO",
    tablet: "Soluciones cerca de ti.",
    action: "VER SERVICIOS",
    mobile: "Conoce nuestros servicios",
    mobileCopy: "Explora las opciones y cómo solicitar información.",
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
  const [scanned, setScanned] = useState(false);
  const example = examples[selected];
  const SectorIcon = example.icon;
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
              onClick={() => {
                setSelected(key);
                setScanned(false);
              }}
            >
              {examples[key].label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.activeCaption} aria-live="polite" aria-atomic="true">
        Ejemplo seleccionado: {example.label}.{" "}
        {scanned
          ? "Escaneo simulado: oferta abierta en el celular de ejemplo."
          : "Listo para simular el escaneo."}
      </p>

      <div
        className={styles.visual}
        data-promotion={selected}
        data-scanned={scanned}
      >
        <div className={styles.scene}>
          <div className={styles.sceneLabel}>01 / PANTALLA EN EL TAXI</div>
          <div className={styles.headrest} aria-hidden="true" />
          <div className={styles.tablet}>
            <div className={styles.ad} data-qr-creative>
              <small>TAD · CREATIVIDAD DE EJEMPLO</small>
              <div className={styles.adIdentity}>
                <span className={styles.brand}>{displayBrand}</span>
                <SectorIcon size={23} aria-hidden="true" />
              </div>
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
              <span className={styles.cameraHint}>
                {scanned ? "Escaneo simulado" : "Código ilustrativo"}
              </span>
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
            <div className={styles.destination} id="qr-demo-destination">
              <small>{displayBrand} · DEMO</small>
              <span className={styles.offerIcon}>
                {scanned ? (
                  <SectorIcon size={26} aria-hidden="true" />
                ) : (
                  <Smartphone size={26} aria-hidden="true" />
                )}
              </span>
              <strong>
                {scanned ? example.mobile : "Tu oferta, a un escaneo"}
              </strong>
              <p>
                {scanned
                  ? example.mobileCopy
                  : "Simula el escaneo para descubrir la promoción."}
              </p>
              {scanned && (
                <span className={styles.offerLabel}>
                  {example.action} · DEMO
                </span>
              )}
            </div>
          </div>
          <p>
            {scanned
              ? "La promoción se abre en esta demostración."
              : "El destino espera al pasajero."}
          </p>
        </div>
      </div>

      <div className={styles.scanActions}>
        <button
          type="button"
          className={styles.scanButton}
          aria-controls="qr-demo-destination"
          onClick={() => setScanned((current) => !current)}
        >
          <ScanLine size={18} aria-hidden="true" />
          {scanned ? "Reiniciar demostración" : "Simular escaneo del QR"}
        </button>
        <p>Prueba local: no requiere cámara ni envía datos.</p>
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
        Simulación, no una campaña activa: los símbolos QR no son escaneables y
        el escaneo simulado no abre enlaces ni registra actividad. Un escaneo
        real no equivale a una venta. La disponibilidad de destinos QR y sus
        métricas depende de la configuración y validación de la campaña.
      </p>
      <a href="#experiencia" className={styles.cta}>
        Simula tu campaña <ArrowRight size={18} aria-hidden="true" />
      </a>
    </section>
  );
}
