// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Compositions de demostración
//  Usan los componentes reutilizables de la Skill.
//  Sirven como prueba de concepto + plantillas editables.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  AbsoluteFill,
  Composition,
  interpolate,
  registerRoot,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';
import { TadHook } from '../components/TadHook';
import { KineticText } from '../components/KineticText';
import { CounterAnim } from '../components/CounterAnim';
import { GlowCard } from '../components/AcidAndGlowCard';
import { ParticleField } from '../components/ParticleField';
import { RemainderBar } from '../components/RemainderBar';
import { PLATFORM_CONFIG } from '../../types';

// ─── TADGenericComposition ─────────────────────────────────────────────────

export const TADGenericComposition: React.FC<{ theme?: string }> = ({
  theme = 'explainer',
}) => {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: '#050505' }}>
      <ParticleField color="#fad400" count={30} speed={0.3} />

      <Sequence from={0} durationInFrames={Math.floor(durationInFrames * 0.2)}>
        <TadHook
          text="¿Alguna vez te preguntaste por qué?"
          accentColor="#e51636"
          durationInFrames={Math.floor(durationInFrames * 0.2)}
        />
      </Sequence>

      <Sequence from={Math.floor(durationInFrames * 0.2)} durationInFrames={Math.floor(durationInFrames * 0.4)}>
        <KineticText
          text="Tu cerebro recuerda 3 veces más la publicidad en movimiento"
          accentColor="#fad400"
          fontSize={52}
        />
      </Sequence>

      <Sequence from={Math.floor(durationInFrames * 0.5)} durationInFrames={Math.floor(durationInFrames * 0.3)}>
        <CounterAnim
          target={3}
          suffix="x"
          prefix=""
          label="más recordación"
          color="#fad400"
          fontSize={90}
        />
      </Sequence>

      <Sequence from={Math.floor(durationInFrames * 0.65)} durationInFrames={Math.floor(durationInFrames * 0.25)}>
        <GlowCard glowColor="#e51636" entranceFrames={24}>
          <p
            style={{
              color: '#94a3b8',
              fontSize: 18,
              textAlign: 'center',
              maxWidth: 500,
              lineHeight: 1.5,
            }}
          >
            La publicidad DOOH en taxis convierte cada trayecto en una experiencia
            memorable. Científicamente demostrado.
          </p>
        </GlowCard>
      </Sequence>

      <RemainderBar totalFrames={durationInFrames} color="#e51636" height={3} endPulse />
    </AbsoluteFill>
  );
};

// ─── TADCompositionWrapper (wrapper que el pipeline puede consumir) ──────────

export const TADCompositionWrapper: React.FC = () => {
  const { width, height } = useVideoConfig();
  const isVertical = height > width;

  // En un sistema completo, aquí se aplicarían props resueltos por el pipeline:
  // platform, theme, brand, citations, etc.
  return <TADGenericComposition theme="why-diesel" />;
};

// ─── Root: registrar composiciones por plataforma ──────────────────────────

export const RemotionRoot: React.FC = () => {
  const fps = 30;

  return (
    <>
      {Object.entries(PLATFORM_CONFIG).map(([platformId, cfg]) => (
        <Composition
          key={platformId}
          id={`TADDemo-${platformId}`}
          component={TADGenericComposition}
          durationInFrames={Math.round(cfg.optimalDurationSec[1] * fps)}
          fps={cfg.fps}
          width={cfg.width}
          height={cfg.height}
          defaultProps={{ theme: 'why-diesel' }}
        />
      ))}
    </>
  );
};

registerRoot(RemotionRoot);
