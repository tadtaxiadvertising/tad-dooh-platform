import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { TADCanonicalComposition } from '../skill/remotion/compositions/tad-canonical';
import { DriverRecruit } from './driver-recruit';
import { buildStory, beatsToSceneSpecs } from '../skill/storytelling/engine';
import type { VideoProject } from '../skill/types';

// ── Seed scenes from the real storytelling pipeline ─────────────────────────
const FPS = 30;
const TOTAL_SEC = 30;
const seedBeats = buildStory('why-diesel', TOTAL_SEC, 'tiktok', 'persuasive');
const seedScenes = beatsToSceneSpecs(seedBeats, FPS);

const DEFAULT_PROJECT = {
  projectId: 'tad-default-seed',
  theme: 'why-diesel',
  platform: 'tiktok',
  title: 'TAD — Por qué tu cerebro recuerda esto sin querer',
  totalDurationSec: TOTAL_SEC,
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
  assetManifest: { icons: [], gradients: [], customAssets: [] },
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

const WrappedComposition: React.FC<{ project?: VideoProject }> = ({ project }) => (
  <TADCanonicalComposition project={project ?? DEFAULT_PROJECT} />
);

// ── Remotion entry root ─────────────────────────────────────────────────────
const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="DynamicAd"
      component={WrappedComposition as any}
      durationInFrames={900}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="DriverRecruit"
      component={DriverRecruit}
      durationInFrames={900}
      fps={FPS}
      width={1080}
      height={1920}
    />
  </>
);

registerRoot(RemotionRoot);

export default RemotionRoot;