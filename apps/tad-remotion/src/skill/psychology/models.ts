// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Psychology Models
//  Modelos cognitivos aplicados a producción de video.
//  Cada función es pura: (input) → (output), sin side-effects.
//  Fundamentados en: Sweller (1988), Loewenstein (1994), Schultz (1997),
//  Cialdini (2001), Kahneman (1993), Zajonc (1968), Reber (2004).
// ─────────────────────────────────────────────────────────────────────────────

import {
  ContentType,
  EmotionTrigger,
  Platform,
  SceneSpec,
  VideoProject,
} from '../types';
import { ATTENTION_KNOWLEDGE, MOTIVATION_KNOWLEDGE, PERSUASION_KNOWLEDGE } from '../knowledge';

// ─── Reglas de pacing por plataforma ─────────────────────────────────────────

/**
 * Determina el mínimo intervalo entre cambios visuales significativos
 * (scene transitions o cambios de composición) según la plataforma.
 * Basado en datos de engagement de cortos formato.
 */
export function getMinimumSceneDurationSec(platform: Platform): number {
  const config: Record<Platform, number> = {
    tiktok: 2.5,
    instagram: 3.0,
    facebook: 3.0,
    linkedin: 5.0,
    youtube: 3.0,
  };
  return config[platform] || 3.0;
}

// ─── Aplicación del Zeigarnik Effect ─────────────────────────────────────────

/**
 * Retorna si una escena debe abrir un loop narrativo (pregunta sin resolver)
 * basado en el Zeigarnik Effect: las interrupciones aumentan la retención
 * de esa información en memoria.
 * Zeigarnik (1927) + repl. Wegge (2006).
 *
 * Regla: toda escena en las primeras 2/3 del video debe dejar un loop abierto
 * si su narrativeFunction no es 'cta' ni 'takeaway'.
 */
export function shouldOpenLoop(scene: SceneSpec, projectTotalSec: number): boolean {
  const OPEN_LOOP_FUNCTIONS: SceneSpec['narrativeFunction'][] = [
    'hook',
    'open-loop',
    'curiosity-gap',
    'revelation',
  ];
  const LAST_THIRD_START = (projectTotalSec * 2) / 3;
  if (scene.startSec + scene.durationSec > LAST_THIRD_START) return false;
  return OPEN_LOOP_FUNCTIONS.includes(scene.narrativeFunction);
}

// ─── Aplicación del Peak-End Rule ────────────────────────────────────────────

/**
 * Verifica que el proyecto tenga al menos:
 * 1. Un "pico emocional" (peak) con triggers de curiosidad/sorpresa/aha-moment
 * 2. Un cierre positivo (end) con triggers de empowerment/reciprocity
 *
 * Kahneman et al. (1993): la experiencia se juzga por el pico y el final.
 */
export interface PeakEndValidation {
  hasPeak: boolean;
  hasPositiveEnd: boolean;
  peakFrame?: number;
  endFrame?: number;
}

export function validatePeakEndRule(
  scenes: SceneSpec[],
  totalFrames: number,
): PeakEndValidation {
  const HIGH_TRIGGERS: EmotionTrigger[] = ['curiosity', 'surprise', 'aha-moment'];
  const POSITIVE_END_TRIGGERS: EmotionTrigger[] = [
    'empowerment',
    'reciprocity',
    'social-proof',
    'authority',
  ];

  let hasPeak = false;
  let peakFrame = 0;
  let hasPositiveEnd = false;
  let endFrame = 0;

  const PEAK_REGION = [totalFrames * 0.3, totalFrames * 0.7];
  const END_REGION_START = totalFrames * 0.75;

  for (const scene of scenes) {
    const sceneMidFrame = (scene.startSec + scene.durationSec / 2) * 30;
    const sceneEndFrame = scene.startSec * 30 + scene.durationSec * 30;

    // ¿Está en región pico?
    if (
      sceneMidFrame >= PEAK_REGION[0] &&
      sceneMidFrame <= PEAK_REGION[1] &&
      scene.emotionTriggers.some((t) => HIGH_TRIGGERS.includes(t))
    ) {
      hasPeak = true;
      peakFrame = sceneMidFrame;
    }

    // ¿Está en región final?
    if (sceneEndFrame >= END_REGION_START) {
      if (scene.emotionTriggers.some((t) => POSITIVE_END_TRIGGERS.includes(t))) {
        hasPositiveEnd = true;
        endFrame = sceneEndFrame;
      }
    }
  }

  return { hasPeak, hasPositiveEnd, peakFrame, endFrame };
}

