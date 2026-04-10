import React, { useState } from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export interface DynamicAdProps {
  logoUrl: string;
  brandColor: string;
  bgUrl?: string;
  primaryText: string;
  secondaryText: string;
  [key: string]: any;
}

export const DynamicAdTemplate: React.FC<DynamicAdProps> = ({
  logoUrl,
  brandColor = '#e51636',
  primaryText = '¡OFERTA 2x1 SOLO POR HOY!',
  secondaryText = 'Haz tu orden ahora',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 150], [1, 1.1], {
    extrapolateRight: 'clamp',
  });

  const logoScale = spring({
    frame: frame - 10,
    from: 0,
    to: 1,
    fps,
    config: { damping: 12, mass: 0.5 },
  });

  const textY = spring({
    frame: frame - 25,
    from: 100,
    to: 0,
    fps,
  });
  const textOpacity = interpolate(frame, [25, 45], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0b', overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, ${brandColor} 0%, #0a0a0b 100%)`,
          opacity: 0.4,
          transform: `scale(${bgScale})`,
        }}
      />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        {logoUrl ? (
          <div
            style={{
              transform: `scale(${logoScale})`,
              background: 'white',
              padding: '40px',
              borderRadius: '50px',
              boxShadow: `0px 20px 50px ${brandColor}80`,
              marginBottom: '40px',
            }}
          >
            <Img
              src={logoUrl}
              style={{ width: '300px', height: 'auto', objectFit: 'contain' }}
              onError={() => {
                // En caso de error de carga, simplemente no renderizamos el logo
                // Remotion continuará el render normalmente
              }}
            />
          </div>
        ) : null}

        <Sequence from={25}>
          <div
            style={{
              transform: `translateY(${textY}px)`,
              opacity: textOpacity,
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: 'sans-serif',
                fontSize: '80px',
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.1,
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              {primaryText}
            </h1>
            <p
              style={{
                fontFamily: 'sans-serif',
                fontSize: '35px',
                fontWeight: 500,
                color: brandColor,
                marginTop: '20px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: '10px 30px',
                borderRadius: '20px',
                display: 'inline-block',
              }}
            >
              {secondaryText}
            </p>
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
