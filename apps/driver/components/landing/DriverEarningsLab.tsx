"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, MonitorPlay, ShoppingBag, Users } from "lucide-react";
import { previewDriverEarnings } from "../../lib/earningsPreview";
import styles from "./driver-earnings-lab.module.css";

const money = (n: number) => `RD$ ${n.toLocaleString("es-DO")}`;

export default function DriverEarningsLab({ signupEnabled }: { signupEnabled: boolean }) {
  const [ads, setAds] = useState(8);
  const [sales, setSales] = useState(1);
  const [referrals, setReferrals] = useState(1);
  const reduceMotion = useReducedMotion();
  const result = previewDriverEarnings(ads, sales, referrals);

  const controls = [
      { id: "ads", title: "Publicidad en mi pantalla", subtitle: "Anuncios elegibles en un mes · máximo 15", icon: MonitorPlay, value: ads, setter: setAds, max: 15 },
      { id: "sales", title: "Venta de publicidad", subtitle: "Comisiones por ventas aprobadas · sin límite", icon: ShoppingBag, value: sales, setter: setSales, max: 100 },
      { id: "referrals", title: "Referir conductores", subtitle: "Conductores referidos activados · bono único por hito · sin límite", icon: Users, value: referrals, setter: setReferrals, max: 100 },
    ];

  return (
    <section id="calculadora" className={styles.section} aria-labelledby="driver-lab-title">
      <div className={styles.heading}>
        <span className={styles.eyebrow}>EXPLORA · TUS TRES OPORTUNIDADES</span>
        <h2 id="driver-lab-title">Tu esfuerzo tiene <em>más de una ruta.</em></h2>
        <p>Prueba escenarios para comprender cómo funciona cada concepto. Cada RD$500 depende de cumplir condiciones; no se abona por simples clics o formularios enviados.</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.controls}>
          {controls.map(({ id, title, subtitle, icon: Icon, value, setter, max }, index) => (
            <motion.div key={id} className={styles.control}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}>
              <div className={styles.controlHeader}>
                <span className={styles.icon}><Icon size={20} aria-hidden="true"/></span>
                <div className={styles.controlTitle}><label htmlFor={`driver-lab-${id}`}>{title}</label><small>{subtitle}</small></div>
                <output htmlFor={`driver-lab-${id}`} className={styles.value}>
                  {id === "ads" ? `${value} × RD$500` : id === "sales" ? `RD$500 × ${value}` : `RD$500 × ${value}`}
                </output>
              </div>
              <input id={`driver-lab-${id}`} type="range" min={0} max={max} step={1}
                value={value} onChange={e => setter(Number(e.target.value))}
                aria-valuetext={`${value} ${title.toLowerCase()}`} />
              {id === "ads" && <div className={styles.slots} aria-label={`${result.ads} de 15 anuncios de ejemplo`}>
                {Array.from({ length: 15 }, (_, i) => (
                  <span key={i} aria-hidden="true" data-active={i < result.ads}>{String(i + 1).padStart(2,"0")}</span>
                ))}
              </div>}
            </motion.div>
          ))}
        </div>
        <div className={styles.result} aria-label="Desglose ilustrativo de ganancias">
          <div className={styles.resultTop}><BadgeCheck size={19} aria-hidden="true"/><span>SIMULACIÓN EDUCATIVA</span></div>
          <p className={styles.resultEyebrow}>Total bruto del ejemplo, en un mismo período</p>
          <motion.output
            htmlFor="driver-lab-ads driver-lab-sales driver-lab-referrals"
            className={styles.total}
            key={result.illustrativeTotalRD}
            initial={reduceMotion ? false : { opacity: 0.6, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}>{money(result.illustrativeTotalRD)}</motion.output>
          <div className={styles.breakdown}>
            <div><span>{result.ads} anuncios × RD$500 (ejemplo mensual)</span><strong>{money(result.screenAdsRD)}</strong></div>
            <div><span>{result.sales} ventas aprobadas × RD$500</span><strong>{money(result.salesRD)}</strong></div>
            <div><span>{result.referrals} referidos activados × RD$500</span><strong>{money(result.referralsRD)}</strong></div>
          </div>
          <div className={styles.explainer}>
            <p><strong>Mensual por anuncios:</strong> {money(result.recurringMonthlyExampleRD)}</p>
            <p><strong>Bonos por eventos:</strong> {money(result.oneTimeEventsExampleRD)}</p>
          </div>
          <aside className={styles.rateTable} aria-label="Notas sobre tipos de compensación">
            <h3>Cómo se interpreta cada ingreso</h3>
            <dl>
              <div><dt>Campañas elegibles</dt><dd>La simulación mensual usa RD$500 por campaña en pantalla, hasta 15 simultáneas.</dd></div>
              <div><dt>Reproducciones verificadas</dt><dd>La referencia operativa de RD$1.25 por play validado es un concepto distinto; no se suma automáticamente al ejemplo.</dd></div>
              <div><dt>Ventas y referidos</dt><dd>RD$500 por venta aprobada y RD$500 por conductor referido activado, sujetos a validación. No son pagos recurrentes.</dd></div>
            </dl>
          </aside>
          <p className={styles.notice}>No representa una nómina, balance, ingreso neto o pago prometido. Aplican validación de actividad, estados de comisión, contrato, disponibilidad y ajustes. Los referidos y ventas no se repiten mensualmente por defecto.</p>
          <a className={styles.next} href={signupEnabled ? "/register" : "#como-participar"}>
            {signupEnabled ? "Solicitar evaluación" : "Entender cómo participar"}<ArrowRight size={17} aria-hidden="true"/>
          </a>
        </div>
      </div>
    </section>
  );
}
