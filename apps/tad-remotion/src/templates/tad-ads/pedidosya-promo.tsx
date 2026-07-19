import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const PedidosYaAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = '#f7ca18';
  const bgColor = '#0a0a0b';

  const flameY = spring({
    frame: frame - 5,
    from: 60,
    to: 0,
    fps,
    config: { damping: 10, mass: 0.6 },
  });

  const bgScale = interpolate(frame, [0, 90], [1, 1.12], {
    extrapolateRight: 'clamp',
  });

  const textSlide = spring({
    frame: frame - 20,
    from: 40,
    to: 0,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  const ctaBg = interpolate(frame, [60, 90], [0, 1]);

  const pulse = Math.sin((frame / 15) * Math.PI) * 4;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 30% 20%, ${brandColor}33 0%, ${bgColor} 60%)`,
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
          <div
            style={{
              transform: `translateY(${flameY}px)`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                backgroundColor: brandColor,
                color: '#000',
                padding: '24px 40px',
                borderRadius: '24px',
                display: 'inline-block',
                marginBottom: '32px',
              }}
            >
              <span
                style={{
                  fontSize: '56px',
                  fontWeight: 900,
                  letterSpacing: '-2px',
                }}
              >
                PEDIDOSYA
              </span>
            </div>
          </div>
        </Sequence>

        <Sequence from={18} durationInFrames={250}>
          <div
            style={{
              transform: `translateY(${textSlide}px)`,
              textAlign: 'center',
            }}
          >
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
              HASTA{' '}
              <span
                style={{
                  color: brandColor,
                  display: 'inline-block',
                  transform: `scale(${1 + pulse * 0.02})`,
                }}
              >
                40%
              </span>{' '}
              OFF
            </h1>
            <p
              style={{
                fontSize: '42px',
                fontWeight: 500,
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '16px 40px',
                borderRadius: '28px',
                display: 'inline-block',
                backdropFilter: 'blur(10px)',
              }}
            >
              Tu delivery ahora
            </p>
          </div>
        </Sequence>

        <Sequence from={55} durationInFrames={60}>
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: brandColor,
              opacity: ctaBg,
            }}
          >
            <div
              style={{
                color: '#000',
                fontSize: '64px',
                fontWeight: 900,
                textTransform: 'uppercase',
                borderRadius: '20px',
                padding: '24px 40px',
                backgroundColor: '#fff',
              }}
            >
              PEDÍ AHORA
            </div>
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
