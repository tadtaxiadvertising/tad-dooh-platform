"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  ClipboardList,
  Monitor,
  Play,
  ShieldCheck,
} from "lucide-react";
import styles from "./campaign-journey.module.css";

type JourneyStep = "campaign" | "screen" | "playback" | "report";

type CampaignJourneyProps = {
  onStepView?: (step: JourneyStep) => void;
};

const STEPS = [
  {
    id: "campaign",
    title: "Crear",
    summary: "Define el contenido y los objetivos antes de salir a la calle.",
    detail:
      "La planificación reúne la creatividad, las condiciones y la selección de pantallas. El contenido y la disponibilidad se revisan en el proceso oficial del portal.",
    question: "¿Qué se decide aquí?",
    answer: "Qué comunicar y cómo preparar la campaña para su revisión.",
    sceneLabel: "Creatividad de ejemplo",
    sceneTitle: "Tu próxima idea, en movimiento.",
    sceneDetail: "Ejemplo TAD · sin campaña contratada",
    icon: ClipboardList,
  },
  {
    id: "screen",
    title: "Programar",
    summary: "Da contexto a las pantallas y a la duración de tu idea.",
    detail:
      "La planificación relaciona pantallas, duración y contenido aprobado. La programación y la disponibilidad se confirman en el proceso comercial y en el portal autorizado.",
    question: "¿La demo reserva fechas o pantallas?",
    answer:
      "No. El calendario es una ilustración del proceso. No consulta disponibilidad ni crea una reserva.",
    sceneLabel: "Planificación ilustrativa",
    sceneTitle: "Cada idea necesita su momento.",
    sceneDetail: "Calendario conceptual · sin reserva",
    icon: Monitor,
  },
  {
    id: "playback",
    title: "Reproducir",
    summary: "La actividad registrada pasa por validaciones.",
    detail:
      "El reproductor registra eventos de reproducción para su sincronización y validación. Una reproducción y una impresión estimada representan medidas distintas; ninguna garantiza una venta.",
    question: "¿Y si no hay conexión?",
    answer:
      "Los eventos locales pueden enviarse al recuperar la red. La demo no confirma entrega, aceptación ni actividad real.",
    sceneLabel: "Reproducción de ejemplo",
    sceneTitle: "Reproducir es un paso. Verificar, otro.",
    sceneDetail: "Secuencia didáctica · sin evento enviado",
    icon: Play,
  },
  {
    id: "report",
    title: "Medir",
    summary: "Consulta actividad y estimaciones con sus límites claros.",
    detail:
      "El portal autorizado permite revisar la información de la campaña. Los registros validados y las estimaciones se interpretan con su metodología; el reporte no equivale a alcance único ni retorno garantizado.",
    question: "¿Qué muestra esta demo?",
    answer:
      "El recorrido conceptual de una campaña. Tus datos y resultados reales pertenecen al portal privado.",
    sceneLabel: "Reporte ilustrativo",
    sceneTitle: "Más contexto para tu próxima decisión.",
    sceneDetail: "Sin resultados ni métricas de una campaña real",
    icon: ChartNoAxesCombined,
  },
] as const;

