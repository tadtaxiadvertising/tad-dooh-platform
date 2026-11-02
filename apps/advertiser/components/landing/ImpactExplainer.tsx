"use client";

import { useId, useState } from "react";
import { ArrowDownRight, ArrowRight, Info } from "lucide-react";
import type { estimateCampaignDetailed } from "../advertiser/simulatorPricing";
import styles from "./impact-explainer.module.css";

const SCENARIOS = [
  {
    id: "min",
    label: "Prudente",
    meaning:
      "El extremo inferior del rango del modelo. Sirve para explorar un resultado con supuestos más cautos.",
  },
  {
    id: "expected",
    label: "Central",
    meaning:
      "El punto central que devuelve el modelo. Es una referencia para comparar, sin garantía de entrega ni de atención.",
  },
  {
    id: "max",
    label: "Amplio",
    meaning:
      "El extremo superior del rango. Ayuda a ver la incertidumbre; no es una promesa de alcance.",
  },
] as const;

type Props = {
  projection: ReturnType<typeof estimateCampaignDetailed>;
  screens: number;
  months: number;
  city: string;
  frequencySeconds: number;
};
const number = (value: number) => value.toLocaleString("es-DO");

export default function ImpactExplainer({
  projection,
  screens,
  months,
  city,
  frequencySeconds,
}: Props) {
  const [scenario, setScenario] = useState<"min" | "expected" | "max">(
    "expected",
  );
  const uniqueId = useId();
  const selected = SCENARIOS.find((item) => item.id === scenario)!;
  const range = projection.totalImpressions;
  const point = (value: number) =>
    30 + (range.max > 0 ? value / range.max : 0) * 440;
  const selectedValue = range[scenario];

  return (
    <section
      className={styles.explainer}
      aria-labelledby={`${uniqueId}-title`}
      data-impact-explainer
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>04 / DA CONTEXTO A TU INVERSIÓN</p>
          <h3 id={`${uniqueId}-title`}>
            Un rango explica más
            <br />
            que una promesa.
          </h3>
        </div>
        <p>
          El presupuesto y la exposición responden a preguntas distintas.
          Explora los tres puntos del mismo modelo.
        </p>
      </div>
      <div className={styles.layout}>
        <div className={styles.inputs}>
          <span className={styles.smallLabel}>TU ESCENARIO DEL STUDIO</span>
          <div className={styles.inputEquation}>
            <strong>
              {screens}
              <small>{screens === 1 ? "pantalla" : "pantallas"}</small>
            </strong>
            <span aria-hidden="true">×</span>
            <strong>
              {months}
              <small>{months === 1 ? "mes" : "meses"}</small>
            </strong>
            <ArrowDownRight size={28} aria-hidden="true" />
          </div>
          <p>
            <strong>{city}</strong> da contexto al ejemplo creativo. Elegir la
            ciudad o el objetivo no cambia los supuestos del cálculo.
          </p>
          <div className={styles.assumption}>
            <Info size={17} aria-hidden="true" />
            <span>
              Más pantallas o tiempo amplían el ejemplo modelado. La producción
              opcional cambia el coste; no aumenta este rango.
            </span>
          </div>
        </div>
        <div className={styles.result}>
          <div
            className={styles.switch}
            role="group"
            aria-label="Explorar rango de impresiones"
          >
            {SCENARIOS.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={scenario === item.id}
                onClick={() => setScenario(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className={styles.smallLabel}>
            IMPRESIONES MODELADAS · ESCENARIO {selected.label.toUpperCase()}
          </p>
          <output
            className={styles.value}
            aria-live="polite"
            aria-atomic="true"
          >
            {number(selectedValue)}
          </output>
          <p className={styles.meaning}>{selected.meaning}</p>
          <svg
            viewBox="0 0 500 88"
            className={styles.chart}
            role="img"
            aria-labelledby={`${uniqueId}-chart-title ${uniqueId}-chart-desc`}
          >
            <title
              id={`${uniqueId}-chart-title`}
            >{`Rango de impresiones estimadas: ${number(range.min)} a ${number(range.max)}`}</title>
            <desc
              id={`${uniqueId}-chart-desc`}
            >{`Punto central ${number(range.expected)}. Seleccionado: ${selected.label}, ${number(selectedValue)}. Son exposiciones estimadas, no personas únicas ni vistas verificadas.`}</desc>
            <line x1="30" y1="40" x2="470" y2="40" className={styles.axis} />
            <line
              x1={point(range.min)}
              y1="40"
              x2={point(range.max)}
              y2="40"
              className={styles.band}
            />
            {SCENARIOS.map((item) => (
              <g key={item.id}>
                <line
                  x1={point(range[item.id])}
                  x2={point(range[item.id])}
                  y1="29"
                  y2="51"
                  className={styles.tick}
                />
                <circle
                  cx={point(range[item.id])}
                  cy="40"
                  r="4"
                  className={styles.dot}
                />
              </g>
            ))}
            <circle
              className={styles.marker}
              cx={point(selectedValue)}
              cy="40"
              r="10"
            />
            <text x="30" y="78">
              Menor exposición
            </text>
            <text x="470" y="78" textAnchor="end">
              Mayor exposición
            </text>
          </svg>
          <dl className={styles.range}>
            {SCENARIOS.map((item) => (
              <div key={item.id} data-selected={scenario === item.id}>
                <dt>{item.label}</dt>
                <dd>{number(range[item.id])}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.boundary}>
            No son personas únicas, reproducciones verificadas ni ventas. Ningún
            escenario garantiza resultados.
          </p>
        </div>
      </div>
      <details className={styles.sources}>
        <summary>
          Ver supuestos, fuentes y límites{" "}
          <ArrowRight size={18} aria-hidden="true" />
        </summary>
        <div className={styles.sourceContent}>
          <p>
            El motor compartido con onboarding combina {screens}{" "}
            {screens === 1 ? "pantalla" : "pantallas"}, {months}{" "}
            {months === 1 ? "mes" : "meses"} y una frecuencia de referencia de{" "}
            {frequencySeconds} segundos con supuestos de operación y atención.
            Por pantalla y mes estima{" "}
            {number(projection.impressionsPerScreenPerMonth.min)}–
            {number(projection.impressionsPerScreenPerMonth.max)} impresiones.
          </p>
          <p>
            Los puntos prudente, central y amplio muestran el rango recibido del
            modelo; este control no modifica su fórmula. Revisa la vigencia y la
            metodología de cada fuente antes de interpretar el ejemplo.
          </p>
          <ul>
            {projection.sourcesUsed.map((source) => (
              <li key={source.id}>
                <strong>{source.studyName}</strong>
                <span>
                  {source.publisher} · {source.unit}
                  {source.stale ? " · Fuente marcada como vencida" : ""}
                </span>
                {source.methodology && <p>{source.methodology}</p>}
                {source.url && (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    Consultar fuente{" "}
                    <span className={styles.srOnly}>
                      (abre una pestaña nueva)
                    </span>{" "}
                    ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
          {projection.warnings.length > 0 && (
            <div className={styles.warnings}>
              <h4>Advertencias del modelo</h4>
              <ul>
                {projection.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
