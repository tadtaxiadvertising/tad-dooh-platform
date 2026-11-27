"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { CITIES, type DemoCity } from "../../lib/landing/model";
import StoryChapterArt from "./StoryChapterArt";
import styles from "./taxi-scroll-story.module.css";

type Props = {
  city: DemoCity;
  brandName: string;
};

const scenes = [
  {
    number: "01 / 03",
    eyebrow: "DESCUBRE OTRO LUGAR PARA TU MENSAJE",
    title: "Una ciudad que nunca deja de moverse.",
    description:
      "Mientras la ciudad avanza, tu creatividad puede acompañar los recorridos en taxis.",
  },
  {
    number: "02 / 03",
    eyebrow: "UNA PANTALLA FRENTE AL PASAJERO",
    title: "El mensaje encuentra su espacio.",
    description:
      "La pantalla va detrás del reposacabezas del copiloto y se orienta hacia las personas que viajan atrás.",
  },
  {
    number: "03 / 03",
    eyebrow: "DE LA REPRODUCCIÓN AL CONTEXTO",
    title: "Cada reproducción cuenta una parte de la historia.",
    description:
      "La telemetría puede sincronizarse al recuperar la conexión y someterse a validación. Reproducciones, impresiones estimadas y personas alcanzadas son conceptos distintos.",
  },
] as const;

/**
 * Linear clamp/interpolation for the small local scroll narrative.
 *
 * The native ViewTimeline accelerator in Motion 12.43.0 has been observed
 * returning different effective progress for each scene opacity despite the
 * public progress bar showing the correct value. Function-based transforms
 * stay synchronized to the same scrollYProgress MotionValue.
 */
function interpolateScrollProgress(
  progress: number,
  stops: readonly number[],
  values: readonly number[],
): number {
  if (progress <= stops[0]) return values[0];
  for (let index = 1; index < stops.length; index += 1) {
    if (progress <= stops[index]) {
      const fraction =
        (progress - stops[index - 1]) / (stops[index] - stops[index - 1]);
      return values[index - 1] + fraction * (values[index] - values[index - 1]);
    }
  }
  return values[values.length - 1];
}

/**
 * Scrubbed narrative built from CSS-only local art. This component never
 * contacts the player, telemetry API or advertiser storage.
 * Without JavaScript, on mobile, and with reduced motion, the three chapters
 * remain readable as static editorial cards.
 */
