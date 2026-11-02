"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, MonitorPlay, Play, RotateCcw } from "lucide-react";
import { TextMorph } from "../../../../packages/ui/components/TextMorph";
import styles from "./driver-taxi-demo.module.css";

export default function DriverTaxiDemo() {
  const [enabled, setEnabled] = useState(false);
  const [replay, setReplay] = useState(0);
  const taxiRef = useRef<SVGSVGElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!replay || !enabled || reduceMotion !== false || document.hidden)
      return;
    const taxi = taxiRef.current;
    if (!taxi) return;
    const animation = taxi.animate(
      [
        { transform: "translateX(0px)" },
        { transform: "translateX(12px)", offset: 0.5 },
        { transform: "translateX(0px)" },
      ],
      { duration: 720, easing: "ease-in-out" },
    );
    const stopWhenHidden = () => {
      if (document.hidden) animation.cancel();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) animation.cancel();
    });
    observer.observe(taxi);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      animation.cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [enabled, reduceMotion, replay]);

  function play() {
    setEnabled(true);
    setReplay((value) => value + 1);
  }

  return (
    <div className={styles.demo} data-driver-demo={enabled ? "on" : "off"}>
      <div className={styles.topline}>
        <span>
          <span className={styles.dot} aria-hidden="true" /> TU TAXI, CONECTADO
        </span>
        <span>Demo ilustrativa</span>
      </div>
      <div className={styles.stage}>
        <div className={styles.grid} aria-hidden="true" />
        <svg
          ref={taxiRef}
          className={styles.taxi}
          viewBox="0 0 600 410"
          role="img"
          aria-label="Taxi amarillo con una pantalla a bordo; ilustración conceptual de publicidad digital"
        >
          <defs>
            <linearGradient id="driver-taxi-body" x1="0" y1="0" x2="0.7" y2="1">
              <stop stopColor="#FFE86D" />
              <stop offset="0.55" stopColor="#FFD400" />
              <stop offset="1" stopColor="#BA8700" />
            </linearGradient>
            <linearGradient id="driver-taxi-window" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#3D4853" />
              <stop offset="1" stopColor="#111A23" />
            </linearGradient>
          </defs>
          <g aria-hidden="true">
            <ellipse
              cx="300"
              cy="344"
              rx="233"
              ry="24"
              fill="#000"
              opacity=".45"
            />
            <path d="M50 359h500" stroke="#FFD400" strokeOpacity=".3" />
            <path
              d="M70 378h74m34 0h80m34 0h90m34 0h82"
              stroke="#fff"
              strokeOpacity=".16"
              strokeWidth="3"
            />
            <path
              d="m122 246 50-91c8-14 22-23 38-23h160c20 0 35 8 46 22l57 72 50 12c15 4 25 16 25 31v36H79v-35c0-12 6-19 17-21Z"
              fill="url(#driver-taxi-body)"
            />
            <path
              d="m174 226 37-70h77v70Zm129 0v-70h60c15 0 25 5 33 16l41 54Z"
              fill="url(#driver-taxi-window)"
            />
            <path
              d="m222 158-33 65m125-65v65"
              stroke="#B1C5D4"
              strokeOpacity=".25"
              strokeWidth="4"
            />
            <path
              d="M295 239v66m151-63 10 63"
              stroke="#9A7600"
              strokeWidth="2"
            />
            <path
              d="M83 277h460"
              stroke="#FFE86D"
              strokeOpacity=".75"
              strokeWidth="3"
            />
            <path d="M83 303h460" stroke="#201F17" strokeWidth="15" />
            <path
              d="M108 266h28m355-11h32"
              stroke="#FFF5C5"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <rect
              x="263"
              y="251"
              width="19"
              height="5"
              rx="2.5"
              fill="#262718"
            />
            <rect
              x="406"
              y="251"
              width="19"
              height="5"
              rx="2.5"
              fill="#262718"
            />
            <rect
              x="257"
              y="111"
              width="73"
              height="22"
              rx="5"
              fill="#FFE57C"
            />
            <text
              x="293"
              y="127"
              textAnchor="middle"
              fill="#161816"
              fontFamily="Arial, sans-serif"
              fontWeight="800"
              fontSize="14"
              letterSpacing="3"
            >
              TAXI
            </text>
            <circle cx="173" cy="309" r="42" fill="#101213" />
            <circle cx="173" cy="309" r="25" fill="#62696C" />
            <circle cx="173" cy="309" r="13" fill="#A1A8A8" />
            <circle cx="447" cy="309" r="42" fill="#101213" />
            <circle cx="447" cy="309" r="25" fill="#62696C" />
            <circle cx="447" cy="309" r="13" fill="#A1A8A8" />
            <rect
              x="345"
              y="179"
              width="53"
              height="34"
              rx="5"
              fill="#050607"
              stroke="#71818C"
              strokeWidth="3"
            />
            <rect
              x="351"
              y="185"
              width="41"
              height="22"
              rx="2"
              fill={enabled ? "#FFD400" : "#53616D"}
            />
            <path d="m367 189 11 7-11 7Z" fill="#121416" />
            <path
              d="m372 176 41-61h57"
              fill="none"
              stroke="#FFD400"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />
            <circle cx="372" cy="176" r="4" fill="#FFD400" />
          </g>
        </svg>
        <div
          className={styles.tablet}
          data-enabled={enabled}
          aria-hidden="true"
        >
          <span className={styles.tabletLabel}>
            <MonitorPlay size={14} /> PANTALLA A BORDO
          </span>
          <div className={styles.creative}>
            <span className={styles.playIcon}>
              <Play size={23} fill="currentColor" />
            </span>
            <strong>
              {enabled
                ? "El mensaje viaja contigo."
                : "Un espacio para conectar."}
            </strong>
            <span>
              {enabled
                ? "Publicidad digital · ejemplo"
                : "Enciende la demostración"}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.explanation}>
        <p className={styles.state}>
          <TextMorph>
            {enabled ? "Mensaje a bordo" : "Tu pantalla, en espera"}
          </TextMorph>
        </p>
        <p id="driver-demo-explanation" aria-live="polite">
          {enabled
            ? "La pantalla muestra un mensaje durante el recorrido. Esta demo no registra reproducciones ni genera ingresos."
            : "Mira cómo la publicidad puede acompañar el recorrido. La instalación y la participación requieren evaluación."}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={play}
            aria-describedby="driver-demo-explanation"
          >
            {enabled ? (
              <RotateCcw size={17} aria-hidden="true" />
            ) : (
              <Play size={17} aria-hidden="true" />
            )}
            {enabled ? "Repetir recorrido" : "Ver mi taxi en acción"}
          </button>
          <button
            type="button"
            className={styles.reset}
            onClick={() => setEnabled(false)}
            aria-disabled={!enabled}
          >
            Restablecer <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
