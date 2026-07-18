// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — RemainderBar
//  Barra de progreso suave + pulso de fin de emisión.
//  Aplica: Peak-End Rule (Kahneman et al., 1993) + Secondary Motion (Disney).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface RemainderBarProps {
  /** Duración total en frames */
  totalFrames?: number;
  /** Color de la barra */
  color?: string;
  /** Altura en px */
  height?: number;
  /** Si pulsa al 100% */
  endPulse?: boolean;
}

const RemainderBar: React.FC<RemainderBarProps> = ({
  totalFrames = 2700,
  color = '#e51636',
  height = 3,
  endPulse = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = Math.min(1, frame / totalFrames);
  const widthPct = progress * 100;

  // Durante los últimos 60 frames emitir un "pulse glow" tip Peak-End
  const endRegionStart = totalFrames - 90;
  const isEndRegion = frame >= endRegionStart;
  const endPulseIntensity = isEndRegion
    ? interpolate(frame, [endRegionStart, endRegionStart + 30], [0, 1], { extrapolateLeft: 'clamp' })
    : 0;
  const baseOpacity = interpolate(frame, [0, 20], [0, 0.7], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const pulseScale = endPulse && endPulseIntensity > 0
    ? 1 + Math.sin((frame / fps) * 6) * 0.5 * endPulseIntensity
    : 1;

  const barGlow = endPulse && endPulseIntensity > 0 ? 20 * endPulseIntensity : 12;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 24,
        paddingLeft: 40,
      paddingRight: 40,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: '100%',
          height,
          borderRadius: height,
          background: 'rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${widthPct}%`,
            borderRadius: height,
            background: `linear-gradient(90deg, ${color}, ${color}CC)`,
            transform: `scaleX(${pulseScale})`,
            transformOrigin: 'left center',
            boxShadow: `0 0 ${barGlow}px ${color}80`,
            opacity: baseOpacity + (endPulseIntensity * 0.3),
            transition: 'transform 0.1s linear',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

RemainderBar.displayName = 'RemainderBar';

export { RemainderBar };
