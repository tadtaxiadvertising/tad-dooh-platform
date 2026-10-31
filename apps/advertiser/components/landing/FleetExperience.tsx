"use client";

import { useState } from "react";
import { CITIES, demoConnectionStatus, type DemoCity } from "../../lib/landing/model";
import styles from "./fleet-experience.module.css";

type ConnectionStatus = ReturnType<typeof demoConnectionStatus>;
type DemoDevice = {
  id: string;
  online: boolean;
  hours: number | null;
  x: number;
  y: number;
  finance: "En revisión" | "Pendiente de pago";
};

const SCENARIOS: Record<DemoCity, DemoDevice[]> = {
  sd: [
    { id: "DEMO-01", online: true, hours: 0, x: 81, y: 81, finance: "Pendiente de pago" },
    { id: "DEMO-02", online: false, hours: 6, x: 187, y: 130, finance: "En revisión" },
    { id: "DEMO-03", online: false, hours: 24, x: 321, y: 72, finance: "En revisión" },
    { id: "DEMO-04", online: false, hours: null, x: 391, y: 167, finance: "Pendiente de pago" },
    { id: "DEMO-05", online: false, hours: Number.NaN, x: 274, y: 207, finance: "En revisión" },
  ],
  stgo: [
    { id: "DEMO-01", online: true, hours: 0, x: 108, y: 173, finance: "Pendiente de pago" },
    { id: "DEMO-02", online: false, hours: 23.5, x: 185, y: 85, finance: "En revisión" },
    { id: "DEMO-03", online: false, hours: 48, x: 314, y: 135, finance: "En revisión" },
    { id: "DEMO-04", online: false, hours: null, x: 400, y: 66, finance: "Pendiente de pago" },
    { id: "DEMO-05", online: false, hours: Number.NaN, x: 369, y: 216, finance: "En revisión" },
  ],
};

const STATUS: Record<ConnectionStatus, { label: string; legend: string; color: string }> = {
  online: { label: "En línea", legend: "Señal válida", color: "#22c55e" },
  recent_offline: { label: "Desconexión reciente", legend: "Sin conexión · menos de 24 h", color: "#eab308" },
  long_offline: { label: "Revisar señal", legend: "24 h o más · sin dato válido", color: "#dc2626" },
};

const ANSWERS: { id: ConnectionStatus; label: string }[] = [
  { id: "online", label: "Tiene una señal válida" },
  { id: "recent_offline", label: "Lleva menos de 24 h sin conexión" },
  { id: "long_offline", label: "Pasaron 24 h o falta un dato válido" },
];

function signalLabel(device: DemoDevice): string {
  if (device.online) return "Señal válida en este escenario";
  if (device.hours === null) return "Sin registro de última señal";
  if (!Number.isFinite(device.hours)) return "Registro de fecha inválido";
  return `Última señal hace ${device.hours.toLocaleString("es-DO")} h`;
}

function diagnosisExplanation(device: DemoDevice): string {
  if (device.online) return "La señal válida lo muestra en verde. Su estado de pago se consulta por separado.";
  if (device.hours === null) return "No hay registro de última señal: se muestra en rojo para revisar, sin asumir que dejó de reproducir.";
  if (!Number.isFinite(device.hours)) return "La fecha de la última señal no es válida: se muestra en rojo porque el dato necesita revisión.";
  if (device.hours < 24) return `Lleva ${device.hours.toLocaleString("es-DO")} h sin conexión, menos de 24 h: por eso aparece en amarillo.`;
  return `Lleva ${device.hours.toLocaleString("es-DO")} h sin conexión. Desde las 24 h aparece en rojo para revisar.`;
}