export default function CampaignJourney({ onStepView }: CampaignJourneyProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  const activeStepRef = useRef(0);
  const stepButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const uniqueId = useId();
  const current = STEPS[activeStep];
  const CurrentIcon = current.icon;
  const detailId = `${uniqueId}-detail`;

  const selectStep = (index: number, focus = false) => {
    if (index < 0 || index >= STEPS.length) return;
    if (focus) stepButtons.current[index]?.focus();
    if (activeStepRef.current === index) return;
    setDirection(index > activeStepRef.current ? 1 : -1);
    setHasInteracted(true);
    activeStepRef.current = index;
    setActiveStep(index);
    onStepView?.(STEPS[index].id);
  };

  const navigateSteps = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % STEPS.length
        : event.key === "ArrowLeft"
          ? (index + STEPS.length - 1) % STEPS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? STEPS.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    selectStep(next, true);
  };

  return (
    <section
      id="recorrido-campana"
      className={styles.journey}
      aria-labelledby={`${uniqueId}-title`}
      data-motion={hasInteracted && reduceMotion === false}
      data-direction={direction}
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>02 / UNA IDEA. CUATRO HITOS.</p>
          <h2 id={`${uniqueId}-title`} className={styles.title}>
            Así se mueve
            <br />
            <span>una campaña.</span>
          </h2>
        </div>
        <p className={styles.introduction}>
          Explora qué sucede entre planificar una campaña y entender su
          actividad. Tú eliges el paso.
        </p>
      </div>

      <ol className={styles.steps} aria-label="Pasos de una campaña">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.id}>
              <button
                ref={(element) => {
                  stepButtons.current[index] = element;
                }}
                type="button"
                aria-pressed={activeStep === index}
                aria-current={activeStep === index ? "step" : undefined}
                aria-controls={detailId}
                onClick={() => selectStep(index)}
                onKeyDown={(event) => navigateSteps(event, index)}
                className={styles.step}
              >
                <span className={styles.stepTop}>
                  <span>Paso {index + 1}</span>
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span className={styles.stepTitle}>{step.title}</span>
                <span className={styles.stepSummary}>{step.summary}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Recorrido de campaña"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={activeStep + 1}
        aria-valuetext={`Paso ${activeStep + 1}: ${current.title}`}
      >
        <span style={{ width: `${(activeStep + 1) * 25}%` }} />
      </div>

      <div id={detailId} className={styles.stage} data-step={current.id}>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.visualTop}>
            <span>
              TAD<span className={styles.brandDot}>.</span>
            </span>
            <span className={styles.example}>EJEMPLO DIDÁCTICO</span>
          </div>
          <div className={styles.tablet} data-stage={current.id}>
            <div className={styles.tabletContent} key={current.id}>
              <div className={styles.sceneLabel}>
                <CurrentIcon size={17} />
                <span>{current.sceneLabel}</span>
              </div>
              <div className={styles.contextScene}>
                {current.id === "campaign" && (
                  <div className={styles.creativeScene}>
                    <span>TU IDEA ↗</span>
                    <strong>
                      Una marca.
                      <br />
                      Un nuevo destino.
                    </strong>
                    <div>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                {current.id === "screen" && (
                  <div className={styles.calendarScene}>
                    <div>
                      <span>PLAN DE CAMPAÑA</span>
                      <span>↗</span>
                    </div>
                    <div>
                      {Array.from({ length: 21 }, (_, index) => (
                        <span
                          key={index}
                          data-scheduled={index >= 4 && index <= 15}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      ))}
                    </div>
                    <p>Duración y pantallas, en contexto.</p>
                  </div>
                )}
                {current.id === "playback" && (
                  <div className={styles.playbackScene}>
                    <span>
                      <Play size={39} fill="currentColor" />
                    </span>
                    <div />
                    <p>REPRODUCIR → SINCRONIZAR → VALIDAR</p>
                  </div>
                )}
                {current.id === "report" && (
                  <div className={styles.reportScene}>
                    <div>
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <p>ACTIVIDAD + MÉTODO + CONTEXTO</p>
                    <span>Gráfico conceptual · sin cifras reales</span>
                  </div>
                )}
              </div>
              <p className={styles.sceneTitle}>{current.sceneTitle}</p>
              <p className={styles.sceneDetail}>{current.sceneDetail}</p>
            </div>
          </div>
          <p className={styles.visualNote}>
            Ilustración conceptual. Sin datos reales.
          </p>
        </div>

        <div className={styles.detail}>
          <p className={styles.detailNumber}>PASO {activeStep + 1} DE 4</p>
          <h3 className={styles.detailTitle}>{current.title}</h3>
          <p className={styles.description}>{current.detail}</p>
          <div className={styles.context}>
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <h4>{current.question}</h4>
              <p>{current.answer}</p>
            </div>
          </div>
          <div className={styles.navigation}>
            <button
              type="button"
              aria-disabled={activeStep === 0}
              onClick={() => selectStep(activeStep - 1)}
            >
              <ArrowLeft size={17} aria-hidden="true" /> Anterior
            </button>
            <button
              type="button"
              aria-disabled={activeStep === STEPS.length - 1}
              onClick={() => selectStep(activeStep + 1)}
            >
              Siguiente <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          <p className={styles.boundary}>
            Demo local. No crea una campaña ni confirma aprobación, publicación
            o resultados.
          </p>
        </div>
      </div>
      <noscript>
        <ol className={styles.staticStory}>
          {STEPS.map((step) => (
            <li key={step.id}>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </noscript>
      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Paso {activeStep + 1} de 4: {current.title}.
      </p>
    </section>
  );
}