export default function TaxiScrollStory({ city, brandName }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => setReady(true), []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const taxiOpacity = useTransform(() =>
    interpolateScrollProgress(
      scrollYProgress.get(),
      [0, 0.24, 0.39],
      [1, 1, 0],
    ),
  );
  const taxiX = useTransform(() =>
    interpolateScrollProgress(scrollYProgress.get(), [0, 0.34], [0, 110]),
  );
  const taxiScale = useTransform(() =>
    interpolateScrollProgress(scrollYProgress.get(), [0, 0.36], [1, 1.14]),
  );
  const tabletOpacity = useTransform(() =>
    interpolateScrollProgress(
      scrollYProgress.get(),
      [0.27, 0.4, 0.66, 0.77],
      [0, 1, 1, 0],
    ),
  );
  const tabletScale = useTransform(() =>
    interpolateScrollProgress(
      scrollYProgress.get(),
      [0.26, 0.44, 0.66],
      [0.78, 1, 1.04],
    ),
  );
  const reportOpacity = useTransform(() =>
    interpolateScrollProgress(scrollYProgress.get(), [0.69, 0.83], [0, 1]),
  );
  const reportY = useTransform(() =>
    interpolateScrollProgress(scrollYProgress.get(), [0.67, 0.89], [44, 0]),
  );
  const firstCaption = useTransform(() =>
    interpolateScrollProgress(
      scrollYProgress.get(),
      [0, 0.18, 0.31, 0.4],
      [1, 1, 0.7, 0],
    ),
  );
  const secondCaption = useTransform(() =>
    interpolateScrollProgress(
      scrollYProgress.get(),
      [0.3, 0.42, 0.6, 0.72],
      [0, 1, 1, 0],
    ),
  );
  const thirdCaption = useTransform(() =>
    interpolateScrollProgress(
      scrollYProgress.get(),
      [0.66, 0.79, 1],
      [0, 1, 1],
    ),
  );
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const captions = [firstCaption, secondCaption, thirdCaption];
  const displayBrand =
    brandName.trim().replace(/\s+/g, " ").slice(0, 24) || "TU MARCA";

  return (
    <section
      id="motion-story"
      ref={sectionRef}
      className={styles.section}
      data-motion-ready={ready ? "true" : undefined}
      data-reduced-motion={reducedMotion ? "true" : undefined}
      aria-label="De tu idea a la ciudad: recorrido publicitario ilustrativo"
    >
      <div className={styles.sticky}>
        <div className={styles.topline}>
          <span>TAD / EXPERIENCIA EN MOVIMIENTO</span>
          <span>
            DESLIZA PARA DESCUBRIR <span aria-hidden="true">↓</span>
          </span>
        </div>
        <div className={styles.layout}>
          <div className={styles.words}>
            <p className={styles.overline}>UNA NUEVA FORMA DE ESTAR PRESENTE</p>
            <h2 id="motion-story-title">
              De tu idea <em>a la ciudad.</em>
            </h2>
            <div className={styles.chapterWindow} aria-hidden="true">
              {scenes.map((chapter, index) => (
                <motion.div
                  key={chapter.number}
                  className={styles.chapter}
                  style={{ opacity: captions[index] }}
                >
                  <span className={styles.chapterNumber}>{chapter.number}</span>
                  <p className={styles.chapterEyebrow}>{chapter.eyebrow}</p>
                  <h3>{chapter.title}</h3>
                  <p className={styles.chapterDescription}>
                    {chapter.description}
                  </p>
                </motion.div>
              ))}
            </div>
            <ol className={styles.accessibleSummary}>
              {scenes.map((chapter) => (
                <li key={chapter.number}>
                  <strong>{chapter.title}</strong>
                  <p>{chapter.description}</p>
                </li>
              ))}
            </ol>
            <a className={styles.link} href="#creative-preview-title">
              Prueba tu creatividad <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className={styles.art} aria-hidden="true">
            <div className={styles.artGrid} />
            <div className={styles.artTop}>
              <span>ESCENA ILUSTRATIVA</span>
              <span>{CITIES[city].toUpperCase()}</span>
            </div>
            <motion.div
              data-tad-stage="taxi"
              className={styles.taxiScene}
              style={{ opacity: taxiOpacity, x: taxiX, scale: taxiScale }}
            >
              <div className={styles.sun} />
              <div className={styles.route}>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className={styles.taxi}>
                <div className={styles.roofSign}>TAD TAXI</div>
                <div className={styles.carWindow} />
                <div className={styles.carDoor} />
                <div className={styles.wheelLeft} />
                <div className={styles.wheelRight} />
                <div className={styles.carLight} />
              </div>
              <span className={styles.streetLabel}>
                PUBLICIDAD EN MOVIMIENTO
              </span>
            </motion.div>
            <motion.div
              data-tad-stage="tablet"
              className={styles.tabletScene}
              style={{ opacity: tabletOpacity, scale: tabletScale }}
            >
              <div className={styles.headrest} />
              <div className={styles.device}>
                <div className={styles.deviceContent}>
                  <span>TAD · CREATIVIDAD DE EJEMPLO</span>
                  <strong>{displayBrand}</strong>
                  <p>Puede ir a su encuentro.</p>
                  <span className={styles.demoPill}>SIMULACIÓN</span>
                </div>
              </div>
              <div className={styles.mount} />
              <span className={styles.deviceCaption}>
                PANTALLA DETRÁS DEL REPOSACABEZAS DEL COPILOTO
              </span>
            </motion.div>
            <motion.div
              data-tad-stage="report"
              className={styles.reportScene}
              style={{ opacity: reportOpacity, y: reportY }}
            >
              <div className={styles.reportCard}>
                <div className={styles.reportHeader}>
                  <strong>
                    TAD<span>.</span>
                  </strong>
                  <small>EJEMPLO DIDÁCTICO</small>
                </div>
                <h3>Actividad con contexto.</h3>
                <p>
                  Del contenido distribuido a la reproducción registrada y su
                  validación.
                </p>
                <div className={styles.reportSteps}>
                  <span>Preparación</span>
                  <span>Reproducción</span>
                  <span>Validación</span>
                </div>
                <div className={styles.progressRail}>
                  <i />
                  <i />
                  <i />
                </div>
                <div className={styles.reportNote}>
                  SIN DATOS OPERATIVOS NI MÉTRICAS REALES
                </div>
              </div>
            </motion.div>
            <div className={styles.artBottom}>
              <span>CONCEPTO VISUAL · NO REPRESENTA UNA CAMPAÑA PUBLICADA</span>
              <span>↗</span>
            </div>
          </div>
        </div>
        <div className={styles.progressTrack} aria-hidden="true">
          <motion.div style={{ width: progressWidth }} />
        </div>
      </div>
      <div className={styles.staticSequence}>
        <p className={styles.overline}>TAD / EXPERIENCIA EN MOVIMIENTO</p>
        <h2 id="motion-story-title-static">
          De tu idea <em>a la ciudad.</em>
        </h2>
        {scenes.map((chapter, index) => (
          <article className={styles.staticCard} key={chapter.number}>
            <span>
              {chapter.number} · {chapter.eyebrow}
            </span>
            <div className={styles.staticPicture} data-static-art={index}>
              <StoryChapterArt chapter={index} />
              <span>
                {index === 0
                  ? "TAD · PUBLICIDAD EN MOVIMIENTO"
                  : index === 1
                    ? displayBrand
                    : "TAD · ACTIVIDAD ILUSTRATIVA"}
              </span>
            </div>
            <h3>{chapter.title}</h3>
            <p>{chapter.description}</p>
          </article>
        ))}
        <a className={styles.link} href="#creative-preview-title">
          Prueba tu creatividad <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
