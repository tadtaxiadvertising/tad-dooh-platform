// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — TadHook Component
//  Hook de apertura ultra-corto (2-4s) para captar atención en <2s.
//  Aplica: Bottom-Up Attention (Itti & Koch 1998) + Curiosity Gap (Loewenstein 1994).
//  Remotion best practices: spring + Easing.bezier, interpolate clampado, sin CSS strings.
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

interface TadHookProps {
 /** Texto del hook (pregunta o declaración sorprendente) */
 text?: string;
 /** Color de acento TAD */
 accentColor?: string;
 /** Duración total del hook en frames */
 durationInFrames?: number;
}

// spring helper: valores numéricos en px para translateY
const useSpringY = (frame: number, fps: number, from: number, to: number) =>
 spring({ frame, fps, from, to, config: { damping: 14, mass: 0.7, stiffness: 120 } });

const TadHook: React.FC<TadHookProps> = ({
 text = '¿Alguna vez te preguntaste por qué?',
 accentColor = '#e51636',
 durationInFrames = 75,
}) => {
 const frame = useCurrentFrame();
 const { fps, width, height } = useVideoConfig();
 const isVertical = height > width;

 // Fade in rápido: 0→1 en 12 frames (0.4s @ 30fps)
 const fadeIn = interpolate(frame, [0, 12], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.16, 1, 0.3, 1),
 });

 // Glow central: pulso en escala de 0.6→1 con bezier ease-out
 const dotScale = interpolate(frame, [10, 30, durationInFrames], [0.6, 1.05, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
 });

 // Texto entra desde abajo con spring
 const textY = useSpringY(Math.max(0, frame - 5), fps, 30, 0);

 // Dot pulsante: escala en cada ciclo de 40 frames
 const dotPulse = interpolate(frame % 40, [0, 20, 40], [0.8, 1.3, 0.8], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.4, 0, 0.2, 1),
 });

 const bgGradient = isVertical
  ? `radial-gradient(circle at 50% 40%, ${accentColor}18 0%, transparent 60%), #050505`
  : `radial-gradient(ellipse 50% 50% at 50% 40%, ${accentColor}15 0%, transparent 70%), #050505`;

 return (
  <AbsoluteFill
   style={{
    background: bgGradient,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: fadeIn,
    overflow: 'hidden',
   }}
  >
   {/* Dot central pulsante */}
   <div
    style={{
     position: 'absolute',
     top: isVertical ? '38%' : '45%',
     left: '50%',
     transform: `translate(-50%, -50%) scale(${dotScale * dotPulse})`,
     width: isVertical ? 40 : 60,
     height: isVertical ? 40 : 60,
     borderRadius: '50%',
     background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
     filter: `blur(${isVertical ? 4 : 6}px)`,
     zIndex: 1,
    }}
   />

   {/* Texto con entrada spring */}
   <div
    style={{
     transform: `translateY(${textY}px)`,
     textAlign: 'center',
     padding: '0 60px',
     zIndex: 2,
    }}
   >
    <h1
     style={{
      fontFamily: "'Inter', 'Outfit', -apple-system, sans-serif",
      fontSize: isVertical ? 60 : 64,
      fontWeight: 900,
      color: '#ffffff',
      lineHeight: 1.2,
      letterSpacing: '-0.5px',
      margin: 0,
      textShadow: `0 0 40px ${accentColor}80`,
     }}
    >
     {text.toUpperCase()}
    </h1>
   </div>
  </AbsoluteFill>
 );
};

export { TadHook };
export type { TadHookProps };