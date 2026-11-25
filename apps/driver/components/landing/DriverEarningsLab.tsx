"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  MonitorPlay,
  ShoppingBag,
  Users,
} from "lucide-react";
import { previewDriverEarnings } from "../../lib/earningsPreview";
import styles from "./driver-earnings-lab.module.css";

const money = (n: number) => `RD$ ${n.toLocaleString("es-DO")}`;

export default function DriverEarningsLab({
  signupEnabled,
}: {
  signupEnabled: boolean;
}) {
  const [ads, setAds] = useState(8);
  const [sales, setSales] = useState(1);
  const [referrals, setReferrals] = useState(1);
  const result = previewDriverEarnings(ads, sales, referrals);
  const earningsOutputRef = useRef<HTMLOutputElement>(null);
  const previousEarningsTotal = useRef(result.illustrativeTotalRD);
  useEffect(() => {
    if (previousEarningsTotal.current === result.illustrativeTotalRD) return;
    previousEarningsTotal.current = result.illustrativeTotalRD;
    const output = earningsOutputRef.current;
    // Animate only on a user-triggered value change and when the browser supports it.
    if (
      !output ||
      typeof output.animate !== "function" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const animation = output.animate(
      [
        { transform: "translateY(3px)", opacity: 0.94 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      { duration: 180, easing: "ease-out" },
    );
    return () => animation.cancel();
  }, [result.illustrativeTotalRD]);

  const controls = [
    {
      id: "ads",
      title: "Publicidad en mi pantalla",
      subtitle: "Campañas elegibles · hasta 15 simultáneas",
      icon: MonitorPlay,
      value: ads,
      setter: setAds,
      max: 15,
    },
    {
      id: "sales",
      title: "Venta de publicidad",
      subtitle: "Ventas aprobadas · hasta 100 en este simulador",
      icon: ShoppingBag,
      value: sales,
      setter: setSales,
      max: 100,
    },
    {
      id: "referrals",
      title: "Referir conductores",
      subtitle: "Referidos activados · bono único · hasta 100 simulados",
      icon: Users,
      value: referrals,
      setter: setReferrals,
      max: 100,
    },
  ];

  return (
    <section
      id="calculadora"
      data-slot="driver-earnings-lab"
      className={styles.section}
      aria-labelledby="driver-lab-title"
    >
      <div className={styles.heading}>
        <span className={styles.eyebrow}>EXPLORA · TUS TRES OPORTUNIDADES</span>
        <h2 id="driver-lab-title">
          Tu esfuerzo tiene <em>más de una ruta.</em>
        </h2>
        <p>
          Prueba escenarios para comprender cómo funciona cada concepto. Cada
          RD$500 depende de cumplir condiciones; no se abona por simples clics o
          formularios enviados.
        </p>
      </div>
      <div className={styles.layout}>
        <div className={styles.controls}>
          {controls.map(
            ({ id, title, subtitle, icon: Icon, value, setter, max }) => (
              <div key={id} className={styles.control}>
                <div className={styles.controlHeader}>
                  <span className={styles.icon}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div className={styles.controlTitle}>
                    <label htmlFor={`driver-lab-${id}`}>{title}</label>
                    <small>{subtitle}</small>
                  </div>
                  <div className={styles.valueGroup}>
                    <output
                      htmlFor={`driver-lab-${id}`}
                      className={styles.value}
                    >
                      {value}
                    </output>
                    <span className={styles.unit} aria-hidden="true">
                      × RD$500
                    </span>
                  </div>
                </div>
                <input
                  id={`driver-lab-${id}`}
                  type="range"
                  min={0}
                  max={max}
                  step={1}
                  value={value}
                  onChange={(e) => setter(Number(e.target.value))}
                  aria-valuetext={`${value} ${title.toLowerCase()}`}
                />
                {id === "ads" && (
                  <div
                    className={styles.slots}
                    role="img"
                    aria-label={`${result.ads} de 15 campañas simultáneas de ejemplo`}
                  >
                    {Array.from({ length: 15 }, (_, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        data-active={i < result.ads}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
          <p className={styles.rangeNote}>
            Los controles muestran hasta 100 ventas y 100 referidos activados
            para facilitar esta simulación. Este máximo no define condiciones ni
            posibles límites contractuales de comisiones o bonos.
          </p>
        </div>
        <div
          className={styles.result}
          aria-label="Desglose ilustrativo de ganancias"
        >
          <div className={styles.resultTop}>
            <BadgeCheck size={19} aria-hidden="true" />
            <span>SIMULACIÓN EDUCATIVA</span>
          </div>
          <p className={styles.resultEyebrow}>
            Ejemplo combinado: un mes de anuncios y bonos por eventos
          </p>
          <output
            ref={earningsOutputRef}
            htmlFor="driver-lab-ads driver-lab-sales driver-lab-referrals"
            className={styles.total}
          >
            {money(result.illustrativeTotalRD)}
          </output>
          <div className={styles.breakdown}>
            <div>
              <span>{result.ads} campañas × RD$500 (ejemplo mensual)</span>
              <strong>{money(result.screenAdsRD)}</strong>
            </div>
            <div>
              <span>{result.sales} ventas aprobadas × RD$500</span>
              <strong>{money(result.salesRD)}</strong>
            </div>
            <div>
              <span>{result.referrals} referidos activados × RD$500</span>
              <strong>{money(result.referralsRD)}</strong>
            </div>
          </div>
          <div className={styles.explainer}>
            <p>
              Los ingresos de pantalla se ilustran por mes; las ventas y los
              referidos son bonos por eventos aprobados y no se repiten
              automáticamente en meses siguientes.
            </p>
            <p>
              <strong>Mensual por anuncios:</strong>{" "}
              {money(result.recurringMonthlyExampleRD)}
            </p>
            <p>
              <strong>Bonos por eventos:</strong>{" "}
              {money(result.oneTimeEventsExampleRD)}
            </p>
          </div>
          <aside
            className={styles.rateTable}
            aria-label="Notas sobre tipos de compensación"
          >
            <h3>Cómo se interpreta cada ingreso</h3>
            <dl>
              <div>
                <dt>Campañas elegibles</dt>
                <dd>
                  La simulación mensual usa RD$500 por campaña en pantalla,
                  hasta 15 simultáneas.
                </dd>
              </div>
              <div>
                <dt>Ventas y referidos</dt>
                <dd>
                  RD$500 por venta aprobada y RD$500 por conductor referido
                  activado, sujetos a validación. No son pagos recurrentes.
                </dd>
              </div>
            </dl>
          </aside>
          <p className={styles.notice}>
            No representa una nómina, balance, ingreso neto o pago prometido.
            Aplican validación de actividad, estados de comisión, contrato,
            disponibilidad y ajustes. Los referidos y ventas no se repiten
            mensualmente por defecto.
          </p>
          <a
            className={styles.next}
            href={signupEnabled ? "/register" : "#como-participar"}
          >
            {signupEnabled
              ? "Solicitar evaluación"
              : "Entender cómo participar"}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
