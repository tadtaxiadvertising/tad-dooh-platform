// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — CounterAnim
//  Contador numérico animado para revelar estadísticas.
//  Aplica: Mere Exposure + Social Proof.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

interface CounterAnimProps {
  /** El número final a mostrar */
  target: number;
  /** Sufijo (ej: "x", "%", "RD$") */
  suffix?: string;
  /** Prefijo (ej: "5", "de") */
  prefix?: string;
  /** Duración de la animación en frames */
  durationFrames?: number;
  /** Color del número */
  color?: string;
  /** Tamaño en px del número */
  fontSize?: number;
  /** Label descriptivo debajo */
  label?: string;
  slideFrom?: 'left' | 'right' | 'bottom';
}

const CounterAnim: React.FC<CounterAnimProps> = ({
  target,
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

  // Easing: ease-out para el número (se ralentiza al acercarse al target)
  const progress = Math.min(1, Math.max(0, local / durationFrames));
  const easedProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
  const currentValue = Math.round(easedProgress * target);

  // Spring para slider de entrada
  const slideDistance = 60;
  const slideY = spring({
    frame: local,
    fps,
    from: slideFrom === 'left' ? -slideDistance : slideDistance,

    to: 0,
    config: { damping: 14, mass: 0.6, stiffness: 120 },
  });
  const slideX = slideFrom === 'left' || slideFrom === 'right'
    ? spring({
        frame: local,
        fps,
        from: slideFrom === 'left' ? -slideDistance : slideDistance,
        to: 0,
        config: { damping: 14, mass: 0.6, stiffness: 120 },
      })
    : 0;

  const opacity = interpolate(local, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowIntensity = interpolate(local, [15, 30 + (target > 0 ? 15 : 0)], [0.5, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Sequence from={0}>
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          {prefix ? (
            <span
              style={{
                fontSize: fontSize * 0.5,
                fontWeight: 500,
                color: color,
                opacity: 0.7,
              }}
            >
              {prefix}
            </span>
          ) : null}
          <span
            style={{
              fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
              fontSize,
              fontWeight: 900,
              color,
              lineHeight: 1,
              letterSpacing: '-2px',
              textShadow: `0 0 30px ${color}80`,
            }}
          >
            {currentValue}
          </span>
          {suffix ? (
            <span
              style={{
                fontSize: fontSize * 0.45,
                fontWeight: 700,
                color: color,
                opacity: 0.9,
              }}
            >
              {suffix}
            </span>
          ) : null}
        </div>
        {label ? (
          <p
            style={{
              fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
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
    </Sequence>
  );
};

export { CounterAnim };
export type { CounterAnimProps };
