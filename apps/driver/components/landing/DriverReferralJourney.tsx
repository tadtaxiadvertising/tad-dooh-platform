"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Gift,
  Link2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { TextMorph } from "../../../../packages/ui/components/TextMorph";
import styles from "./driver-referral-journey.module.css";

const steps = [
  {
    title: "Compartir",
    icon: Link2,
    condition: "La invitación abre el recorrido; no genera un bono.",
    detail:
      "Conoce el programa y sus condiciones antes de invitar a otro conductor por el canal oficial. Este recorrido es una demostración: no comparte mensajes ni crea enlaces de referido.",
  },
  {
    title: "Registro",
    icon: UserRound,
    condition: "Enviar la solicitud deja el perfil pendiente de revisión.",
    detail:
      "El conductor completa su propia solicitud por el canal habilitado. Registrarse no significa tener la cuenta aprobada, la pantalla instalada ni un bono disponible.",
  },
  {
    title: "Validación",
    icon: ShieldCheck,
    condition: "Se revisan el perfil, el vehículo y los requisitos aplicables.",
    detail:
      "La información y la elegibilidad deben verificarse. El ejemplo continúa para explicar el proceso; avanzar aquí no aprueba una solicitud real ni sustituye la revisión.",
  },
  {
    title: "Activación",
    icon: CarFront,
    condition: "La activación debe ser elegible y quedar aprobada.",
    detail:
      "El referido necesita completar la activación y las condiciones del programa. La instalación por sí sola o un estado pendiente no confirman que el hito sea elegible para un bono.",
  },
  {
    title: "Bono",
    icon: Gift,
    condition:
      "Solo el hito elegible aprobado permite un bono de ejemplo, una vez.",
    detail:
      "RD$500 es el ejemplo educativo por un conductor referido con activación elegible y aprobada. Depende del contrato y la validación del evento; esta demo no acredita saldo ni confirma un pago.",
  },
];

export default function DriverReferralJourney({
  signupEnabled,
}: {
  signupEnabled: boolean;
}) {
  const [step, setStep] = useState(0);
  const selected = steps[step];
  const Icon = selected.icon;

  return (
    <section
      id="driver-referral"
      className={styles.section}
      aria-labelledby="driver-referral-title"
      data-referral-journey
      data-step={step}
    >
      <div className={styles.inner}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>UN REFERIDO, PASO A PASO</p>
          <h2 id="driver-referral-title">
            Compartir es el inicio.
            <br />
            <span>La activación tiene condiciones.</span>
          </h2>
          <p>
            Recorre las cinco etapas para entender cuándo un referido puede ser
            elegible. Puedes avanzar, volver o elegir un paso; nada aquí
            modifica una cuenta real.
          </p>
        </div>
        <div className={styles.layout}>
          <ol className={styles.steps} aria-label="Etapas del referido">
            {steps.map(({ title, condition }, index) => (
              <li key={title}>
                <button
                  type="button"
                  aria-pressed={step === index}
                  aria-current={step === index ? "step" : undefined}
                  aria-controls="driver-referral-detail"
                  onClick={() => setStep(index)}
                >
                  <span className={styles.number} aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{condition}</small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          <div id="driver-referral-detail" className={styles.card}>
            <div className={styles.cardTop}>
              <span>RECORRIDO ILUSTRATIVO</span>
              <span>Paso {step + 1} de 5</span>
            </div>
            <svg
              className={styles.route}
              viewBox="0 0 400 100"
              role="img"
              aria-label={`Etapa ${step + 1} de 5: ${selected.title}`}
            >
              <path
                d="M30 50h340"
                fill="none"
                stroke="#414e42"
                strokeWidth="3"
              />
              <path
                className={styles.progress}
                d="M30 50h340"
                pathLength="1"
                fill="none"
                stroke="#FFD400"
                strokeWidth="3"
                strokeDasharray="1"
                strokeDashoffset={1 - step / 4}
              />
              {steps.map(({ title }, index) => (
                <g key={title}>
                  <circle
                    cx={30 + index * 85}
                    cy="50"
                    r={step === index ? 18 : 12}
                    fill={index <= step ? "#FFD400" : "#202c23"}
                    stroke={index <= step ? "#FFD400" : "#657165"}
                  />
                  <text
                    x={30 + index * 85}
                    y="54"
                    textAnchor="middle"
                    fill={index <= step ? "#162014" : "#D1DACE"}
                    fontSize="12"
                    fontFamily="Arial, sans-serif"
                    fontWeight="700"
                  >
                    {index + 1}
                  </text>
                </g>
              ))}
            </svg>
            <div className={styles.stageIcon}>
              <Icon size={28} aria-hidden="true" />
            </div>
            <h3>
              <TextMorph>{selected.title}</TextMorph>
            </h3>
            <p className={styles.detail} aria-live="polite" aria-atomic="true">
              {selected.detail}
            </p>
            <div className={styles.outcome} data-eligible={step === 4}>
              <span>
                {step === 4
                  ? "EJEMPLO CONDICIONADO"
                  : "ANTES DEL HITO APROBADO"}
              </span>
              <strong>
                {step === 4 ? "RD$500 · una vez" : "Aún sin bono"}
              </strong>
              <p>
                {step === 4
                  ? "Activación elegible + aprobación. No es saldo ni pago confirmado."
                  : "El registro y los estados pendientes no generan este bono."}
              </p>
            </div>
            <div
              className={styles.navigation}
              role="group"
              aria-label="Avanzar o volver en el recorrido del referido"
            >
              <button
                type="button"
                aria-label="Paso anterior del referido"
                aria-disabled={step === 0}
                onClick={() => setStep((value) => Math.max(0, value - 1))}
              >
                <ArrowLeft size={18} aria-hidden="true" /> Anterior
              </button>
              <button
                type="button"
                aria-label="Paso siguiente del referido"
                aria-disabled={step === steps.length - 1}
                onClick={() =>
                  setStep((value) => Math.min(steps.length - 1, value + 1))
                }
              >
                Siguiente <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
            <a
              href={signupEnabled ? "/register" : "#como-participar"}
              className={styles.link}
            >
              {signupEnabled
                ? "Consultar el registro oficial"
                : "Consulta cómo participar"}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