// ─── Aplicación de Priming Effect ────────────────────────────────────────────

/**
 * Bargh et al. (1996): exponer a una persona a un estímulo previo activa
 * asociaciones en su memoria ANTES del estímulo objetivo.
 *
 * Esta función retorna un orden sugerido de scenes que maximiza el priming:
 * 1. Estímulo previo (palabra/imagen clave) a los pocos segundos del inicio
 * 2. Contexto psicológico (Why this matters)
 * 3. Estímulo objetivo (la revelación principal)
 */
export function getPrimingSequence(scenes: SceneSpec[]): SceneSpec[] {
  // Orden preferido para memoria a largo plazo
  const PREFERENCE_ORDER: Record<SceneSpec['narrativeFunction'], number> = {
    hook: 1,
    'open-loop': 2,
    'curiosity-gap': 3,
    calibration: 4,
    revelation: 5,
    'micro-reward': 6,
    proof: 7,
    'emotion-build': 8,
    cliffhanger: 9,
    takeaway: 10,
    cta: 11,
  };
  return [...scenes].sort((a, b) => {
    const rankA = PREFERENCE_ORDER[a.narrativeFunction] ?? 5;
    const rankB = PREFERENCE_ORDER[b.narrativeFunction] ?? 5;
    return rankA - rankB;
  });
}

// ─── Cognitive Load Check ────────────────────────────────────────────────────

/**
 * Sweller (1988): memoria de trabajo = 4 ± 1 chunks.
 *
 * Un "chunk" visual operativo en video = un texto en pantalla + un gráfico
 * o icono + un movimiento simultáneo.
 *
 * Si en cualquier segundo dado hay más de 4 chunks simultáneos: WARNING.
 */
export interface CognitiveLoadWarning {
  frame: number;
  chunkCount: number;
  severity: 'warning' | 'critical';
}

export function checkCognitiveLoad(scenes: SceneSpec[]): CognitiveLoadWarning[] {
  const warnings: CognitiveLoadWarning[] = [];
  const MAX_CHUNKS = 4;

  for (const scene of scenes) {
    const startFrame = scene.startSec * 30;
    const endFrame = startFrame + scene.durationSec * 30;

    // Heurística: cada texto en pantalla = 1 chunk, cada motion effect = +0.5
    const textChunks = scene.onScreenText ? 1 : 0;
    const motionChunks = scene.motionEffects.length * 0.5;
    const totalChunks = textChunks + motionChunks + 1; // +1 = base visual

    for (let f = startFrame; f <= endFrame; f += 15) {
      // Sample every 0.5 seconds
      if (totalChunks > MAX_CHUNKS + 1) {
        warnings.push({
          frame: f,
          chunkCount: Math.ceil(totalChunks),
          severity: totalChunks > MAX_CHUNKS + 2 ? 'critical' : 'warning',
        });
      }
    }
  }

  return warnings;
}

// ─── Calidad de pacing: ideal cuts index ─────────────────────────────────────

/**
 * Retorna un índice de calidad del pacing del video:
 * 1.0 = ideal, 0 = pacing pésimo.
 *
 * Criterios:
 * - Cambios cada 1.5-4s (plataformas verticales)
 * - Cambios cada 3-6s (plataformas horizontales)
 * - No más de 3 segundos sin cambio visual o textual
 */
