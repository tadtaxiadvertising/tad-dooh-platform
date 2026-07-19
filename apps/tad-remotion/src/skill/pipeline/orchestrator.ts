// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Master Pipeline
//  Orquesta todos los agentes especializados para producir un VideoProject
//  listo para publicar desde cualquier tema + plataforma elegida.
//
//  Flujo:
//   1. Storyteller Agent   → NarrativeBeat[]
//   2. Copywriter Agent    → headline + CTA
//   3. Script Writer Agent → SceneSpec[] computable + subtítulos base
//   4. Visual Director     → specs de composición y gradientes
//   5. Research Agent      → enriquece con citas verificadas
//   6. QA Agent            → QAReport
//  ─────────────────────────────────────────────────────────────────────────────

import {
  SkillInput,
  VideoProject,
  Platform,
  ContentType,
} from '../types';
import { buildStory, beatsToSceneSpecs, validateScript, ScriptQAReport } from '../storytelling/engine';
import { generateOpenLoopHeadline, rankHeadlines, generateCTA, writeFullScript } from '../copywriting/engine';
import { scriptWriterAgent } from '../agents/script-writer';
import { applyResearch, getStatsForTheme, buildCitations } from '../agents/research-agent';
import { validatePeakEndRule, computePacingScore, checkCognitiveLoad, computeEmotionalArc } from '../psychology/models';
import { TAD_PALETTE, pickAccentColor, getBackgroundGradient, getTypographyScale, getMotionCurve } from '../visual/director';
import { exportMetadata, exportSRT, exportASS, exportMetadataJSON } from '../agents/export-agent';
import { runFullQA } from '../agents/qa-agent';

// ─── Input del Pipeline ───────────────────────────────────────────────────────

export interface SkillPipelineInput {
  theme: ContentType | string;
  platform?: Platform;
  durationSec?: number;
  tone?: 'professional' | 'educational' | 'curious' | 'provocative';
  brand?: { name: string; colorPrimary?: string; colorSecondary?: string; tagline?: string; website?: string };
}

// ─── Ejecutar pipeline completo ────────────────────────────────────────────────

export async function runPipeline(input: SkillPipelineInput): Promise<VideoProject> {
  // 1. Validar y resolver inputs
  const platform: Platform = input.platform ?? 'tiktok';
  const theme = resolveTheme(input.theme); 
  const durationSec = input.durationSec ?? (platform === 'linkedin' ? 70 : 30);
  const fps = 30;
  const brandColor = input.brand?.colorPrimary ?? TAD_PALETTE.primary;

  // 2. Storyteller Agent — NarrativeBeat[]
  const beats = buildStory(theme, durationSec, platform);

  // 3. Copywriter Agent — headline + CTA
  const { headline, cta } = writeFullScript(
    beats.map((b) => ({
      ...b,
      onScreenText: b.onScreenText,
    })) as any,
    theme,
    platform,
  );

  // 4. Script Writer Agent — SceneSpec[] computable
  let scriptOutput = scriptWriterAgent(beats, theme, platform, fps);

  // Aplicar brand color a todas las escenas
  const scenes: VideoProject['scenes'] = scriptOutput.scenes.map((scene, idx) => ({
    ...scene,
    accentColor: input.brand?.colorPrimary ?? pickAccentColor({ ...beats[idx], accentColor: '' }, idx),
    remotionTechnique: scene.remotionTechnique,
  }));

  // 5. Construit projecte base
  const projectId = `tad-video-${Date.now()}`;
  const totalFrames = Math.round(durationSec * fps);
  const narrativeOrientation =
   input.tone === 'provocative'
    ? 'INVASIÓN DE ATENCIÓN'
    : input.tone === 'educational'
     ? 'CONOCIMIENTO EN MOVIMIENTO'
     : 'EXPERIENCIA URBANA';
  const peakEndValidation = validatePeakEndRule(scenes, totalFrames);
  const pacingScore = computePacingScore(scenes, platform);
  const transcriptSummary =
   scriptOutput.narrativeSummary ||
   'Narrativa estructurada por TAD Remotion skill.';

  const project: VideoProject = {
   projectId,
   theme,
   platform,
   title: headline,
   totalDurationSec: durationSec,
   fps,
   actualFps: fps,
   headline,
   narrativeSummary: transcriptSummary,
   scenes,
   citations: [],
   metadata: {
    title: headline,
    description: `${headline} — publi TAD DOOH de ${durationSec}s sobre ${theme}.`,
    hashtags: ['DOOH', 'TAD', theme],
    postText: {
     instagram: '',
     tiktok: '',
     linkedin: '',
     facebook: '',
     youtube: '',
    },
    thumbnailPrompt: `Publicidad DOOH TAD para ${theme}: taxis en movimiento, tipografía brillante sobre fondo oscuro.`,
   },
   assetManifest: {
    icons: [],
    gradients: scenes.map((_, i) =>
     getBackgroundGradient({ ...(beats[i] as any), accentColor: scenes[i]?.accentColor ?? TAD_PALETTE.primary }, platform),
    ),
    customAssets: [],
   },
   remotionCode: '',
   qaReport: {
    passed: false,
    checks: [],
    warnings: [],
    errors: [],
   },
   generatedAt: new Date().toISOString(),
  };

  // 6. Research Agent — insertar citas verificadas
  const enriched = applyResearch({ project, theme });
  const citations = buildCitations(theme);
  enriched.citations = [...(enriched.citations ?? []), ...citations];
  const finalProject = enriched;

  // 7. Metadata — Export Agent
  const metadata = exportMetadata(finalProject, platform);
  finalProject.metadata = metadata;
  finalProject.metadata.title = headline;
  finalProject.metadata.thumbnailPrompt = metadata.thumbnailPrompt;

  // 8. QA — QA Agent
  const qaReport = runFullQA(finalProject, platform);
  finalProject.qaReport = qaReport;

  // 9. Generar emotional arc para monitoring futuro
  finalProject.metadata = {
    ...finalProject.metadata,
  };

  // 10. Remotion code representation (placeholder — completado por Remotion Generator)
  finalProject.remotionCode = `// GENERADO POR PIPELINE. Completar con componentes Remotion.\n// Ver skill/remotion/compositions/`;

  return finalProject;
}

