"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  MonitorPlay,
  ShoppingBag,
  Users,
} from "lucide-react";
import { TextMorph } from "../../../../packages/ui/components/TextMorph";
import { previewDriverEarnings } from "../../lib/earningsPreview";
import styles from "./driver-earnings-lab.module.css";

const money = (n: number) => `RD$ ${n.toLocaleString("es-DO")}`;
type Route = "ads" | "sales" | "referrals";

export default function DriverEarningsLab({
  signupEnabled,
}: {
  signupEnabled: boolean;
}) {
  const [ads, setAds] = useState(8);
  const [sales, setSales] = useState(1);
  const [referrals, setReferrals] = useState(1);
  const [route, setRoute] = useState<Route>("ads");
  const [announcement, setAnnouncement] = useState("");
  const reduceMotion = useReducedMotion();
  const result = previewDriverEarnings(ads, sales, referrals);
  const totalRef = useRef<HTMLOutputElement>(null);
  const previousTotal = useRef(result.illustrativeTotalRD);

  useEffect(() => {
    const changed = previousTotal.current !== result.illustrativeTotalRD;
    previousTotal.current = result.illustrativeTotalRD;
    if (
      !changed ||
      reduceMotion !== false ||
      document.hidden ||
      !totalRef.current
    )
      return;
    const animation = totalRef.current.animate(
      [
        { transform: "translateY(3px)", opacity: 1 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      { duration: 180, easing: "ease-out" },
    );
    const stopWhenHidden = () => {
      if (document.hidden) animation.cancel();
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      animation.cancel();
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [reduceMotion, result.illustrativeTotalRD]);

  const controls = [
    {
      id: "ads" as const,
      short: "Anuncios",
      title: "Publicidad en mi pantalla",
      subtitle: "Anuncios elegibles en un mes · máximo 15",
      icon: MonitorPlay,
      value: ads,
      setter: setAds,
      max: 15,
      amount: result.screenAdsRD,
      frequency: "Ejemplo mensual",
      condition:
        "Depende de anuncios elegibles y actividad validada. El máximo de este escenario mensual es de quince anuncios; no hay campañas garantizadas.",
    },
    {
      id: "sales" as const,
      short: "Ventas",
      title: "Venta de publicidad",
      subtitle: "Ventas aprobadas · eventos no recurrentes",
      icon: ShoppingBag,
      value: sales,
      setter: setSales,
      max: 100,
      amount: result.salesRD,
      frequency: "Por evento aprobado",
      condition:
        "Cada venta debe cumplir los requisitos de aprobación. Un clic, un contacto o una propuesta pendiente no generan esta comisión. No se repite mensualmente por defecto.",
    },
    {
      id: "referrals" as const,
      short: "Referidos",
      title: "Referir conductores",
      subtitle: "Activación elegible aprobada · bono por hito",
      icon: Users,
      value: referrals,
      setter: setReferrals,
      max: 100,
      amount: result.referralsRD,
      frequency: "Una vez por hito elegible",
      condition:
        "El conductor referido debe completar una activación elegible y aprobada. Enviar el registro no basta. El bono no se repite mensualmente por defecto.",
    },
  ];
  const selected = controls.find((control) => control.id === route)!;
  const SelectedIcon = selected.icon;

  function announceResult() {
    setAnnouncement(
      `Ejemplo actualizado: ${money(result.recurringMonthlyExampleRD)} mensual por anuncios y ${money(result.oneTimeEventsExampleRD)} por eventos. Total ilustrativo ${money(result.illustrativeTotalRD)}.`,
    );
  }

  return (
    <section
      id="calculadora"
      className={styles.section}
      aria-labelledby="driver-lab-title"
    >
      <div className={styles.heading}>
        <span className={styles.eyebrow}>TU LABORATORIO DE OPORTUNIDADES</span>
        <h2 id="driver-lab-title">
          Tres rutas.
          <br />
          <em>Tú exploras el escenario.</em>
        </h2>
        <p>
          Selecciona una vía para conocer sus condiciones y ajusta los
          contadores. Cada RD$500 de este ejemplo depende de cumplir requisitos;
          no se abona por simples clics o formularios enviados.
        </p>
      </div>
      <div
        className={styles.routePicker}
        role="group"
        aria-label="Explorar una vía de ingresos"
      >
        {controls.map(({ id, short, icon: Icon }, index) => (
          <button
            key={id}
            type="button"
            aria-label={short}
            aria-pressed={route === id}
            aria-controls="driver-route-detail"
            onClick={() => setRoute(id)}
          >
            <span className={styles.routeNumber} aria-hidden="true">
              0{index + 1}
            </span>
            <Icon size={20} aria-hidden="true" />
            <span>{short}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div id="driver-route-detail" className={styles.routeDetail}>
        <div>
          <span className={styles.routeLabel}>
            <SelectedIcon size={18} aria-hidden="true" /> EXPLORANDO{" "}
            <TextMorph>{selected.short}</TextMorph>
          </span>
          <h3>{selected.frequency}</h3>
        </div>
        <p>{selected.condition}</p>
        <div className={styles.selectedContribution}>
          <span>Contribución de esta vía</span>
          <strong>{money(selected.amount)}</strong>
        </div>
      </div>
      <div className={styles.layout}>
        <div className={styles.controls}>
          {controls.map(
            ({
              id,
              title,
              subtitle,
              icon: Icon,
              value,
              setter,
              max,
              amount,
            }) => (
              <div
                key={id}
                className={styles.control}
                data-selected={route === id}
              >
                <div className={styles.controlHeader}>
                  <span className={styles.icon}>
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <div className={styles.controlTitle}>
                    <label htmlFor={`driver-lab-${id}`}>{title}</label>
                    <small id={`driver-lab-${id}-hint`}>{subtitle}</small>
                  </div>
                  <output
                    htmlFor={`driver-lab-${id}`}
                    className={styles.value}
                    aria-live="off"
                  >
                    {value}
                  </output>
                </div>
                <input
                  id={`driver-lab-${id}`}
                  type="range"
                  min={0}
                  max={max}
                  step={1}
                  value={value}
                  onChange={(e) => setter(Number(e.target.value))}
                  onFocus={() => setRoute(id)}
                  onPointerUp={announceResult}
                  onKeyUp={announceResult}
                  onBlur={announceResult}
                  aria-describedby={`driver-lab-${id}-hint`}
                  aria-valuetext={`${value} ${title.toLowerCase()}`}
                />
                <div className={styles.controlScale}>
                  <span>0</span>
                  <span>
                    {id === "ads" ? "15 anuncios" : "100 en esta demo"}
                  </span>
                </div>
                {id === "ads" && (
                  <>
                    <div className={styles.slotHeading}>
                      <MonitorPlay size={17} aria-hidden="true" />
                      <span>
                        {result.ads} de 15 espacios en tu pantalla de ejemplo
                      </span>
                    </div>
                    <div
                      className={styles.slots}
                      role="img"
                      aria-label={`${result.ads} de 15 anuncios de ejemplo`}
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
                  </>
                )}
                <p className={styles.contribution}>
                  <span>{value} × RD$500</span>
                  <strong>{money(amount)}</strong>
                  <span>
                    {id === "ads"
                      ? "mensual de ejemplo"
                      : "por eventos elegibles"}
                  </span>
                </p>
                {id !== "ads" && (
                  <p className={styles.rangeNote}>
                    El control llega a 100 para explorar. Ventas y referidos no
                    tienen un tope comercial por el rango de esta demo.
                  </p>
                )}
              </div>
            ),
          )}
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
            Total bruto ilustrativo de las tres vías
          </p>
          <output
            ref={totalRef}
            htmlFor="driver-lab-ads driver-lab-sales driver-lab-referrals"
            className={styles.total}
            aria-live="off"
          >
            {money(result.illustrativeTotalRD)}
          </output>
          <div className={styles.breakdown}>
            <div>
              <span>{result.ads} anuncios × RD$500 (ejemplo mensual)</span>
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
              <strong>Mensual por anuncios:</strong>{" "}
              {money(result.recurringMonthlyExampleRD)}
            </p>
            <p>
              <strong>Bonos por eventos:</strong>{" "}
              {money(result.oneTimeEventsExampleRD)}
            </p>
          </div>
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
      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </section>
  );
}
