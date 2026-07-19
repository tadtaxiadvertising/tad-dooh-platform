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
}) => {
 const frame = useCurrentFrame();
 const { fps } = useVideoConfig();
 const local = Math.max(0, frame - revealDelay);

 if (!revealCharByChar) {
  const opacity = interpolate(local, [0, 20], [0, 1], {
   extrapolateLeft: 'clamp',
   extrapolateRight: 'clamp',
   easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const y = useSpringY(local, fps, 20, 0);

  return (
   <AbsoluteFill
    style={{ justifyContent: 'center', alignItems: 'center', opacity, padding: '0 80px' }}
   >
    <h1
     style={{
      fontFamily: FONT_FAMILY,
      fontSize,
      fontWeight,
      color: fontColor,
      lineHeight: 1.2,
      letterSpacing: '-0.5px',
      textAlign: 'center',
      transform: `translateY(${y}px)`,
      margin: 0,
     }}
    >
     {text}
    </h1>
   </AbsoluteFill>
  );
 }

 // Reveal letra por letra con spring individual
 return (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 60px' }}>
   <h1
    style={{
     display: 'flex',
     flexWrap: 'wrap',
     justifyContent: 'center',
     gap: '0.02em',
     fontFamily: FONT_FAMILY,
     fontSize,
     fontWeight,
     color: fontColor,
     lineHeight: 1.3,
     letterSpacing: '-0.01em',
     textAlign: 'center',
     margin: 0,
    }}
   >
    {text.split('').map((char, i) => {
     const charFrame = local - i * 2;
     if (charFrame < 0) {
      // Espacios vacíos pero ocupando espacio (nbsp)
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
     const letterSpacing = interpolate(charFrame, [0, 15], [0.3, 0], {
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
        letterSpacing: `${letterSpacing}em`,
        display: 'inline-block',
        color: isSpace ? 'transparent' : fontColor,
        textShadow: isSpace ? 'none' : `0 0 20px ${accentColor}60`,
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