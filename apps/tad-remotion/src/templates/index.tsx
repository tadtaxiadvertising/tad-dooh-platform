import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { TADCanonicalComposition } from '../skill/remotion/compositions/tad-canonical';
import type { VideoProject } from '../skill/types';

// Default project — type assertion porque los campos reales se inyectan vía pipeline
const DEFAULT_PROJECT = {
  projectId: 'tad-default',
  theme: 'promo' as any,
  platform: 'tiktok' as any,
  title: 'TAD Video',
  totalDurationSec: 30,
  fps: 30,
  actualFps: 30,
  headline: 'Tu mensaje aquí',
  narrativeSummary: '',
  scenes: [],
  citations: [],
  metadata: {} as any,
  assetManifest: {} as any,
  remotionCode: '',
  qaReport: {} as any,
  generatedAt: new Date().toISOString(),
} as VideoProject;

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
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);

registerRoot(RemotionRoot);

export default RemotionRoot;