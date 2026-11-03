import type { LandingRole } from "../../lib/landing/model";

export default function CityScene({
  role = "advertiser",
}: {
  role?: LandingRole;
}) {
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
          tag: "EL PRÓXIMO DESTINO",
          title: (
            <>
              puede ser
              <br />
              <em>tu marca.</em>
            </>
          ),
          note: (
            <>
              Una pantalla.
              <br />
              Muchas posibilidades.
            </>
          ),
        };
  return (
    <div
      className="landing-scene"
      data-perspective={role}
      aria-label={`Ilustración de taxi y pantalla: ${scene.label.toLowerCase()}`}
      role="img"
    >
      <div className="landing-scene-grid" />
      <div className="landing-scene-label">
        <span /> {scene.label}
      </div>
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
        REPRESENTACIÓN ILUSTRATIVA · SIN DATOS EN VIVO
      </span>
    </div>
  );
}
