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
  /** Precisión decimal */
  precision?: number;
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
  /** Tensión del spring */
  tension?: number;
  /** Fricción del spring */
  friction?: number;
  /** Gap entre número y sufijo */
  suffixGap?: number;
  /** Easing como string */
  easing?: string;
  /** Glow trail al final */
  glowTrail?: boolean;
  /** Mostrar bar chart */
  barChart?: boolean;
  /** Datos del bar chart */
  barData?: Array<{ label: string; value: number; color: string }>;
  /** Label arriba de la barra */
  barLabelAbove?: boolean;
  /** Dirección de crecimiento de la barra */
  barGrowth?: 'from-bottom' | 'from-left';
  /** Radio de esquinas de la barra */
  barRadius?: number;
  /** Padding entre barras */
  barPadding?: number;
  /** Duración del crecimiento en frames */
  barGrowthDurationFrames?: number;
  /** Número de dígitos */
  digits?: number;
}

const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";

// spring direccional: desde la dirección elegida hacia 0
const useSlideSpring = (
  frame: number,
  fps: number,
  slideFrom: 'left' | 'right' | 'bottom',
  distance: number,
  config?: { damping: number; mass: number; stiffness: number },
): { x: number; y: number } => {
  const cfg = config || { damping: 14, mass: 0.6, stiffness: 120 };

  const y = slideFrom === 'bottom'
    ? spring({ frame, fps, from: distance, to: 0, config: cfg })
    : 0;

  const x = slideFrom !== 'bottom'
    ? spring({ frame, fps, from: slideFrom === 'left' ? -distance : distance, to: 0, config: cfg })
    : 0;

  return { x, y };
};

const CounterAnim: React.FC<CounterAnimProps> = ({
  target = 100,
  suffix = '',
  prefix = '',
  precision = 0,
  durationFrames = 30,
  color = '#fad400',
  fontSize = 80,
  label,
  slideFrom = 'bottom',
  tension = 180,
  friction = 12,
  suffixGap = 6,
  easing = 'ease-out',
  glowTrail = false,
  barChart = false,
  barData,
  barLabelAbove = false,
  barGrowth = 'from-bottom',
  barRadius = 8,
  barPadding = 14,
  barGrowthDurationFrames = 45,
  digits,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame);

  // Spring config from tension/friction
  const springConfig = {
    damping: friction * 1.5,
    mass: 0.6,
    stiffness: tension,
  };

  // Progreso de 0→1
  const progress = interpolate(local, [0, durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const currentValue = (progress * target).toFixed(precision);

  // Slider spring
  const { x: slideX, y: slideY } = useSlideSpring(local, fps, slideFrom, 60, springConfig);

  // Glow trail
  const glowProgress = glowTrail
    ? interpolate(local, [durationFrames, durationFrames + 15], [0.5, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    : interpolate(local, [durationFrames, durationFrames + 15], [0.5, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

  const opacity = interpolate(local, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Bar chart
  const renderBarChart = () => {
    if (!barChart || !barData || barData.length === 0) return null;
    const maxValue = Math.max(...barData.map((d) => d.value), 1);

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: barPadding,
          marginTop: 24,
          height: fontSize * 1.2,
        }}
      >
        {barData.map((bar, i) => {
          const barProgress = interpolate(
            Math.max(0, local - i * 5),
            [0, barGrowthDurationFrames],
            [0, bar.value / maxValue],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const barHeight = Math.max(barProgress * fontSize * 1.2, 2);
          const barOpacity = interpolate(
            Math.max(0, local - i * 5),
            [0, 10],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                opacity: barOpacity,
              }}
            >
              {barLabelAbove ? (
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: fontSize * 0.18,
                    fontWeight: 600,
                    color: bar.color,
                  }}
                >
                  {bar.label}
                </span>
              ) : null}
              <div
                style={{
                  width: fontSize * 0.3,
                  height: barHeight,
                  borderRadius: barRadius,
                  background: bar.color,
                  transition: 'none',
                  boxShadow: glowTrail ? `0 0 10px ${bar.color}60` : 'none',
                }}
              />
              {!barLabelAbove ? (
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: fontSize * 0.16,
                    fontWeight: 500,
                    color: '#94a3b8',
                  }}
                >
                  {bar.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: suffixGap }}>
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
            fontVariantNumeric: 'tabular-nums',
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

      {/* Bar chart */}
      {renderBarChart()}

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