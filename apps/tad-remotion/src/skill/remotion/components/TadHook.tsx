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
  /** Texto del hook (pregunta o declaración sorprendente) — alias: headline */
  text?: string;
  headline?: string;
  /** Subtítulo / subline */
  subline?: string;
  /** Color de acento TAD */
  accentColor?: string;
  /** Color stack para gradientes */
  colorStack?: string[];
  /** Textura: 'neon' | 'particles' | 'minimal' */
  texture?: string;
  /** Profundidad visual */
  depth?: number;
  /** Contraste: 'high' | 'medium' | 'low' */
  contrast?: string;
  /** Easing de entrada */
  easingIn?: string;
  /** Easing de salida */
  easingOut?: string;
  /** Duración total del hook en frames */
  durationInFrames?: number;
}

// spring helper: valores numéricos en px para translateY
const useSpringY = (frame: number, fps: number, from: number, to: number) =>
  spring({ frame, fps, from, to, config: { damping: 14, mass: 0.7, stiffness: 120 } });

const TadHook: React.FC<TadHookProps> = ({
  text,
  headline,
  subline,
  accentColor = '#e51636',
  colorStack,
  texture = 'minimal',
  depth = 3,
  contrast = 'high',
  easingIn,
  easingOut,
  durationInFrames = 75,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Resolve alias: headline > text
  const hookText = text || headline || '¿Alguna vez te preguntaste por qué?';
  const contrastMultiplier = contrast === 'high' ? 1 : contrast === 'medium' ? 0.7 : 0.5;

  // Fade in rápido: 0→1 en 12 frames (0.4s @ 30fps)
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Glow central: pulso en escala
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

  // Configurar textura
  const particleCount = texture === 'particles' ? 12 : texture === 'neon' ? 6 : 0;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const x = 10 + (i * 80) % 90;
    const y = 10 + (i * 60) % 80;
    const size = texture === 'particles' ? 2 + (i % 3) : 0.5;
    const particleOpacity = interpolate(
      (frame + i * 10) % 60,
      [0, 30, 60],
      [0, 0.5 * contrastMultiplier, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    particles.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          borderRadius: '50%',
          background: colorStack?.[i % (colorStack?.length || 1)] || accentColor,
          opacity: particleOpacity,
          filter: `blur(${texture === 'neon' ? 4 : 1}px)`,
          transform: `translateY(${Math.sin((frame + i * 20) * 0.05) * 10}px)`,
        }}
      />
    );
  }

  const bgGradient = isVertical
    ? `radial-gradient(circle at 50% 40%, ${accentColor}${Math.round(24 * contrastMultiplier).toString(16).padStart(2, '0')} 0%, transparent 60%), #050505`
    : `radial-gradient(ellipse 50% 50% at 50% 40%, ${accentColor}${Math.round(21 * contrastMultiplier).toString(16).padStart(2, '0')} 0%, transparent 70%), #050505`;

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
      {/* Texture particles */}
      {particles}

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
          opacity: 0.6 * contrastMultiplier,
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
            fontSize: isVertical ? (depth > 3 ? 60 : 52) : 64,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            margin: 0,
            textShadow: `0 0 ${40 * contrastMultiplier}px ${accentColor}80`,
          }}
        >
          {hookText.toUpperCase()}
        </h1>
        {subline ? (
          <p
            style={{
              fontFamily: "'Inter', 'Outfit', -apple-system, sans-serif",
              fontSize: isVertical ? 24 : 28,
              fontWeight: 400,
              color: '#94a3b8',
              marginTop: 16,
              opacity: fadeIn,
            }}
          >
            {subline}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export { TadHook };
export type { TadHookProps };