// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — KineticText Component
//  Texto animado con interletraje, reveal progresivo y glow.
//  Aplica Processing Fluency (Reber et al. 2004) + Disney animation principles.
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

interface KineticTextProps {
  text: string;
  accentColor?: string;
  fontSize?: number;
  fontWeight?: number;
  fontColor?: string;
  revealCharByChar?: boolean;
  revealDelay?: number;
}

const KineticText: React.FC<KineticTextProps> = ({
  text,
  accentColor = '#e51636',
  fontSize = 56,
  fontWeight = 800,
  fontColor = '#f8fafc',
  revealCharByChar = true,
  revealDelay = 15,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - revealDelay;

  if (!revealCharByChar) {
    // Todo el texto aparece en fade
    const opacity = interpolate(local, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const y = spring({ frame: local, fps, from: 20, to: 0, config: { damping: 14, mass: 0.7 } });
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity, padding: '0 80px' }}>
        <h1
          style={{
            fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
            fontSize,
            fontWeight,
            color: fontColor,
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            textAlign: 'center',
            transform: `translateY(${y}px)`,
          }}
        >
          {text}
        </h1>
      </AbsoluteFill>
    );
  }

  // Reveal char by char (letters appear progressively with spring)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 60px' }}>
      <h1
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.02em',
          fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
          fontSize,
          fontWeight,
          color: fontColor,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
          textAlign: 'center',
        }}
      >
        {text.split('').map((char, i) => {
          const charFrame = local - i * 2;
          if (charFrame < 0) return null;
          const opacity = interpolate(charFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const y = spring({
            frame: charFrame,
            fps,
            from: 15,
            to: 0,
            config: { damping: 16, mass: 0.5 },
          });
          const letterSpacing = interpolate(charFrame, [0, 15], [0.3, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

          return (
            <span
              key={i}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                letterSpacing: `${letterSpacing}em`,
                display: 'inline-block',
                color: char === ' ' ? 'transparent' : fontColor,
                textShadow: char !== ' ' ? `0 0 20px ${accentColor}60` : 'none',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </h1>
    </AbsoluteFill>
  );
};

export { KineticText };
export type { KineticTextProps };
