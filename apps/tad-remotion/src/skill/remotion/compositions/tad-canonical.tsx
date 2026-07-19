import React from 'react';
import {
 AbsoluteFill,
 useCurrentFrame,
 useVideoConfig,
 interpolate,
 Easing,
 Sequence,
} from 'remotion';
import { TADCanonicalCaptionedScene } from '../components/TADCanonicalCaptionedScene';
import { TadHook } from '../components/TadHook';
import { KineticText } from '../components/KineticText';
import { CounterAnim } from '../components/CounterAnim';
import { GlowCard } from '../components/AcidAndGlowCard';
import type { VideoProject } from '../../types';
import { buildStory, beatsToSceneSpecs } from '../../storytelling/engine';

const FONT_FAMILY = "'Inter', 'Outfit', 'Segoe UI', sans-serif";
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT = Easing.bezier(0.7, 0, 0.84, 0);
const FPS = 30;

// Seed: genera escenas reales del pipeline para que el render de prueba tenga motion
const seedBeats = buildStory('why-diesel', 30, 'tiktok', 'persuasive');
const seedScenes = beatsToSceneSpecs(seedBeats, FPS);

const DEFAULT_PROJECT = {
 projectId: 'tad-default',
 theme: 'why-diesel',
 platform: 'tiktok',
 title: 'TAD — Por qué tu cerebro recuerda esto sin querer',
 totalDurationSec: 30,
 fps: FPS,
 actualFps: FPS,
 headline: 'Tu cerebro recuerda esto sin querer',
 narrativeSummary: 'Un anuncio en pantalla de taxi planta tu marca en memoria episódica — sin scrolls, sin skip, sin escape.',
 scenes: seedScenes,
 citations: [],
 metadata: {
  title: 'TAD · DOOH',
  description: 'Recordación 3x vs. redes sociales',
  hashtags: ['#DOOH', '#TAD', '#advertising'],
  postText: {
   instagram: 'TAD — el medio que tu cerebro no puede ignorar.',
   tiktok: '3x más recordación. Sin scroll. Sin skip. Solo TAD.',
   linkedin: 'TAD convierte tiempo muerto en recordación de marca.',
   facebook: 'TAD — cada trayecto es una oportunidad.',
   youtube: 'Tu cerebro recuerda esto sin querer.',
  },
  thumbnailPrompt: 'Pantalla de taxi con marca TAD y glow rojo',
 },
 assetManifest: {
  icons: [],
  gradients: [],
 },
 remotionCode: '',
 qaReport: {
  passed: true,
  checks: [],
  warnings: [],
  errors: [],
 },
 generatedAt: new Date().toISOString(),
 engagementTier: 'persuasive',
} as unknown as VideoProject;

interface CanonicalSceneProps {
 project: VideoProject;
 frame: number;
 fps: number;
}

const CanonicalScene: React.FC<CanonicalSceneProps> = ({ project, frame, fps }) => {
 const local = frame;
 const opacity = interpolate(local, [0, 20], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: EASE_OUT,
 });

 const scale = interpolate(local, [0, 28], [0.96, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: EASE_OUT,
 });

 return (
 <AbsoluteFill
  style={{
  backgroundColor: '#030303',
  opacity,
  scale,
 }}
 >
 <AbsoluteFill
  style={{
  background:
  'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(229,22,54,0.08) 0%, transparent 60%)',
 }}
 />
 <AbsoluteFill
  style={{
  background:
  'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, rgba(3,3,3,0.55) 100%)',
 }}
 />
 <AbsoluteFill
  style={{
  justifyContent: 'center',
  alignItems: 'center',
  padding: '80px 80px',
 }}
 >
  <div
  style={{
  maxWidth: 1200, width: '100%', textAlign: 'center', fontFamily: FONT_FAMILY,
 }}
 >
  <h1
  style={{
  fontSize: 64, fontWeight: 700, color: '#fcfcfc', lineHeight: 1.1, margin: 0,
  letterSpacing: '-1.5px', textWrap: 'balance',
 }}
 >
  {project.headline}
  </h1>
  {project.narrativeSummary && (
 <p
  style={{
  marginTop: 32, fontSize: 28, fontWeight: 400, color: '#94a3b8', lineHeight: 1.4,
  textWrap: 'pretty',
 }}
 >
  {project.narrativeSummary}
  </p>
  )}
  {project.metadata?.postText?.tiktok && (
 <div
  style={{
  marginTop: 64, display: 'inline-flex', alignItems: 'center', gap: 12,
  padding: '14px 28px', borderRadius: 999,
  background:
  'linear-gradient(135deg, rgba(229,22,54,0.18) 0%, rgba(229,22,54,0.08) 100%)',
  border: '1px solid rgba(229,22,54,0.35)',
  color: '#e51636', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px',
 }}
 >
  {project.metadata.title}
  </div>
  )}
  </div>
  </AbsoluteFill>
  </AbsoluteFill>
  );
 };

