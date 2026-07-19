import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const StarbucksAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = '#1e3932';
  const accent = '#d4e9e2';

  const y = spring({
    frame: frame - 10,
    from: 20,
    to: 0,
    fps,
    config: { damping: 14, mass: 0.5 },
  });

  const bgLightness = interpolate(frame, [0, 120], [0.92, 1], {
    extrapolateRight: 'clamp',
  });

  const fadeIn = interpolate(frame, [40, 80], [0, 1]);

  const blur = interpolate(frame, [20, 70], [12, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f2f0eb',
        overflow: 'hidden',
        fontFamily: "'Lato', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundColor: `hsl(160, 20%, ${bgLightness * 100}%)`,
          opacity: 0.6,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Sequence from={0} durationInFrames={300}>
          <div
            style={{
              transform: `translateY(${y}px)`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                color: brandColor,
                fontSize: '54px',
                fontWeight: 900,
                letterSpacing: '6px',
                marginBottom: '24px',
              }}
            >
              STARBUCKS
            </div>
          </div>
        </Sequence>

        <Sequence from={25} durationInFrames={250}>
          <div
            style={{
              transform: `translateY(${y}px)`,
              textAlign: 'center',
              opacity: fadeIn,
              filter: `blur(${blur}px)`,
            }}
          >
            <h1
              style={{
                fontSize: '80px',
                fontWeight: 800,
                color: brandColor,
                lineHeight: 1.05,
                margin: '0 0 24px 0',
                textTransform: 'uppercase',
              }}
            >
              Frappuccino
              <br />
              <span style={{ color: '#00704a' }}>Nuevo</span>
            </h1>
            <p
              style={{
                fontSize: '44px',
                fontWeight: 300,
                color: '#1b4332',
                maxWidth: '900px',
                margin: '0 auto',
                lineHeight: 1.3,
              }}
            >
              Máximo sabor en cada sorbo
            </p>
          </div>
        </Sequence>

        <Sequence from={80} durationInFrames={50}>
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: brandColor,
            }}
          >
            <div
              style={{
                color: '#fff',
                fontSize: '56px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '3px',
              }}
            >
              Vení por el tuyo
            </div>
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
