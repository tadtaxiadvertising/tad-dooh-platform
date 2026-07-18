import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  Sequence,
} from 'remotion';

// ─── Brand Constants ─────────────────────────────────────
const C = {
  tadYellow: '#fad400',
  tadYellowBright: '#eab308',
  tadYellowGlow: 'rgba(250, 212, 0, 0.25)',
  bg: '#0f172a',
  bgDark: '#000000',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textDim: '#64748b',
  glassBg: 'rgba(255, 255, 255, 0.04)',
  glassBgStrong: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderStrong: 'rgba(250, 212, 0, 0.15)',
};

const FONT = "'Inter', 'Roboto', system-ui, -apple-system, sans-serif";

// ─── Scene Timings (frames @ 30fps) ──────────────────────
const S = {
  hook: { start: 0, end: 150 },
  solution: { start: 150, end: 450 },
  interactive: { start: 450, end: 750 },
  cta: { start: 750, end: 900 },
};

const TOTAL_FRAMES = 900;

// ─── Helpers ──────────────────────────────────────────────

/** Generic fade in, hold, fade out */
function useFadeRange(frame: number, fadeIn: number, holdEnd: number, fadeOut: number, fadeDur = 20) {
  return interpolate(
    frame,
    [0, fadeIn + fadeDur, holdEnd - fadeDur, holdEnd],
    fadeOut === 0 ? [0, 1, 1, 1] : [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
}

/** Spring-based slide up */
function useSlideUp(frame: number, delay = 0, config = { damping: 14, mass: 0.8, stiffness: 100 }) {
  return spring({
    frame: frame - delay,
    fps: 30,
    from: 60,
    to: 0,
    config,
  });
}

// ─── Shared Components ───────────────────────────────────

const GlassCard: React.FC<{
  opacity?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ opacity = 1, style, children }) => (
  <div
    style={{
      background: C.glassBg,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${C.glassBorder}`,
      borderRadius: 20,
      padding: '28px 36px',
      opacity,
      ...style,
    }}
  >
    {children}
  </div>
);

const Badge: React.FC<{
  text: string;
  icon?: string;
  delay?: number;
  frame: number;
  sceneStart: number;
}> = ({ text, icon = '◆', delay = 0, frame, sceneStart }) => {
  const local = frame - sceneStart - delay;
  const opacity = interpolate(local, [0, 15], [0, 1], { extrapolateLeft: 'clamp' });
  const x = spring({ frame: local, fps: 30, from: -30, to: 0, config: { damping: 15, mass: 0.5 } });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        background: C.glassBgStrong,
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 100,
        padding: '8px 18px 8px 14px',
        opacity,
        transform: `translateX(${x}px)`,
        margin: '6px 0',
        fontSize: 16,
        fontWeight: 500,
        color: C.textPrimary,
      }}
    >
      <span style={{ color: C.tadYellow, fontSize: 14 }}>{icon}</span>
      {text}
    </div>
  );
};

// ─── Scene 1: The Hook (0s → 5s) ─────────────────────────
const SceneHook: React.FC<{ frame: number }> = ({ frame }) => {
  const local = frame - S.hook.start;
  const opacity = useFadeRange(local, 0, 150, 150);
  const slideY = useSlideUp(local, 0, { damping: 16, mass: 0.7, stiffness: 100 });

  // Moving dot on a path
  const dotX = interpolate(local * 1.5 % 120, [0, 60, 120], [-10, 110, -10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dotPulse = interpolate(local % 40, [0, 20, 40], [1, 1.3, 1]);
  const pathOpacity = interpolate(local % 30, [0, 15, 30], [0.15, 0.4, 0.15]);

  // Pulsing beacon at bottom
  const beaconScale = interpolate(local % 60, [0, 30, 60], [1, 1.8, 1]);
  const beaconOpacity = interpolate(local % 60, [0, 30, 60], [0.4, 0, 0.4]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, opacity }}>
      {/* Radial glow */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 50% 40%, rgba(250, 212, 0, 0.06) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 80% 70%, rgba(234, 179, 8, 0.04) 0%, transparent 60%)
          `,
        }}
      />

      {/* Map path lines */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '8%',
              right: '8%',
              top: `${60 + i * 40}%`,
              height: 1.5,
              background: `linear-gradient(90deg, transparent 0%, ${C.tadYellow}${Math.round(pathOpacity * 60).toString(16).padStart(2, '0')} 50%, transparent 100%)`,
            }}
          />
        ))}
      </div>

      {/* Moving vehicle dot */}
      <div
        style={{
          position: 'absolute',
          top: '61%',
          left: `${dotX}%`,
          transform: `translate(-50%, -50%) scale(${dotPulse})`,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: C.tadYellow,
          boxShadow: `0 0 24px ${C.tadYellowGlow}`,
          zIndex: 2,
        }}
      />

      {/* Beacon ring below */}
      <div
        style={{
          position: 'absolute',
          top: '61%',
          left: `${dotX}%`,
          transform: `translate(-50%, -50%) scale(${beaconScale})`,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: `1.5px solid ${C.tadYellow}`,
          opacity: beaconOpacity,
          zIndex: 1,
        }}
      />

      {/* Headline */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 100px' }}>
        <div style={{ transform: `translateY(${slideY}px)`, textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: FONT,
              fontSize: 54,
              fontWeight: 700,
              color: C.textPrimary,
              lineHeight: 1.3,
              margin: 0,
              letterSpacing: '-0.5px',
            }}
          >
            ¿Cómo llegar a tu audiencia{' '}
            <span style={{ color: C.tadYellow }}>mientras se mueve por la ciudad</span>?
          </h1>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene 2: The Solution (5s → 15s) ────────────────────
const SceneSolution: React.FC<{ frame: number }> = ({ frame }) => {
  const local = frame - S.solution.start;
  const opacity = useFadeRange(local, 0, 290, 300, 25);
  const slideY = useSlideUp(local, 10);
  const badgeDelay = useSlideUp(local, 30, { damping: 12, mass: 0.6, stiffness: 100 });

  // Tablet mockup floating animation
  const tabletFloatY = spring({
    frame: local,
    fps: 30,
    from: 0,
    to: -8,
    config: { damping: 6, mass: 1.5 },
  });
  const tabletFloatX = spring({
    frame: (local + 20) % 80,
    fps: 30,
    from: -4,
    to: 4,
    config: { damping: 5, mass: 2 },
  });

  // Screen glow pulse
  const screenPulse = interpolate(local % 50, [0, 25, 50], [1, 1.03, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, opacity }}>
      {/* Background gradient */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 50% 60% at 30% 50%, rgba(250, 212, 0, 0.05) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 70% 50%, rgba(234, 179, 8, 0.03) 0%, transparent 50%)
          `,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '0 80px',
          gap: 60,
        }}
      >
        {/* Left: Tablet Mockup */}
        <div
          style={{
            transform: `translate(${tabletFloatX}px, ${tabletFloatY}px)`,
            flexShrink: 0,
          }}
        >
          {/* Tablet body — glassmorphic */}
          <div
            style={{
              width: 280,
              height: 380,
              borderRadius: 28,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(12px)',
              border: `1.5px solid ${C.glassBorderStrong}`,
              boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 40px ${C.tadYellowGlow}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Screen content */}
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 16,
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                transform: `scale(${screenPulse})`,
              }}
            >
              {/* Glowing ad slot */}
              <div
                style={{
                  width: '80%',
                  height: 100,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${C.tadYellow}30, ${C.tadYellow}10)`,
                  border: `1px solid ${C.tadYellow}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.tadYellow,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                AD SLOT
              </div>
              <div style={{ width: '70%', height: 4, borderRadius: 2, background: C.glassBgStrong }} />
              <div style={{ width: '50%', height: 4, borderRadius: 2, background: C.glassBgStrong }} />
              {/* Status bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 20,
                  right: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: C.textDim,
                }}
              >
                <span>●●●●●</span>
                <span>12:30</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Text Content */}
        <div
          style={{
            transform: `translateY(${slideY}px)`,
            opacity,
            maxWidth: 550,
          }}
        >
          <h1
            style={{
              fontFamily: FONT,
              fontSize: 46,
              fontWeight: 800,
              color: C.tadYellow,
              margin: '0 0 8px 0',
              letterSpacing: '-1px',
              lineHeight: 1.1,
            }}
          >
            TAD DOOH Platform
          </h1>
          <h2
            style={{
              fontFamily: FONT,
              fontSize: 22,
              fontWeight: 400,
              color: C.textSecondary,
              margin: '0 0 24px 0',
            }}
          >
            Publicidad Digital Premium en Taxis
          </h2>

          <div style={{ transform: `translateY(${badgeDelay > 0 ? 0 : badgeDelay}px)` }}>
            <Badge text="Audiencia Cautiva" icon="🎯" delay={0} frame={local} sceneStart={0} />
            <br />
            <Badge text="15 Slots Exclusivos" icon="⭐" delay={20} frame={local} sceneStart={0} />
            <br />
            <Badge text="30s de Impacto" icon="⚡" delay={40} frame={local} sceneStart={0} />
            <br />
            <Badge text="Cobertura Nacional" icon="🌎" delay={60} frame={local} sceneStart={0} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3: Interactivity & Pricing (15s → 25s) ───────
const SceneInteractive: React.FC<{ frame: number }> = ({ frame }) => {
  const local = frame - S.interactive.start;
  const opacity = useFadeRange(local, 0, 290, 300, 25);

  // QR code pulsing
  const qrScale = spring({
    frame: local,
    fps: 30,
    from: 0.6,
    to: 1,
    config: { damping: 10, mass: 0.8 },
  });
  const qrGlow = interpolate(local % 40, [0, 20, 40], [0.3, 0.7, 0.3]);

  // Phone sliding in from right
  const phoneX = spring({
    frame: local - 20,
    fps: 30,
    from: 200,
    to: 0,
    config: { damping: 14, mass: 0.7 },
  });
  const phoneOpacity = interpolate(local, [20, 45], [0, 1], { extrapolateLeft: 'clamp' });

  // Nexus profile buttons stagger
  const btn1Y = spring({ frame: local - 50, fps: 30, from: 40, to: 0, config: { damping: 12, mass: 0.5 } });
  const btn2Y = spring({ frame: local - 65, fps: 30, from: 40, to: 0, config: { damping: 12, mass: 0.5 } });
  const btn3Y = spring({ frame: local - 80, fps: 30, from: 40, to: 0, config: { damping: 12, mass: 0.5 } });

  // Pricing card
  const priceScale = spring({
    frame: local - 100,
    fps: 30,
    from: 0.8,
    to: 1,
    config: { damping: 12, mass: 0.6 },
  });

  // Scanning beam animation
  const beamY = interpolate(local % 80, [0, 40, 80], [-60, 200, -60]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, opacity }}>
      {/* Background gradient */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 50% 60% at 50% 40%, rgba(250, 212, 0, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 20% 80%, rgba(234, 179, 8, 0.03) 0%, transparent 50%)
          `,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '0 80px',
          gap: 50,
        }}
      >
        {/* Left: QR → Phone flow */}
        <div style={{ position: 'relative', width: 300, height: 400, flexShrink: 0 }}>
          {/* QR Code */}
          <div
            style={{
              position: 'absolute',
              left: 10,
              top: 80,
              width: 130,
              height: 130,
              borderRadius: 16,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${qrScale})`,
              boxShadow: `0 0 40px rgba(250, 212, 0, ${qrGlow})`,
            }}
          >
            {/* Stylized QR pattern */}
            <div
              style={{
                width: 100,
                height: 100,
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridTemplateRows: 'repeat(7, 1fr)',
                gap: 3,
              }}
            >
              {Array.from({ length: 49 }, (_, i) => {
                const row = Math.floor(i / 7);
                const col = i % 7;
                const isBlack =
                  (row < 3 && col < 3) ||
                  (row < 3 && col > 3) ||
                  (row > 3 && col < 3) ||
                  (row >= 3 && col >= 3 && (row + col) % 2 === 0);
                return (
                  <div
                    key={i}
                    style={{
                      background: isBlack ? '#111' : 'transparent',
                      borderRadius: 2,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Scanning beam */}
          <div
            style={{
              position: 'absolute',
              left: 10,
              width: 130,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${C.tadYellow}, transparent)`,
              top: 80 + beamY,
              opacity: 0.7,
              filter: 'blur(1px)',
            }}
          />

          {/* Arrow connecting QR to phone */}
          <div
            style={{
              position: 'absolute',
              left: 120,
              top: 140,
              width: 50,
              height: 2,
              background: `linear-gradient(90deg, ${C.tadYellow}80, transparent)`,
              transform: 'rotate(15deg)',
              opacity: phoneOpacity,
            }}
          />

          {/* Phone Mockup */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 50,
              width: 160,
              height: 300,
              borderRadius: 24,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              border: `1.5px solid ${C.glassBorder}`,
              transform: `translateX(${phoneX}px)`,
              opacity: phoneOpacity,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px 16px 16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            }}
          >
            {/* Notch */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                width: 50,
                height: 6,
                borderRadius: 3,
                background: C.glassBgStrong,
              }}
            />
            <span
              style={{
                color: C.tadYellow,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Perfil Nexus
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '90%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#25D366',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center',
                  transform: `translateY(${btn1Y}px)`,
                }}
              >
                WhatsApp
              </div>
              <div
                style={{
                  width: '90%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#6366f1',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center',
                  transform: `translateY(${btn2Y}px)`,
                }}
              >
                Menú Digital
              </div>
              <div
                style={{
                  width: '90%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#ea580c',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center',
                  transform: `translateY(${btn3Y}px)`,
                }}
              >
                UberEats
              </div>
            </div>
          </div>
        </div>

        {/* Right: Text + Pricing */}
        <div style={{ maxWidth: 520 }}>
          <div style={{ opacity, transform: `translateY(${useSlideUp(local, 5)}px)` }}>
            <h2
              style={{
                fontFamily: FONT,
                fontSize: 26,
                fontWeight: 600,
                color: C.textPrimary,
                margin: '0 0 8px 0',
              }}
            >
              Convierte vistas en ventas
            </h2>
            <p
              style={{
                fontFamily: FONT,
                fontSize: 18,
                fontWeight: 400,
                color: C.textSecondary,
                margin: '0 0 20px 0',
                lineHeight: 1.5,
              }}
            >
              Con códigos QR dinámicos que conectan a tus clientes con{' '}
              <span style={{ color: C.tadYellow }}>experiencias interactivas</span> en tiempo
              real.
            </p>
          </div>

          {/* Pricing Card */}
          <div
            style={{
              transform: `scale(${priceScale})`,
              opacity: interpolate(local, [100, 130], [0, 1], { extrapolateLeft: 'clamp' }),
            }}
          >
            <GlassCard
              style={{
                border: `1px solid ${C.glassBorderStrong}`,
                boxShadow: `0 0 30px ${C.tadYellowGlow}`,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  color: C.textDim,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}
              >
                Campañas desde
              </p>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 42,
                  fontWeight: 800,
                  color: C.tadYellow,
                  margin: '4px 0',
                  letterSpacing: '-1px',
                }}
              >
                RD$1,500
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 400,
                    color: C.textSecondary,
                  }}
                >
                  /mes
                </span>
              </p>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  color: C.textSecondary,
                  margin: 0,
                }}
              >
                Sin contratos largos · Resultados medibles
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4: Call to Action (25s → 30s) ─────────────────
const SceneCTA: React.FC<{ frame: number }> = ({ frame }) => {
  const local = frame - S.cta.start;
  const opacity = useFadeRange(local, 0, 150, 150, 30);

  const slideY = useSlideUp(local, 0, { damping: 20, mass: 0.5, stiffness: 120 });
  const subOpacity = interpolate(local, [15, 35], [0, 1], { extrapolateLeft: 'clamp' });

  // Pulse rings
  const ring1Scale = spring({ frame: local, fps: 30, from: 1, to: 2.5, config: { damping: 4, mass: 2 } });
  const ring1Opacity = interpolate(local, [0, 60, 150], [0.5, 0, 0], { extrapolateLeft: 'clamp' });

  const ring2Scale = spring({ frame: local - 20, fps: 30, from: 1, to: 2.5, config: { damping: 4, mass: 2 } });
  const ring2Opacity = interpolate(local, [20, 80, 150], [0.4, 0, 0], { extrapolateLeft: 'clamp' });

  // Logo glow
  const logoGlow = interpolate(local % 40, [0, 20, 40], [0.6, 1, 0.6]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bgDark, opacity }}>
      {/* Background gradient */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 50% 50% at 50% 50%, rgba(250, 212, 0, 0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 50% 80%, rgba(234, 179, 8, 0.04) 0%, transparent 50%)
          `,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Pulse Rings */}
        <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: '50%',
              border: `2px solid ${C.tadYellow}`,
              opacity: ring1Opacity,
              transform: `scale(${ring1Scale})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: '50%',
              border: `1.5px solid ${C.tadYellow}`,
              opacity: ring2Opacity,
              transform: `scale(${ring2Scale})`,
            }}
          />

          {/* Logo / TAD text */}
          <div
            style={{
              transform: `translateY(${slideY}px) scale(${logoGlow * 0.15 + 0.85})`,
              opacity,
              zIndex: 2,
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: FONT,
                fontSize: 80,
                fontWeight: 900,
                color: C.tadYellow,
                margin: 0,
                letterSpacing: '-3px',
                textShadow: `0 0 40px ${C.tadYellowGlow}`,
                lineHeight: 1,
              }}
            >
              TAD
            </h1>
            <p
              style={{
                fontFamily: FONT,
                fontSize: 14,
                color: C.textDim,
                letterSpacing: 6,
                textTransform: 'uppercase',
                marginTop: 8,
              }}
            >
              DOOH PLATFORM
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${spring({ frame: local - 15, fps: 30, from: 30, to: 0, config: { damping: 14, mass: 0.6 } })}px)`,
            textAlign: 'center',
            marginTop: 60,
          }}
        >
          <p
            style={{
              fontFamily: FONT,
              fontSize: 24,
              fontWeight: 500,
              color: C.textPrimary,
              margin: 0,
              letterSpacing: '-0.3px',
            }}
          >
            Únete a la red.{' '}
            <span style={{ color: C.tadYellow }}>Escanea y Conecta.</span>
          </p>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 14,
              color: C.textDim,
              marginTop: 12,
              letterSpacing: 1,
            }}
          >
            tad.do — República Dominicana
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Main Composition ────────────────────────────────────
const TadPromoVideo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.bgDark,
        fontFamily: FONT,
      }}
    >
      <Sequence from={S.hook.start} durationInFrames={S.hook.end - S.hook.start}>
        <SceneHook frame={frame} />
      </Sequence>
      <Sequence from={S.solution.start} durationInFrames={S.solution.end - S.solution.start}>
        <SceneSolution frame={frame} />
      </Sequence>
      <Sequence from={S.interactive.start} durationInFrames={S.interactive.end - S.interactive.start}>
        <SceneInteractive frame={frame} />
      </Sequence>
      <Sequence from={S.cta.start} durationInFrames={S.cta.end - S.cta.start}>
        <SceneCTA frame={frame} />
      </Sequence>
    </AbsoluteFill>
  );
};

export { TadPromoVideo };