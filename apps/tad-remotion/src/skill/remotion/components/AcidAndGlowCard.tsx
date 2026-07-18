// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Reusable Compounds
//  Acid & GlowCard, ParticleField, SubtleNoiseOverlay
//  Conjunto de componentes visuales premium reutilizables en toda la skill.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// ─── GlowCard ────────────────────────────────────────────────────────────────

export interface GlowCardProps {
  /** Color del glow */
  glowColor?: string;
  /** Intensidad del blur */
  blurPx?: number;
  /** Contenido hijos */
  children?: React.ReactNode;
  /** padding interno */
  padding?: string;
  /** border radius */
  radius?: number;
  /** Duración de entrada en frames */
  entranceFrames?: number;
  /** Delay de entrada en frames */
  delayFrames?: number;
  /** ¿La tarjeta flota suavemente? */
  float?: boolean;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  glowColor = '#e51636',
  blurPx = 32,
  padding = '32px',
  radius = 28,
  entranceFrames = 24,
  delayFrames = 0,
  float = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - delayFrames);

  const scale = spring({
    frame: local,
    fps,
    from: 0.92,
    to: 1,
    config: { damping: 14, mass: 0.7, stiffness: 120 },
  });
  const opacity = interpolate(local, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shadowBlur = interpolate(local, [16, entranceFrames], [blurPx * 0.5, blurPx], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const floatY = float
    ? Math.sin((frame / fps) * 1.6) * 6
    : 0;

  const glowAlpha = interpolate(local % 60, [0, 30, 60], [0.15, 0.35, 0.15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          padding,
          borderRadius: radius,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${glowColor.slice(0, 7)}40`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: `0 0 ${shadowBlur}px ${glowColor}${Math.round(glowAlpha * 255).toString(16).padStart(2, '0')}`,
          transform: `scale(${scale}) translateY(${floatY}px)`,
          opacity,
          maxWidth: '90%',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

GlowCard.displayName = 'GlowCard';
