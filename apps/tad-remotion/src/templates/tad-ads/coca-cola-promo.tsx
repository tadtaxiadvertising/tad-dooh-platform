import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const CocaColaAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = '#f40009';

  const y = spring({
    frame: frame - 10,
    from: 20,
    to: 0,
    fps,
    config: { damping: 13, mass: 0.5 },
  });

  const bgScale = interpolate(frame, [0, 80], [1, 1.12], { extrapolateRight: 'clamp' });
  const fadeIn = interpolate(frame, [35, 70], [0, 1]);
  const wave = Math.sin((frame / 18) * Math.PI);

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
          background: `radial-gradient(circle at 40% 60%, ${brandColor}44 0%, #0a0a0b 55%)`,
          transform: `scale(${bgScale})`,
        }}
      />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Sequence from={0} durationInFrames={300}>
          <div style={{ transform: `translateY(${y}px)`, textAlign: 'center' }}>
            <div
              style={{
                color: '#fff',
                fontSize: '54px',
                fontWeight: 900,
                letterSpacing: '10px',
                marginBottom: '24px',
              }}
            >
              COCA-COLA
            </div>
            <div
              style={{
                width: '120px',
                height: '6px',
                backgroundColor: brandColor,
                margin: '0 auto 32px auto',
                borderRadius: '4px',
              }}
            />
          </div>
        </Sequence>

        <Sequence from={22} durationInFrames={250}>
          <div
            style={{
              transform: `translateY(${y}px)`,
              textAlign: 'center',
              opacity: fadeIn,
            }}
          >
            <h1
              style={{
                fontSize: '110px',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1,
                margin: '0 0 28px 0',
                textTransform: 'uppercase',
                letterSpacing: '-2px',
              }}
            >
              Destapa{' '}
              <span
                style={{
                  color: brandColor,
                  display: 'inline-block',
                  transform: `scale(${1 + wave * 0.04})`,
                }}
              >
                la felicidad
              </span>
            </h1>
            <p
              style={{
                fontSize: '42px',
                fontWeight: 300,
                color: '#cbd5e1',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Refrescante. Clásica. Ahora.
            </p>
          </div>
        </Sequence>

        <Sequence from={75} durationInFrames={55}>
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#fff',
            }}
          >
            <div
              style={{
                color: '#000',
                fontSize: '66px',
                fontWeight: 900,
                textTransform: 'uppercase',
                padding: '24px 56px',
                borderRadius: '24px',
                border: '4px solid #000',
              }}
            >
              Tomá Coca-Cola
            </div>
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
