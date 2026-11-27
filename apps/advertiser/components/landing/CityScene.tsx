import {
  CITIES,
  type DemoCity,
  type LandingRole,
} from "../../lib/landing/model";
import { OBJECTIVES, type DemoObjective } from "../../lib/landing/content";
import styles from "./cabin-hero.module.css";

export default function CityScene({
  role = "advertiser",
  city = "sd",
  objective = "awareness",
  brandName = "",
}: {
  role?: LandingRole;
  city?: DemoCity;
  objective?: DemoObjective;
  brandName?: string;
}) {
  // Text is for this illustrative preview only: no persistence or analytics.
  const displayBrand = brandName.trim().replace(/\s+/g, " ").slice(0, 24);
  const preview = {
    awareness: {
      tag: "TU MARCA, PRESENTE",
      first: "tu marca.",
      second: "en camino.",
      note: "Una idea que acompaña el recorrido.",
    },
    launch: {
      tag: "UNA NOVEDAD",
      first: "algo nuevo.",
      second: "en la ciudad.",
      note: "Presenta lo nuevo durante el trayecto.",
    },
    local: {
      tag: "CERCA DE TU GENTE",
      first: "tu ciudad.",
      second: "tu historia.",
      note: "Conecta tu mensaje con lo local.",
    },
  }[objective];
  const scene =
    role === "driver"
      ? {
          label: "TU RECORRIDO ABRE POSIBILIDADES",
          tag: "UN NUEVO CAMINO",
          title: (
            <>
              tu taxi.
              <br />
              <em>tu recorrido.</em>
            </>
          ),
          note: (
            <>
              Participa con
              <br />
              condiciones claras.
            </>
          ),
        }
      : {
          label: "LA CIUDAD ES TU ESCENARIO",
          tag: preview.tag,
          title: (
            <>
              {displayBrand || preview.first}
              <br />
              <em>{preview.second}</em>
            </>
          ),
          note: <>{preview.note}</>,
        };
  const sceneDescription =
    role === "advertiser"
      ? "Ilustración desde el asiento trasero: tablet detrás del reposacabezas del copiloto"
      : `Ilustración de taxi y pantalla: ${scene.label.toLowerCase()}`;
  const sceneClassName =
    role === "advertiser" ? `landing-scene ${styles.cabin}` : "landing-scene";
  const sceneAriaLabel =
    sceneDescription +
    (role === "advertiser"
      ? `, escenario ${CITIES[city]}, objetivo ${OBJECTIVES[objective]}` +
        (displayBrand ? `, marca de ejemplo ${displayBrand}` : "")
      : "");
  return (
    <div
      className={sceneClassName}
      data-perspective={role}
      data-city={city}
      data-objective={role === "advertiser" ? objective : undefined}
      data-brand-custom={
        role === "advertiser" && displayBrand ? "true" : undefined
      }
      aria-label={sceneAriaLabel}
      role="img"
    >
      {role === "advertiser" ? (
        <div aria-hidden="true" data-cabin-illustration>
          <div className={styles.window} />
          <div className={styles.seat} />
          <div className={styles.passenger} />
        </div>
      ) : (
        <div className="landing-scene-grid" />
      )}
      <div className="landing-scene-label">
        <span />{" "}
        {role === "advertiser"
          ? `ESCENA · ${CITIES[city].toUpperCase()}`
          : scene.label}
      </div>
      {role === "driver" && (
        <>
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="landing-road">
            <span />
            <span />
            <span />
          </div>
          <div className="landing-taxi">
            <div className="landing-taxi-roof">TAXI</div>
            <div className="landing-taxi-window" />
            <div className="landing-taxi-door" />
            <div className="landing-wheel landing-wheel-left" />
            <div className="landing-wheel landing-wheel-right" />
          </div>
        </>
      )}
      <div className="landing-screen">
        <div className="landing-screen-camera" />
        <div className="landing-screen-content">
          <span className="landing-screen-tag">{scene.tag}</span>
          <strong>{scene.title}</strong>
          <div className="landing-screen-footer">
            <span>
              TAD<span className="landing-brand-dot">.</span>
            </span>
            <span>PUBLICIDAD EN MOVIMIENTO ↗</span>
          </div>
        </div>
      </div>
      <div className="landing-scene-note">
        <span>{role === "advertiser" ? "01" : "02"} /</span>
        {scene.note}
      </div>
      <span className="landing-scene-caption">
        VISTA CONCEPTUAL · NO REPRESENTA UNA CAMPAÑA PUBLICADA
      </span>
    </div>
  );
}
