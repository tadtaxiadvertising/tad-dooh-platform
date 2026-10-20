import React from "react";

/**
 * CityMapBackdrop — malla urbana nocturna con nodos DOOH pulsantes.
 *
 * Identidad visual del portal Advertiser: la ciudad como lienzo, cada nodo
 * es una pantalla viva de la flota. Reutilizado por el login y el wizard
 * de bienvenida para consistencia absoluta de marca.
 */
const NODES: Array<{ x: string; y: string; delay: string }> = [
  { x: "18%", y: "22%", delay: "0s" },
  { x: "34%", y: "18%", delay: "0.6s" },
  { x: "52%", y: "27%", delay: "1.2s" },
  { x: "71%", y: "19%", delay: "0.3s" },
  { x: "84%", y: "34%", delay: "0.9s" },
  { x: "27%", y: "68%", delay: "1.5s" },
  { x: "45%", y: "74%", delay: "0.4s" },
  { x: "66%", y: "62%", delay: "1.1s" },
  { x: "78%", y: "73%", delay: "0.7s" },
  { x: "15%", y: "88%", delay: "1.3s" },
  { x: "88%", y: "85%", delay: "0.2s" },
  { x: "59%", y: "46%", delay: "1s" },
];

interface CityMapBackdropProps {
  /** absolute (default) para contenerse al padre, fixed para toda la ventana */
  position?: "absolute" | "fixed";
}

export default function CityMapBackdrop({
  position = "absolute",
}: CityMapBackdropProps) {
  return (
    <div
      className={`pointer-events-none inset-0 overflow-hidden ${position === "fixed" ? "fixed" : "absolute"}`}
      aria-hidden="true"
    >
      {/* Orbes ambientales */}
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#FFD400]/[0.07] blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-blue-500/[0.05] blur-[140px]" />

      {/* Malla urbana */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.13]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="tad-street-grid"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 60 L120 60 M60 0 L60 120"
              stroke="#1f1f1f"
              strokeWidth="0.5"
              fill="none"
            />
          </pattern>
          <pattern
            id="tad-avenues"
            width="240"
            height="240"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 120 L240 120 M120 0 L120 240"
              stroke="#2a2a2a"
              strokeWidth="1"
              fill="none"
            />
          </pattern>
          <radialGradient id="tad-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD400" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#FFD400" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFD400" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#tad-street-grid)" />
        <rect width="100%" height="100%" fill="url(#tad-avenues)" />
        {NODES.map((n, i) => (
          <circle
            key={`${n.x}-${n.y}`}
            cx={n.x}
            cy={n.y}
            r="3"
            fill="url(#tad-node-glow)"
            className="animate-pulse-node"
            style={{ animationDelay: n.delay }}
          />
        ))}
      </svg>

      {/* Viñeta para foco central */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
