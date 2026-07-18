// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — ParticleField
//  Campo de partículas doradas sutiles para fondos premium.
//  Aplica: Disney Secondary Motion + Parallax sutil.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';

export interface ParticleFieldProps {
  /** Color de las partículas */
  color?: string;
  /** Cantidad de partículas */
  count?: number;
  /** Tamaño máximo (px) */
  maxSize?: number;
  /** Si están encendidas por defecto */
  opacity?: number;
  /** Velocidad de drift */
  speed?: number;
}

const ParticleField: React.FC<ParticleFieldProps> = ({
  color = '#fad400',
  count = 35,
  maxSize = 2.5,
  opacity = 0.5,
  speed = 0.4,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Semilla determinística por seed (evita destellos aleatorios frame a frame)
  const particles = React.useMemo(() => {
    const out: { x: number; y: number; size: number; seed: number }[] = [];
    for (let i = 0; i < count; i++) {
      const seed = i * 9973;
      out.push({
        x: random(seed) * width,
        y: random(seed + 1) * height,
        size: random(seed + 2) * maxSize,
        seed,
      });
    }
    return out;
  }, [count, maxSize, width, height]);

  const globalOpacity = interpolate(frame, [0, 30], [0, opacity], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 1 }}>
      {particles.map((p, i) => {
        const drift = (frame * speed) % height;
        const parallaxY = (p.y + drift * (0.1 + (p.seed % 5) * 0.05)) % height;
        const twinkle = interpolate((frame * 0.8 + p.seed) % 60, [0, 30, 60], [0.2, 1, 0.2], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: parallaxY,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 ${p.size * 3}px ${color}80`,
              opacity: globalOpacity * twinkle,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

ParticleField.displayName = 'ParticleField';

export { ParticleField };