// ─── Resolver theme a ContentType válido ─────────────────────────────────────

function resolveTheme(raw: string): ContentType {
  const valid: ContentType[] = [
    'why-diesel',
    'attention-economy',
    'brain-ad',
    'dead-time',
    'impossible-to-ignore',
    'myth-busting',
    'explainer',
  ];
  if (valid.includes(raw as ContentType)) return raw as ContentType;
  // Buscar palabra clave más cercana (fuzzy simple)
  const keywords: Record<string, ContentType> = {
    recordacion: 'why-diesel',
    atención: 'attention-economy',
    atencion: 'attention-economy',
    cerebro: 'brain-ad',
    tiempo_muerto: 'dead-time',
    'tiempo muerto': 'dead-time',
    'dead-time': 'dead-time',
    ignorar: 'impossible-to-ignore',
    mito: 'myth-busting',
    myth: 'myth-busting',
    qué: 'explainer',
    que: 'explainer',
    dooh: 'explainer',
  };
  const lower = raw.toLowerCase();
  for (const [k, v] of Object.entries(keywords)) {
    if (lower.includes(k)) return v;
  }
  return 'explainer';
}

// ─── Helpers de reporte ──────────────────────────────────────────────────────

export function getPipelineSummary(project: VideoProject): string {
  const qa = project.qaReport;
  const totalScenes = project.scenes.length;
  const totalDuration = project.totalDurationSec;
  const avgSceneDuration = (totalScenes > 0 ? totalDuration / totalScenes : 0).toFixed(1);
  const citationsCount = project.citations.length;

  return [
    `TAD Remotion Pipeline — Reporte`,
    `─────────────────────────────────`,
    `Proyecto : ${project.projectId}`,
    `Tema     : ${project.theme}`,
    `Plataforma: ${project.platform}`,
    `Duración : ${totalDuration}s (${totalDuration > 0 ? ((totalDuration/60)*100).toFixed(0) : 0})% min`,
    `Escenas  : ${totalScenes}`,
    `AvgScene : ${avgSceneDuration}s`,
    `Citas    : ${citationsCount}`,
    `QA Pass  : ${qa.passed ? '✅ PASS' : '❌ FAIL'}`,
    ...(qa.errors.length > 0 ? [`Errores  : ${qa.errors.join(', ')}`] : []),
    ...(qa.warnings.length > 0 ? [`Warnings : ${qa.warnings.join(', ')}`] : []),
  ].join('\n');
}
