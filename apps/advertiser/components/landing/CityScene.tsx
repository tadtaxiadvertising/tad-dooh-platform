"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, Play, RotateCcw } from "lucide-react";
import { TextMorph } from "../../../../packages/ui/components/TextMorph";
import styles from "./city-scene.module.css";

const CREATIVES = [
  {
    id: "coffee",
    name: "Café de barrio",
    category: "CERCA DE TI",
    headline: "La próxima parada sabe a café.",
    detail: "Un negocio local. Una idea que acompaña el viaje.",
    color: "#ffd400",
    ink: "#27200b",
    symbol: "☕",
  },
  {
    id: "launch",
    name: "Nuevo lanzamiento",
    category: "ALGO NUEVO LLEGA",
    headline: "Dale un nuevo destino a tu marca.",
    detail: "Presenta una novedad con un mensaje fácil de recordar.",
    color: "#c8efd6",
    ink: "#153d2a",
    symbol: "↗",
  },
  {
    id: "culture",
    name: "Agenda cultural",
    category: "HAZ UN PLAN",
    headline: "Tu ciudad tiene mucho que contar.",
    detail: "Una invitación para descubrir lo que pasa cerca.",
    color: "#c5c8ff",
    ink: "#27274d",
    symbol: "✳",
  },
] as const;

/** A local, input-driven illustration. It never contacts a player or publishes an ad. */
export default function CityScene() {
  const [selected, setSelected] = useState(0);
  const [replay, setReplay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const uniqueId = useId();
  const creative = CREATIVES[selected];
  const titleId = `${uniqueId}-creative`;

  useEffect(() => {
    if (replay === 0 || reduceMotion !== false) {
      setPlaying(false);
      return;
    }
    const element = sceneRef.current;
    if (!element || document.hidden) return;
    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), 820);
    const stop = () => {
      if (document.hidden) setPlaying(false);
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            if (!entries[0]?.isIntersecting) setPlaying(false);
          });
    observer?.observe(element);
    document.addEventListener("visibilitychange", stop);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", stop);
    };
  }, [replay, reduceMotion]);

  const demonstrate = (index = selected) => {
    setSelected(index);
    setReplay((value) => value + 1);
  };
  const palette = {
    "--creative-color": creative.color,
    "--creative-ink": creative.ink,
  } as CSSProperties;

  return (
    <div
      className={styles.demo}
      style={palette}
      ref={sceneRef}
      data-playing={playing}
      data-example={creative.id}
    >
      <div className={styles.topline}>
        <span>
          <i /> UNA IDEA, EN MOVIMIENTO
        </span>
        <span>DEMO LOCAL</span>
      </div>
      <div className={styles.artwork} aria-hidden="true" key={replay}>
        <div className={styles.city}>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <svg
          className={styles.transferPath}
          viewBox="0 0 500 360"
          preserveAspectRatio="none"
        >
          <path d="M88 82 C 175 13, 325 40, 371 137" />
          <path
            className={styles.progressPath}
            d="M88 82 C 175 13, 325 40, 371 137"
          />
        </svg>
        <div className={styles.sourceCard}>
          <span>01 / TU IDEA</span>
          <strong>{creative.symbol}</strong>
          <small>{creative.name}</small>
        </div>
        <div className={styles.packet} key={replay}>
          {creative.symbol}
        </div>
        <div className={styles.road}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.taxi}>
          <div className={styles.roof}>TAXI</div>
          <div className={styles.window} />
          <span className={styles.door} />
          <span className={styles.wheel} />
          <span className={styles.wheel} />
        </div>
        <div className={styles.tablet}>
          <div className={styles.screen}>
            <span>{creative.category}</span>
            <div className={styles.symbol}>{creative.symbol}</div>
            <strong>{creative.headline}</strong>
            <small>
              TAD. <ArrowUpRight size={19} />
            </small>
          </div>
        </div>
        <span className={styles.destination}>02 / EN LA TABLET</span>
      </div>
      <div className={styles.caption}>
        <div>
          <p>EJEMPLO SELECCIONADO</p>
          <h2 id={titleId}>
            <TextMorph>{creative.name}</TextMorph>
          </h2>
        </div>
        <button
          type="button"
          className={styles.replay}
          onClick={() => demonstrate()}
          aria-label={replay ? "Repetir demostración" : "Ver demostración"}
        >
          {replay ? (
            <RotateCcw size={17} aria-hidden="true" />
          ) : (
            <Play size={17} aria-hidden="true" />
          )}
          <span>{replay ? "Repetir" : "Ver demo"}</span>
        </button>
      </div>
      <div
        className={styles.examples}
        role="group"
        aria-label="Seleccionar creatividad de ejemplo"
      >
        {CREATIVES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={index === selected}
            onClick={() => demonstrate(index)}
          >
            <span aria-hidden="true">0{index + 1}</span>
            {item.name}
          </button>
        ))}
      </div>
      <p className={styles.description}>
        <span className={styles.srOnly}>{creative.headline} </span>
        {creative.detail}
      </p>
      <p className={styles.boundary}>
        Representación ilustrativa. No publica anuncios ni muestra datos en
        vivo.
      </p>
      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {replay > 0
          ? `${creative.name}. ${creative.headline} Creatividad mostrada en la tablet de ejemplo.`
          : "Selecciona una creatividad o reproduce la demostración."}
      </p>
    </div>
  );
}
