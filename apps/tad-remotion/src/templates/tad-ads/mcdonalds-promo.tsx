import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const McDonaldsAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = '#da291c';

  const y = spring({
    frame: frame - 8,
    from: 24,
    to: 0,
    fps,
    config: { damping: 11, mass: 0.6 },
  });

  const bgScale = interpolate(frame, [0, 80], [1, 1.14], { extrapolateRight: 'clamp' });
  const ctaFade = interpolate(frame, [65, 95], [0, 1]);

  const shake = Math.sin(frame * 0.5) * 2;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0b',
        overflow: 'hidden',
        fontFamily: "system-ui, -apple-system, 'Helvetica Neue', sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 60% 30%, ${brandColor}55 0%, #0a0a0b 55%)`,
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
          <div style={{ transform: `translateY(${y}px)`, textAlign: 'center' }}>
            <div
              style={{
                backgroundColor: brandColor,
                color: '#fff',
                padding: '24px 56px',
                borderRadius: '28px',
                display: 'inline-block',
                marginBottom: '28px',
                transform: `translateX(${shake}px)`,
              }}
            >
              <span style={{ fontSize: '58px', fontWeight: 900, letterSpacing: '-1px' }}>
                MCDONALD'S
              </span>
            </div>
          </div>
        </Sequence>

        <Sequence from={18} durationInFrames={250}>
          <div style={{ transform: `translateY(${y}px)`, textAlign: 'center' }}>
            <h1
              style={{
                fontSize: '100px',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1.05,
                margin: '0 0 28px 0',
                textTransform: 'uppercase',
              }}
            >
              Big Mac{' '}
              <span
                style={{
                  color: '#ffc72c',
                  textShadow: '0 0 40px #ffc72c66',
                }}
              >
                2x1
              </span>
            </h1>
            <p
              style={{
                fontSize: '42px',
                fontWeight: 500,
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '16px 48px',
                borderRadius: '28px',
                display: 'inline-block',
                backdropFilter: 'blur(10px)',
              }}
            >
              Por tiempo limitado
            </p>
          </div>
        </Sequence>

        <Sequence from={65} durationInFrames={65}>
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#ffc72c',
              opacity: ctaFade,
            }}
          >
            <div
              style={{
                color: '#000',
                fontSize: '68px',
                fontWeight: 900,
                textTransform: 'uppercase',
                padding: '24px 48px',
                borderRadius: '24px',
                backgroundColor: '#fff',
                transform: `skewX(-6deg)`,
              }}
            >
              Pedí tu combo
            </div>
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
