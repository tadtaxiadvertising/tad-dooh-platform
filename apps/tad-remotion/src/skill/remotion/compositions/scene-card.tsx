import React from 'react';
import {
 AbsoluteFill,
 Sequence,
} from 'remotion';
import { TadHook } from '../components/TadHook';
import { KineticText } from '../components/KineticText';
import { CounterAnim } from '../components/CounterAnim';
import { GlowCard } from '../components/AcidAndGlowCard';
import type { TadHookProps } from '../components/TadHook';
import type { KineticTextProps } from '../components/KineticText';
import type { CounterAnimProps } from '../components/CounterAnim';
import type { GlowCardProps } from '../components/AcidAndGlowCard';
import type { SceneSpec } from '../../types';
import { useSceneMotion } from './use-scene-motion';

const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";

export const SceneCard: React.FC<{
 scene: SceneSpec;
 index: number;
 frame: number;
 fps: number;
}> = ({ scene, index, frame, fps }) => {
 const startFrame = Math.round((scene.startSec ?? index * 5) * fps);
 const durationFrames = Math.max(
  Math.round((scene.durationSec ?? 4) * fps),
  Math.round(fps),
 );
 const local = Math.max(0, frame - startFrame);
 const clampedLocal = Math.min(local, durationFrames);

 const m = useSceneMotion(clampedLocal, durationFrames, scene.motionProfile);

 const transform = `translateY(${m.translateY}px) translateX(${m.translateX}px) scale(${m.scale}) rotate(${m.rotate}deg)`;
 const filter = m.blur > 0.1 ? `blur(${m.blur.toFixed(2)}px)` : undefined;
 const transitionStyle: React.CSSProperties = {
  transform,
  WebkitFilter: filter,
  filter,
  opacity: m.opacity,
 };

 const { component, props } = (scene.motionProfile ?? {}) as Record<string, any>;
 const normalizedProps = { ...(props ?? {}), accentColor: scene.accentColor };

 const wrap = (children: React.ReactNode, maxW = 1200) => (
  <div style={{ maxWidth: maxW, width: '100%', ...transitionStyle }}>
   {children}
  </div>
 );

 if (component === 'TadHook') {
  return (
   <Sequence name={`scene-${index}`} from={startFrame} durationInFrames={durationFrames}>
    <AbsoluteFill
     style={{
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 80px',
      backgroundColor: '#030303',
      pointerEvents: 'none',
     }}
    >
     {wrap(
      <TadHook
       {...(normalizedProps as TadHookProps)}
       durationInFrames={durationFrames}
      />,
     )}
    </AbsoluteFill>
   </Sequence>
  );
 }

 if (component === 'KineticText') {
  return (
   <Sequence name={`scene-${index}`} from={startFrame} durationInFrames={durationFrames}>
    <AbsoluteFill
     style={{
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 80px',
      backgroundColor: '#030303',
      pointerEvents: 'none',
     }}
    >
     {wrap(
      <KineticText
       {...(normalizedProps as KineticTextProps)}
       text={scene.onScreenText}
      />,
     )}
    </AbsoluteFill>
   </Sequence>
  );
 }

 if (component === 'CounterAnim') {
  return (
   <Sequence name={`scene-${index}`} from={startFrame} durationInFrames={durationFrames}>
    <AbsoluteFill
     style={{
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#030303',
      pointerEvents: 'none',
     }}
    >
     {wrap(
      <CounterAnim
       {...(normalizedProps as CounterAnimProps)}
       color={scene.accentColor}
      />,
     )}
    </AbsoluteFill>
   </Sequence>
  );
 }

 if (component === 'GlowCard' || component === 'AcidAndGlowCard') {
  return (
   <Sequence name={`scene-${index}`} from={startFrame} durationInFrames={durationFrames}>
    <AbsoluteFill
     style={{
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 80px',
      backgroundColor: '#030303',
      pointerEvents: 'none',
     }}
    >
     {wrap(
      <div style={{ filter: m.glow > 1.001 ? `brightness(${m.glow.toFixed(3)})` : undefined }}>
       <GlowCard {...(normalizedProps as GlowCardProps)} />
      </div>,
     )}
    </AbsoluteFill>
   </Sequence>
  );
 }

 return (
  <Sequence name={`scene-${index}`} from={startFrame} durationInFrames={durationFrames}>
   <AbsoluteFill
    style={{
     justifyContent: 'center',
     alignItems: 'center',
     padding: '0 80px',
     backgroundColor: '#030303',
     pointerEvents: 'none',
    }}
   >
    {wrap(
     <div
      style={{
       textAlign: 'center',
       fontFamily: FONT_FAMILY,
      }}
     >
      {scene.onScreenText ? (
       <h3
        style={{
         fontSize: 56,
         fontWeight: 700,
         color: '#ffffff',
         lineHeight: 1.15,
         margin: 0,
         letterSpacing: '-1px',
         textWrap: 'balance',
        }}
       >
        {scene.onScreenText}
       </h3>
      ) : null}
      {scene.visualDescription ? (
       <p
        style={{
         marginTop: 28,
         fontSize: 24,
         fontWeight: 400,
         color: '#cbd5e1',
         lineHeight: 1.35,
         textWrap: 'pretty',
        }}
       >
        {scene.visualDescription}
       </p>
      ) : null}
     </div>,
    )}
   </AbsoluteFill>
  </Sequence>
 );
};

export default SceneCard;
