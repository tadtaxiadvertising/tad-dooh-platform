// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Script Writer Agent
//  Produces the complete, production-ready script from a NarrativeBeat[].
//  Enriches: beats → computable voiceover timings, subtitle cues,
//  narrative summary, and optimization flags for downstream agents.
// ─────────────────────────────────────────────────────────────────────────────

import { SceneSpec, NarrativeBeat, VideoProject, ContentType, Platform } from '../types';
import { writeFullScript, rankHeadlines, generateOpenLoopHeadline } from '../copywriting/engine';
import { validateScript, ScriptQAReport } from '../storytelling/engine';

export interface ScriptWriterOutput {
  headline: string;
  scenes: SceneSpec[];
  narrativeSummary: string;
  scriptQA: ScriptQAReport;
  cta: string;
  citationsAdded: string[];
}

export function scriptWriterAgent(
  beats: NarrativeBeat[],
  theme: ContentType,
  platform: Platform,
  fps = 30,
): ScriptWriterOutput {
  // Build the headline
  const { headline, cta } = writeFullScript(beats as unknown as SceneSpec[], theme, platform);

  // Convert beats → SceneSpec (computable)
  const scenes: SceneSpec[] = beats.map((beat, idx) => ({
    id: idx,
    startSec: beat.startSec,
    durationSec: beat.durationSec,
    narrativeFunction: beat.narrativeFunction,
    cognitiveGoal: beat.cognitiveGoal,
    voiceover: beat.voiceover
      .split(' ')
      .map((word, i) => ({
        word,
        durationSec: 0.38,
        startSec: beat.startSec + i * 0.38,
      })),
    subtitles: [],
    onScreenText: beat.onScreenText,
    visualDescription: beat.visualDescription,
    assetsNeeded: inferAssetsForBeat(beat),
    motionEffects: beat.motionEffects,
    accentColor: beat.accentColor,
    remotionTechnique: beat.remotionTechnique,
    emotionTriggers: beat.emotionTriggers,
  }));

  // Construir resumen narrativo
  const narrativeSummary = buildNarrativeSummary(scenes);

  // Validar el script
  const scriptQA = validateScript(scenes, platform);

  // Construir subtítulos base (el Subtitle Agent los refina)
  const subtitleCues = buildSubtitleCues(scenes);
  scenes.forEach((scene, idx) => {
    scene.subtitles = subtitleCues.filter(c => c.startSec >= scene.startSec && c.startSec < scene.startSec + scene.durationSec);
  });

  // Agregar citas verificadas
  const citationsAdded = ['ATTENTION_KNOWLEDGE.sweller1988', 'MOTIVATION_KNOWLEDGE.schultz1997', 'MOTIVATION_KNOWLEDGE.kahneman1993'];

  return {
    headline,
    narrativeSummary,
    scenes,
    scriptQA,
    cta,
    citationsAdded,
  };
}

// ─── Subtítulos: construir cues de forma holística (2 líneas max, 8 palabras) ─

function buildSubtitleCues(scenes: SceneSpec[]): SceneSpec['subtitles'] {
  const cues: SceneSpec['subtitles'] = [];
  const MAX_WORDS_PER_CUE = 8;
  const MAX_LINE_LENGTH = 35;

  for (const scene of scenes) {
    const words = scene.voiceover;
    let buffer: string[] = [];
    let startTime = scene.startSec;
    const wordDuration = 0.38;

    for (let i = 0; i < words.length; i++) {
      buffer.push(words[i].word);
      if (buffer.length >= MAX_WORDS_PER_CUE) {
        const text = buffer.join(' ');
        cues.push({
          text: breakIntoLines(text, MAX_LINE_LENGTH),
          startSec: startTime,
          endSec: startTime + buffer.length * wordDuration,
        });
        startTime += buffer.length * wordDuration;
        buffer = [];
      }
    }

    // Flush residual
    if (buffer.length > 0) {
      cues.push({
        text: breakIntoLines(buffer.join(' '), MAX_LINE_LENGTH),
        startSec: startTime,
        endSec: scene.startSec + scene.durationSec,
      });
    }
  }

  return cues;
}

function breakIntoLines(text: string, maxChars: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars && current !== '') {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.join('\n');
}

// ─── Resumen narrativo ────────────────────────────────────────────────────────

function buildNarrativeSummary(scenes: SceneSpec[]): string {
  const functions = scenes.map((s) => s.narrativeFunction);
  const hasHook = functions.includes('hook');
  const hasRevelation = functions.includes('revelation');
  const hasCTA = functions.includes('cta');
  const hooks = ['open-loop', 'curiosity-gap'];

  const presence: string[] = [];
  if (hasHook) presence.push('hook poderoso');
  if (hooks.some((f) => functions.includes(f as any))) presence.push('open-loop narrativo');
  if (hasRevelation) presence.push('momento de revelación (aha-moment)');
  if (hasCTA) presence.push('CTA natural al final');

  return `Estructura: ${scenes.length} beats · ${scenes.reduce((a, s) => a + s.durationSec, 0).toFixed(1)}s · Incluye: ${presence.join(', ')}.`;
}

// ─── Assets inferidos para resource planning ──────────────────────────────────

function inferAssetsForBeat(beat: NarrativeBeat): SceneSpec['assetsNeeded'] {
  const assets: SceneSpec['assetsNeeded'] = [];

  if (beat.motionEffects.includes('particle-drift')) {
    assets.push({
      type: 'particle',
      description: 'Partículas doradas sutiles',
      library: '@remotion/noise',
    });
  }
  if (beat.narrativeFunction === 'proof') {
    assets.push({
      type: 'icon',
      description: 'Icono científico / checkmark animado',
      library: '@remotion/shapes',
    });
    assets.push({
      type: 'number',
      description: 'Contador numérico animado (stat 3x, etc.)',
      library: '@remotion/animation-utils',
    });
  }
  return assets;
}