interface SceneCardProps {
 scene: any;
 index: number;
 frame: number;
 fps: number;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, index, frame, fps }) => {
 const startFrame = Math.round((scene.startSec ?? index * 5) * fps);
 const durationFrames = Math.max(Math.round((scene.durationSec ?? 4) * fps), Math.round(fps));
 const local = frame - startFrame;
 const clampedLocal = Math.max(0, Math.min(local, durationFrames));

 const opacity = interpolate(clampedLocal, [0, 12], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: EASE_OUT,
 });

 const slideY = interpolate(clampedLocal, [0, 24], [24, 0], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: EASE_OUT,
 });

 const exitOpacity = interpolate(
  clampedLocal,
  [Math.max(durationFrames - 12, 0), durationFrames],
  [1, 0],
  {
   extrapolateLeft: 'clamp',
   extrapolateRight: 'clamp',
   easing: EASE_IN_OUT,
  },
 );

 const combinedOpacity = Math.min(opacity, exitOpacity);
 const mp = scene.motionProfile as any;
 const Component = mp?.component;
 const compProps = mp?.props ?? {};

 // Renderizar componente Remotion segun motionProfile, o fallback texto
 const renderContent = () => {
  if (!Component) {
   return (
    <>
     {scene.onScreenText && (
      <h2
       style={{
        fontSize: 56, fontWeight: 700, color: '#ffffff', lineHeight: 1.15, margin: 0,
        letterSpacing: '-1px', textWrap: 'balance',
       }}
      >
       {scene.onScreenText}
      </h2>
     )}
     {scene.visualDescription && (
      <p
       style={{
        marginTop: 28, fontSize: 24, fontWeight: 400, color: '#cbd5e1', lineHeight: 1.35,
        textWrap: 'pretty',
       }}
      >
       {scene.visualDescription}
      </p>
     )}
    </>
   );
  }

  switch (Component) {
   case 'TadHook':
    return <TadHook {...compProps} />;
   case 'KineticText':
    return <KineticText {...compProps} />;
   case 'CounterAnim':
    return <CounterAnim {...compProps} />;
   case 'GlowCard':
    return <GlowCard {...compProps} />;
   case 'AcidAndGlowCard':
    return <GlowCard {...compProps} />;
   default:
    return (
     <h2
      style={{
       fontSize: 52, fontWeight: 700, color: '#ffffff', lineHeight: 1.2, margin: 0,
       letterSpacing: '-1px',
      }}
     >
      {scene.onScreenText}
     </h2>
    );
  }
 };

 return (
  <AbsoluteFill
   style={{
    justifyContent: 'center', alignItems: 'center',
    padding: '80px 80px', opacity: combinedOpacity,
   }}
  >
   <div
    style={{
     maxWidth: 1200, width: '100%',
     transform: `translateY(${slideY}px)`,
     textAlign: 'center', fontFamily: FONT_FAMILY,
    }}
   >
    {renderContent()}
   </div>
  </AbsoluteFill>
 );
};

interface CaptionedSceneWrapperProps {
 scene: any;
 frame: number;
 fps: number;
 showCaptions: boolean;
}

const CaptionedSceneWrapper: React.FC<CaptionedSceneWrapperProps> = ({
 scene,
 frame,
 fps,
 showCaptions,
}) => {
 const local = frame;
 const opacity = interpolate(local, [0, 10], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: EASE_OUT,
 });

 const hasVoiceover = Array.isArray(scene.voiceover) && scene.voiceover.length > 0;
 if (!showCaptions || !hasVoiceover) return null;

 const words: { word: string; startSec: number; durationSec: number }[] = scene.voiceover;
 const captions = words.map((w: any, i: number) => {
  const startMs = (w.startSec ?? scene.startSec + i * 0.38) * 1000;
  const durMs = (w.durationSec ?? 0.38) * 1000;
  return {
  text: w.word,
  startMs: Math.round(startMs),
  endMs: Math.round(startMs + durMs),
  confidence: 1,
  timestampMs: Math.round(startMs),
  };
 });

 return (
 <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
  <AbsoluteFill
  style={{
  background:
  'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(229,22,54,0.06) 0%, transparent 60%)',
 }}
 />
  <TADCanonicalCaptionedScene captions={captions} />
  </AbsoluteFill>
  );
 };

export const TADCanonicalComposition: React.FC<{ project: VideoProject }> = ({
 project,
}) => {
 const scenes = (project as any).scenes as any[] | undefined;
 const { fps } = useVideoConfig();

 const durationSec =
  project.totalDurationSec > 0
  ? project.totalDurationSec
  : Array.isArray(scenes) && scenes.length > 0
 ? scenes.reduce((acc, s) => acc + (s.durationSec ?? 4), 0)
  : 30;

 const totalFrames = Math.max(Math.ceil(durationSec * fps), fps);
 const frame = useCurrentFrame();

 return (
 <Sequence name="TAD-Ad" from={0} durationInFrames={totalFrames}>
  <CanonicalScene project={project} frame={frame} fps={fps} />
  {Array.isArray(scenes) && scenes.length > 0 ? (
  scenes.map((scene, index) => {
  const startSec = scene.startSec ?? index * 5;
  const startFrame = Math.round(startSec * fps);
  const sceneDurationFrames = Math.max(
  Math.round((scene.durationSec ?? 4) * fps),
  Math.round(fps),
  );

  const hasVoiceover = Array.isArray(scene.voiceover) && scene.voiceover.length > 0;

  return (
 <React.Fragment key={`scene-group-${index}`}>
  <Sequence
  name={`scene-${index}`}
  from={startFrame}
  durationInFrames={sceneDurationFrames}
 >
  <SceneCard scene={scene} index={index} frame={frame} fps={fps} />
  </Sequence>
  {hasVoiceover && (
 <Sequence
  name={`scene-captions-${index}`}
  from={startFrame}
  durationInFrames={sceneDurationFrames}
 >
 <CaptionedSceneWrapper
 scene={scene}
 frame={frame}
 fps={fps}
 showCaptions
 />
  </Sequence>
  )}
  </React.Fragment>
  );
  })
  ) : null}
  </Sequence>
  );
 };

const WrappedComposition: React.FC<{ project?: VideoProject }> = ({ project }) => (
 <TADCanonicalComposition project={project ?? DEFAULT_PROJECT} />
);

// Entrypoint explícito para `src/templates/index.tsx`
type CompositionRootProps = { project?: VideoProject };
export const CompositionRoot: React.FC<CompositionRootProps> = WrappedComposition;

export default WrappedComposition;