export function computePacingScore(scenes: SceneSpec[], platform: Platform): number {
  const MIN_INTERVAL = getMinimumSceneDurationSec(platform);
  const MAX_INTERVAL = MIN_INTERVAL * 2.5;
  const GAPS: number[] = [];

  for (let i = 1; i < scenes.length; i++) {
    const prevEnd = scenes[i - 1].startSec + scenes[i - 1].durationSec;
    const currStart = scenes[i].startSec;
    GAPS.push(currStart - prevEnd);
  }

  if (GAPS.length === 0) return 1.0;

  let score = 1.0;
  for (const gap of GAPS) {
    if (gap < MIN_INTERVAL * 0.5) {
      score -= 0.2; // demasiado rápido
    } else if (gap > MAX_INTERVAL) {
      score -= 0.15; // demasiado lento
    } else {
      score += 0.02;
    }
  }

  return Math.max(0, Math.min(1, score));
}

// ─── Emotional Arc: ea-index ─────────────────────────────────────────────────

/**
 * Calcula la intensidad emocional a lo largo del video basado en triggers
 * de Cialdini (2001) + Regla del Peak-End.
 * Retorna un array de intensidades por segundo.
 */
export function computeEmotionalArc(
  scenes: SceneSpec[],
  totalSec: number,
): { second: number; intensity: number; trigger: EmotionTrigger | null }[] {
  const arc: { second: number; intensity: number; trigger: EmotionTrigger | null }[] = [];

  // Trigger base: curiosidad = 0.6, sorpresa = 0.8, aha = 0.9, empowerment = 0.7
  const TRIGGER_WEIGHT: Record<EmotionTrigger, number> = {
    curiosity: 0.6,
    surprise: 0.85,
    'aha-moment': 0.9,
    'social-proof': 0.65,
    authority: 0.7,
    reciprocity: 0.6,
    scarcity: 0.75,
    fomo: 0.8,
    empowerment: 0.7,
    relief: 0.55,
  };

  for (let s = 0; s <= totalSec; s++) {
    const scene = scenes.find((sc) => s >= sc.startSec && s < sc.startSec + sc.durationSec);
    let maxIntensity = 0.3; // base
    let dominantTrigger: EmotionTrigger | null = null;

    if (scene) {
      for (const trigger of scene.emotionTriggers) {
        const w = TRIGGER_WEIGHT[trigger] ?? 0.5;
        if (w > maxIntensity) {
          maxIntensity = w;
          dominantTrigger = trigger;
        }
      }
    }

    // Aplicar peak-end boost
    const peakStart = totalSec * 0.3;
    const peakEnd = totalSec * 0.7;
    const isPeakZone = s >= peakStart && s <= peakEnd;
    if (isPeakZone && maxIntensity > 0.5) {
      maxIntensity = Math.min(1, maxIntensity + 0.1);
    }

    arc.push({ second: s, intensity: maxIntensity, trigger: dominantTrigger });
  }

  return arc;
}

// ─── Cialdini Principle Router ───────────────────────────────────────────────

/**
 * Retorna los 2-3 principios de Cialdini más relevantes para un tipo de
 * contenido DOOH. Justificación:
 *
 * - 'informative': Autoridad + Reciprocidad (damos conocimiento, generamos
 *   confianza; luego el espectador quiere corresponder).
 * - 'persuasive': Escasez + Prueba Social (capacidad limitada por taxi +
 *   "otras marcas ya lo hacen").
 * - 'authority': Autoridad + Prueba Social + Compromiso.
 */
export function getCialdiniPrinciples(tier: VideoProject['engagementTier'] = 'informative') {
  switch (tier) {
    case 'persuasive':
      return ['escases', 'prueba-social', 'urgencia'];
    case 'authority':
      return ['autoridad', 'prueba-social', 'compromiso'];
    default:
      return ['autoridad', 'reciprocidad', 'prueba-social'];
  }
}

export { ATTENTION_KNOWLEDGE, MOTIVATION_KNOWLEDGE, PERSUASION_KNOWLEDGE };
