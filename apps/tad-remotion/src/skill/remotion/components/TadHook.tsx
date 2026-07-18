// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — TadHook Component
//  Hook de apertura ultra-corto (2-4s) para captar atención en <2s.
//  Aplica: Bottom-Up Attention (Itti & Koch, 1998) + Curiosity Gap (Loewenstein, 1994).
//  Usado en: NarrativeBeat beatId=1 (hook).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

interface TadHookProps {
  /** Texto del hook (pregunta o declaración sorprendente) */
  text: string;
  /** Color de acento */
  accentColor?: string;
  /** Duración de la escena en frames */
  durationInFrames?: number;
}

const TadHook: React.FC<TadHookProps> = ({
  text = '¿Alguna vez te preguntaste por qué?',
  accentColor = '#e51636',
  durationInFrames = 75, // ~2.5s @ 30fps
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Easing: entrada rápida + pausa dramática de 0.3s, luego continue
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowScale = interpolate(frame, [10, 30, 60], [0.6, 1.05, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const textY = spring({ frame: frame - 5, fps, from: 30, to: 0, config: { damping: 14, mass: 0.7 } });
  const dotPulse = interpolate(frame % 40, [0, 20, 40], [0.8, 1.3, 0.8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

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
      {/* Dot central pulsante (elemento de sorpresa visual) */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '38%' : '45%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${dotPulse})`,
          width: isVertical ? 40 : 60,
          height: isVertical ? 40 : 60,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
          filter: `blur(${isVertical ? 4 : 6}px)`,
          zIndex: 1,
        }}
      />

      {/* Texto */}
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
            fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
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
