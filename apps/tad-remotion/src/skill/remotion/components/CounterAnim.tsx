// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — CounterAnim Component
//  Contador numérico animado para estadísticas y social proof.
//  Aplica: Mere Exposure + Social Proof + Number Bias (Dehaene 1992).
//  Remotion best practices: spring direccional correcta, interpolate con clamp y bezier.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
 AbsoluteFill,
 interpolate,
 spring,
 useCurrentFrame,
 useVideoConfig,
 Easing,
} from 'remotion';

interface CounterAnimProps {
 /** Número final a mostrar */
 target?: number;
 /** Sufijo (ej: "x", "%", "RD$") */
 suffix?: string;
 /** Prefijo (ej: "5", "de") */
 prefix?: string;
 /** Frames que dura la animación del contador */
 durationFrames?: number;
 /** Color principal del número */
 color?: string;
 /** Tamaño en px del número */
 fontSize?: number;
 /** Label descriptivo debajo */
 label?: string;
 /** Dirección de entrada del slider */
 slideFrom?: 'left' | 'right' | 'bottom';
}

const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";

// spring direccional: desde la dirección elegida hacia 0
const useSlideSpring = (
 frame: number,
 fps: number,
 slideFrom: 'left' | 'right' | 'bottom',
 distance: number,
): { x: number; y: number } => {
 const config = { damping: 14, mass: 0.6, stiffness: 120 };

 const y = slideFrom === 'bottom'
  ? spring({ frame, fps, from: distance, to: 0, config })
  : 0;

 const x = slideFrom !== 'bottom'
  ? spring({ frame, fps, from: slideFrom === 'left' ? -distance : distance, to: 0, config })
  : 0;

 return { x, y };
};

const CounterAnim: React.FC<CounterAnimProps> = ({
 target = 100,
 suffix = '',
 prefix = '',
 durationFrames = 30,
 color = '#fad400',
 fontSize = 80,
 label,
 slideFrom = 'bottom',
}) => {
 const frame = useCurrentFrame();
 const { fps } = useVideoConfig();
 const local = Math.max(0, frame);

 // Progreso de 0→1 con cubic ease-out
 const progress = interpolate(local, [0, durationFrames], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
 });
 const currentValue = Math.round(progress * target);

 // Slider spring
 const { x: slideX, y: slideY } = useSlideSpring(local, fps, slideFrom, 60);

 // Glow entra después de que el número aparece
 const glowProgress = interpolate(local, [durationFrames, durationFrames + 15], [0.5, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
 });

 const opacity = interpolate(local, [0, 15], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.16, 1, 0.3, 1),
 });

 return (
  <AbsoluteFill
   style={{
    justifyContent: 'center',
    alignItems: 'center',
    opacity,
    transform: `translate(${slideX}px, ${slideY}px)`,
    textAlign: 'center',
    gap: 12,
   }}
  >
   {/* Número con prefijo + suffix */}
   <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
    {prefix ? (
     <span
      style={{
       fontFamily: FONT_FAMILY,
       fontSize: fontSize * 0.5,
       fontWeight: 500,
       color,
       opacity: 0.7,
      }}
     >
      {prefix}
     </span>
    ) : null}
    <span
     style={{
      fontFamily: FONT_FAMILY,
      fontSize,
      fontWeight: 900,
      color,
      lineHeight: 1,
      letterSpacing: '-2px',
      textShadow: `0 0 ${Math.round(30 * glowProgress)}px ${color}80`,
     }}
    >
     {currentValue}
    </span>
    {suffix ? (
     <span
      style={{
       fontFamily: FONT_FAMILY,
       fontSize: fontSize * 0.45,
       fontWeight: 700,
       color,
       opacity: 0.9,
      }}
     >
      {suffix}
     </span>
    ) : null}
   </div>

   {/* Label */}
   {label ? (
    <p
     style={{
      fontFamily: FONT_FAMILY,
      fontSize: fontSize * 0.28,
      fontWeight: 500,
      color: '#94a3b8',
      margin: 0,
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
     }}
    >
     {label}
    </p>
   ) : null}
  </AbsoluteFill>
 );
};

export { CounterAnim };
export type { CounterAnimProps };