export default function FleetExperience({ onDemoUsed }: { onDemoUsed?: (action: "city" | "device" | "diagnosis") => void }) {
  const [city, setCity] = useState<DemoCity>("sd");
  const [selectedId, setSelectedId] = useState("DEMO-02");
  const [answer, setAnswer] = useState<ConnectionStatus | null>(null);
  const devices = SCENARIOS[city];
  const selected = devices.find(device => device.id === selectedId) ?? devices[1];
  const selectedStatus = demoConnectionStatus(selected.online, selected.hours);
  const counts = devices.reduce<Record<ConnectionStatus, number>>((result, device) => {
    result[demoConnectionStatus(device.online, device.hours)] += 1;
    return result;
  }, { online: 0, recent_offline: 0, long_offline: 0 });

  const changeCity = (next: DemoCity) => {
    if (city === next) return;
    setCity(next);
    setAnswer(null);
    onDemoUsed?.("city");
  };

  const selectDevice = (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id);
    setAnswer(null);
    onDemoUsed?.("device");
  };

  return <div className={styles.experience}>
    <div className={styles.header}>
      <div><p className={styles.eyebrow}>MINI CENTRO DE CONTROL</p><h4>Una señal cuenta una historia.</h4></div>
      <span className={styles.demoBadge}>Datos de demostración</span>
    </div>
    <p className={styles.intro}>Elige un dispositivo ficticio y descubre qué significa su color. Este escenario no muestra la red real ni confirma cobertura.</p>

    <div className={styles.citySwitch} role="group" aria-label="Ciudad del escenario de flota">
      {(Object.entries(CITIES) as [DemoCity, string][]).map(([id, name]) => <button type="button" key={id} aria-pressed={city === id} onClick={() => changeCity(id)}>{name}</button>)}
    </div>

    <dl className={styles.summary} aria-label="Resumen de los cinco dispositivos de demostración">
      <div><dt>En línea</dt><dd><span className={styles.dot} style={{ backgroundColor: STATUS.online.color }} />{counts.online}</dd></div>
      <div><dt>Menos de 24 h</dt><dd><span className={styles.dot} style={{ backgroundColor: STATUS.recent_offline.color }} />{counts.recent_offline}</dd></div>
      <div><dt>Revisar señal</dt><dd><span className={styles.dot} style={{ backgroundColor: STATUS.long_offline.color }} />{counts.long_offline}</dd></div>
    </dl>

    <figure className={styles.map}>
      <svg viewBox="0 0 480 280" aria-hidden="true" focusable="false">
        <rect width="480" height="280" rx="12" fill="#131717" />
        <g stroke="#232b29" strokeWidth="1">
          {[40, 80, 120, 160, 200, 240].map(y => <path key={`h${y}`} d={`M0 ${y}H480`} />)}
          {[40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440].map(x => <path key={`v${x}`} d={`M${x} 0V280`} />)}
        </g>
        <path d={city === "sd" ? "M-25 240Q115 30 249 124T520 34" : "M-25 65Q95 280 238 114T515 165"} stroke="#263731" strokeWidth="34" fill="none" />
        <path d="M-15 30L495 240M75-20L280 300M275-30L420 300" stroke="#34403a" strokeWidth="10" fill="none" />
        <path d={city === "sd" ? "M81 81L187 130L321 72L391 167L274 207" : "M108 173L185 85L314 135L400 66L369 216"} stroke="#a39d67" strokeWidth="1.5" strokeDasharray="5 7" fill="none" />
        {devices.map(device => {
          const status = demoConnectionStatus(device.online, device.hours);
          return <g key={device.id} transform={`translate(${device.x} ${device.y})`}>
            {device.id === selectedId && <circle r="18" fill="none" stroke="#FFD400" strokeWidth="2" />}
            <circle r="11" fill="#131717" stroke={STATUS[status].color} strokeWidth="2" />
            <circle r="4" fill={STATUS[status].color} />
            <text y="-24" textAnchor="middle" fill="#e8ece6" fontSize="11" fontFamily="system-ui, sans-serif">{device.id}</text>
          </g>;
        })}
      </svg>
      <figcaption><strong>{CITIES[city]}</strong><span>Esquema ilustrativo · sin GPS real</span></figcaption>
    </figure>

    <ul className={styles.legend} aria-label="Leyenda del estado de conexión">
      {(Object.entries(STATUS) as [ConnectionStatus, typeof STATUS.online][]).map(([status, info]) => <li key={status}><span className={styles.dot} style={{ backgroundColor: info.color }} />{info.legend}</li>)}
    </ul>

    <div className={styles.deviceHeading}><h5>Inspecciona una señal</h5><span>5 dispositivos ficticios</span></div>
    <ul className={styles.deviceList} aria-label="Selecciona un dispositivo de demostración">
      {devices.map(device => {
        const status = demoConnectionStatus(device.online, device.hours);
        return <li key={device.id}><button type="button" aria-pressed={selectedId === device.id} onClick={() => selectDevice(device.id)}>
          <span className={styles.deviceName}><span className={styles.dot} style={{ backgroundColor: STATUS[status].color }} /><strong>{device.id}</strong></span>
          <span className={styles.deviceSignal}><span>{STATUS[status].label}</span><small>{signalLabel(device)}</small></span>
          <span className={styles.inspectArrow} aria-hidden="true">↗</span>
        </button></li>;
      })}
    </ul>

    <div className={styles.inspector}>
      <p className={styles.eyebrow}>INSPECCIÓN · {selected.id}</p>
      <dl className={styles.deviceFacts}><div><dt>Conectividad</dt><dd><span className={styles.dot} style={{ backgroundColor: STATUS[selectedStatus].color }} />{STATUS[selectedStatus].label}</dd></div><div><dt>Último ping ficticio</dt><dd>{signalLabel(selected)}</dd></div><div><dt>Estado financiero ficticio</dt><dd className={styles.financeBadge}>{selected.finance}</dd></div></dl>
      <p className={styles.financeNote}>El indicador financiero está separado: un pago pendiente no cambia el color de conexión.</p>
      <fieldset className={styles.challenge}>
        <legend>Resuelve la alerta</legend>
        <p>¿Qué explica el color de {selected.id}?</p>
        <div className={styles.answers}>{ANSWERS.map(option => <button type="button" key={option.id} aria-pressed={answer === option.id} onClick={() => { setAnswer(option.id); onDemoUsed?.("diagnosis"); }}>{option.label}</button>)}</div>
        <div className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">{answer ? <><strong>{answer === selectedStatus ? "Correcto. " : "Veamos la señal. "}</strong>{diagnosisExplanation(selected)}<span>Esta respuesta solo explica la demo; no modifica ningún dispositivo.</span></> : "Una pista: revisa el último ping. Amarillo significa menos de 24 horas; rojo, 24 horas o más o un dato ausente/inválido."}</div>
      </fieldset>
    </div>
    <noscript><p className={styles.noScript}>Escenario inicial de Santo Domingo. La lista y la leyenda explican todos los estados; el cambio de ciudad y el ejercicio necesitan JavaScript.</p></noscript>
  </div>;
}
