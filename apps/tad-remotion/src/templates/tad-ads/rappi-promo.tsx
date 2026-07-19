import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const RappiAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = '#00bf54';

  const boxY = spring({
    frame: frame - 8,
    from: 30,
    to: 0,
    fps,
    config: { damping: 11, mass: 0.6 },
  });

  const bgScale = interpolate(frame, [0, 90], [1, 1.16], {
    extrapolateRight: 'clamp',
  });

  const textY = spring({
    frame: frame - 22,
    from: 24,
    to: 0,
    fps,
    config: { damping: 13, mass: 0.7 },
  });

  const dashOffset = interpolate(frame, [30, 120], [0, 1000]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050505',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 70% 70%, ${brandColor}33 0%, #050505 55%)`,
          transform: `scale(${bgScale})`,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Sequence from={0} durationInFrames={300}>
          <div style={{ transform: `translateY(${boxY}px)`, textAlign: 'center' }}>
            <div
              style={{
                backgroundColor: '#fff',
                color: '#000',
                padding: '24px 48px',
                borderRadius: '18px',
                display: 'inline-block',
                marginBottom: '28px',
              }}
            >
              <span style={{ fontSize: '54px', fontWeight: 900, letterSpacing: '-1px' }}>
                RAPPI
              </span>
            </div>
          </div>
        </Sequence>

        <Sequence from={18} durationInFrames={250}>
          <div style={{ transform: `translateY(${textY}px)`, textAlign: 'center' }}>
            <h1
              style={{
                fontSize: '96px',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1.05,
                margin: '0 0 32px 0',
                textTransform: 'uppercase',
              }}
            >
              ENTREGA{' '}
              <span
                style={{
                  color: brandColor,
                  textDecoration: 'underline',
                  textDecorationThickness: '6px',
                }}
              >
                AHORA
              </span>
            </h1>
            <p
              style={{
                fontSize: '42px',
                fontWeight: 500,
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '16px 44px',
                borderRadius: '28px',
                display: 'inline-block',
                backdropFilter: 'blur(10px)',
              }}
            >
              Pedí lo que quieras • Rápido
            </p>
          </div>
        </Sequence>

        <Sequence from={60} durationInFrames={60}>
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: brandColor,
            }}
          >
            <div
              style={{
                color: '#000',
                fontSize: '64px',
                fontWeight: 900,
                textTransform: 'uppercase',
                padding: '24px 40px',
                border: '6px solid #000',
                borderRadius: '24px',
              }}
            >
              PEDÍ YA
            </div>
          </AbsoluteFill>
        </Sequence>

        <Sequence from={0} durationInFrames={330}>
          <AbsoluteFill
            style={{
              overflow: 'hidden',
              opacity: 0.35,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(90deg, #fff 0px, #fff 6px, transparent 6px, transparent 40px)',
                backgroundPosition: `${dashOffset}px 0`,
                backgroundSize: '40px 100%',
              }}
            />
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
