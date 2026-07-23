// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — KineticText Component
//  Texto animado con reveal progresivo letra-a-letra y glow.
//  Aplica: Processing Fluency (Reber et al. 2004) + Disney animation principles.
//  Remotion best practices: spring + Easing.bezier, clamp en interpolate, sin CSS strings.
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

interface KineticTextProps {
  text?: string;
  accentColor?: string;
  fontSize?: number;
  fontWeight?: number;
  fontColor?: string;
  /** Revelar letra por letra (true) o fade completo (false) */
  revealCharByChar?: boolean;
  /** Frames de delay antes de comenzar el reveal */
  revealDelay?: number;
  /** Cursor trail effect */
  cursorTrail?: boolean;
  /** Blend mode */
  blend?: 'normal' | 'screen' | 'overlay';
  /** Espaciado entre letras */
  letterSpacing?: number;
  /** Alto de línea */
  lineHeight?: number;
  /** Ancho máximo */
  maxWidth?: number;
  /** Alineación */
  align?: 'center' | 'left' | 'right';
  /** Vignette detrás del texto */
  vignetteBehindText?: boolean;
  /** Glow detrás del texto */
  glowBehindText?: boolean;
  /** Color del glow (fallback accentColor) */
  glowColor?: string;
  /** Color stack */
  colorStack?: string[];
}

const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";

const useSpringY = (frame: number, fps: number, from: number, to: number) =>
  spring({ frame, fps, from, to, config: { damping: 16, mass: 0.5, stiffness: 140 } });

const KineticText: React.FC<KineticTextProps> = ({
  text = 'Impulsa tu marca',
  accentColor = '#e51636',
  fontSize = 56,
  fontWeight = 800,
  fontColor = '#f8fafc',
  revealCharByChar = true,
  revealDelay = 15,
  cursorTrail = false,
  blend = 'normal',
  letterSpacing: ls = -0.5,
  lineHeight = 1.2,
  maxWidth = 1200,
  align = 'center',
  vignetteBehindText = false,
  glowBehindText = false,
  glowColor,
  colorStack,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - revealDelay);
  const finalGlowColor = glowColor || accentColor;

  const blendMode =
    blend === 'screen' ? 'screen' :
    blend === 'overlay' ? 'overlay' : 'normal';

  if (!revealCharByChar) {
    const opacity = interpolate(local, [0, 20], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    const y = useSpringY(local, fps, 20, 0);

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
          opacity,
          padding: '0 80px',
        }}
      >
        {glowBehindText ? (
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${finalGlowColor}20 0%, transparent 70%)`,
              opacity: 0.5,
            }}
          />
        ) : null}
        {vignetteBehindText ? (
          <AbsoluteFill
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
            }}
          />
        ) : null}
        <h1
          style={{
            fontFamily: FONT_FAMILY,
            fontSize,
            fontWeight,
            color: fontColor,
            lineHeight,
            letterSpacing: `${ls}px`,
            textAlign: align,
            maxWidth,
            transform: `translateY(${y}px)`,
            margin: 0,
            mixBlendMode: blendMode,
          }}
        >
          {text}
        </h1>
      </AbsoluteFill>
    );
  }

  // Reveal letra por letra con spring individual
  const chars = text.split('');
  const charRevealDelay = cursorTrail ? 1 : 2;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
        padding: '0 60px',
      }}
    >
      {glowBehindText ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${finalGlowColor}18 0%, transparent 70%)`,
          }}
        />
      ) : null}
      {vignetteBehindText ? (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
          }}
        />
      ) : null}
      <h1
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
          gap: '0.02em',
          fontFamily: FONT_FAMILY,
          fontSize,
          fontWeight,
          color: fontColor,
          lineHeight,
          letterSpacing: `${ls}px`,
          maxWidth,
          textAlign: align,
          margin: 0,
          mixBlendMode: blendMode,
        }}
      >
        {chars.map((char, i) => {
          const charFrame = local - i * charRevealDelay;
          if (charFrame < 0) {
            return (
              <span key={i} style={{ display: 'inline-block', opacity: 0 }}>
                {'\u00A0'}
              </span>
            );
          }

          const opacity = interpolate(charFrame, [0, 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const y = useSpringY(charFrame, fps, 15, 0);
          const charLetterSpacing = interpolate(charFrame, [0, 15], [0.3, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.4, 0, 0.2, 1),
          });

          const isSpace = char === ' ';
          return (
            <span
              key={i}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                letterSpacing: `${charLetterSpacing}em`,
                display: 'inline-block',
                color: isSpace ? 'transparent' : fontColor,
                textShadow: isSpace ? 'none' : `0 0 20px ${finalGlowColor}60`,
              }}
            >
              {isSpace ? '\u00A0' : char}
            </span>
          );
        })}
      </h1>
    </AbsoluteFill>
  );
};

export { KineticText };
export type { KineticTextProps };