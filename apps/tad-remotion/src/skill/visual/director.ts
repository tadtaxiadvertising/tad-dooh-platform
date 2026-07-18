// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Visual Director / Scene Planner
//  Traduce NarrativeBeats en specs visuales ejecutables para Remotion.
//
//  Responsabilidades:
//  - Seleccionar la técnica Remotion correcta para cada beat
//  - Definir la paleta de color, gradientes y composición
//  - Planificar motion design (easing curves, timing)
//  - Optimizar para mobile-first (TikTok/IG vertical)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ContentType,
  Platform,
  SceneSpec,
  VideoProject,
  EmotionTrigger,
  RemotionTechnique,
  MotionEffect,
  NarrativeBeat,
} from '../types';
import { validatePeakEndRule } from '../psychology/models';

// ─── Paleta de marca TAD ──────────────────────────────────────────────────────

export const TAD_PALETTE = {
  bgDark: '#000000',
  bgDeep: '#0a0a0b',
  bgPanel: '#0f172a',
  primary: '#e51636',     // Rojo TAD (ya en uso)
  primaryGlow: 'rgba(229,22,54,0.35)',
  yellow: '#fad400',      // Amarillo TAD
  yellowGlow: 'rgba(250,212,0,0.25)',
  orange: '#f97316',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  emerald: '#10b981',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textDim: '#64748b',
  glassBg: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
};

// ─── Config de visual por ContentType ────────────────────────────────────────

const VISUAL_STYLE: Record<ContentType, {
  palette: string[];
  dominantShape: 'circle' | 'line' | 'grid' | 'card' | 'number';
  motionDirection: 'horizontal' | 'vertical' | 'radial' | 'diagonal';
}> = {
  'why-diesel': {
    palette: [TAD_PALETTE.primary, TAD_PALETTE.yellow, TAD_PALETTE.bgDark],
    dominantShape: 'circle',
    motionDirection: 'radial',
  },
  'attention-economy': {
    palette: [TAD_PALETTE.purple, TAD_PALETTE.primary, TAD_PALETTE.yellow],
    dominantShape: 'line',
    motionDirection: 'horizontal',
  },
  'brain-ad': {
    palette: [TAD_PALETTE.cyan, TAD_PALETTE.purple, TAD_PALETTE.bgDeep],
    dominantShape: 'grid',
    motionDirection: 'diagonal',
  },
  'dead-time': {
    palette: [TAD_PALETTE.yellow, TAD_PALETTE.orange, TAD_PALETTE.bgDark],
    dominantShape: 'line',
    motionDirection: 'horizontal',
  },
  'impossible-to-ignore': {
    palette: [TAD_PALETTE.primary, TAD_PALETTE.emerald, TAD_PALETTE.yellow],
    dominantShape: 'card',
    motionDirection: 'vertical',
  },
  'myth-busting': {
    palette: [TAD_PALETTE.purple, TAD_PALETTE.orange, TAD_PALETTE.bgPanel],
    dominantShape: 'grid',
    motionDirection: 'radial',
  },
  'explainer': {
    palette: [TAD_PALETTE.primary, TAD_PALETTE.yellow, TAD_PALETTE.cyan],
    dominantShape: 'circle',
    motionDirection: 'diagonal',
  },
};

// ─── Selección de técnica Remotion por función narrativa ─────────────────────

function remotionTechniqueForFunction(
  narrativeFunction: SceneSpec['narrativeFunction'],
): RemotionTechnique {
  switch (narrativeFunction) {
    case 'hook':
    case 'open-loop':
      return 'AbsoluteFill';          // fondo inmersivo + spring-enter global
    case 'revelation':
    case 'micro-reward':
      return 'interpolate';           // blur-reveal o mask-reveal controlado
    case 'proof':
      return 'AnimatedSVG';           // gráficos SVG animados
    case 'cta':
    case 'takeaway':
      return 'Sequence';              // secuencia ordenada de sub-elementos
    default:
      return 'AbsoluteFill';
  }
}

// ─── Motion curve según emoción ───────────────────────────────────────────────

export interface MotionCurve {
  type: 'spring' | 'ease-in-out' | 'ease-out' | 'linear';
  config?: { damping: number; mass: number; stiffness: number };
  durationFrames: number;
  /** Usado por interpolate para easing */
  interpolateFn?: 'easeInOut' | 'easeOut' | 'easeIn' | 'anticipate';
}

export function getMotionCurve(
  emotionTrigger: SceneSpec['emotionTriggers'][number],
  effect: MotionEffect,
): MotionCurve {
  switch (emotionTrigger) {
    case 'curiosity':
      return {
        type: 'spring',
        config: { damping: 12, mass: 0.6, stiffness: 180 },
        durationFrames: 24,
      };
    case 'surprise':
      return {
        type: 'spring',
        config: { damping: 6, mass: 1.2, stiffness: 400 },
        durationFrames: 12,
      };
    case 'aha-moment':
      return {
        type: 'ease-out',
        durationFrames: 20,
        interpolateFn: 'anticipate',
      };
    case 'social-proof':
    case 'authority':
      return {
        type: 'ease-in-out',
        durationFrames: 28,
      };
    case 'empowerment':
      return {
        type: 'spring',
        config: { damping: 16, mass: 0.5, stiffness: 120 },
        durationFrames: 30,
      };
    default:
      return {
        type: 'ease-out',
        durationFrames: 22,
      };
  }
}

// ─── Presets de composición por plataforma ───────────────────────────────────

export function getPlatformComposition(platform: Platform): { width: number; height: number; fps: number } {
  const map: Record<Platform, { width: number; height: number; fps: number }> = {
    tiktok: { width: 1080, height: 1920, fps: 30 },
    instagram: { width: 1080, height: 1920, fps: 30 },
    facebook: { width: 1080, height: 1920, fps: 30 },
    linkedin: { width: 1920, height: 1080, fps: 30 },
    youtube: { width: 1920, height: 1080, fps: 30 },
  };
  return map[platform];
}

// ─── Generar gradientes de fondo por beat ────────────────────────────────────

export function getBackgroundGradient(beat: NarrativeBeat, platform: Platform): string {
  const style = VISUAL_STYLE[platform === 'linkedin' || platform === 'youtube' ? 'explainer' : 'explainer'];
  const c = beat.accentColor || TAD_PALETTE.primary;
  const isVertical = platform === 'tiktok' || platform === 'instagram' || platform === 'facebook';

  if (isVertical) {
    // Vertical: gradiente radial o lineal predominante
    return `
      radial-gradient(ellipse 70% 60% at 50% 30%, ${c}25 0%, transparent 70%),
      radial-gradient(ellipse 50% 50% at 80% 70%, ${c}15 0%, transparent 60%),
      ${TAD_PALETTE.bgDeep}
    `.replace(/\s+/g, ' ').trim();
  }

  // Horizontal
  return `
    radial-gradient(ellipse 60% 50% at 30% 40%, ${c}20 0%, transparent 60%),
    radial-gradient(ellipse 50% 50% at 70% 60%, ${c}10 0%, transparent 50%),
    ${TAD_PALETTE.bgPanel}
  `.replace(/\s+/g, ' ').trim();
}

// ─── Definir animaciones por tipo de efecto ──────────────────────────────────

export function describeAnimationProps(
  effect: MotionEffect,
  emotion: EmotionTrigger,
  frame: number,
  fps: number,
) {
  const curve = getMotionCurve(emotion, effect);
  const local = frame - 2; // anticípate 2 frames

  switch (effect) {
    case 'spring-enter':
      return {
        opacity: `interpolate(local, [0, ${curve.durationFrames}], [0, 1], { extrapolateLeft: 'clamp' })`,
        transform: `spring({ frame: local, fps: ${fps}, from: 30, to: 0, config: curve.config })`,
      };
    case 'slide-in-left':
      return {
        transform: `spring({ frame: local, fps: ${fps}, from: -200, to: 0, config: { damping: 14, mass: 0.7 } })`,
      };
    case 'slide-in-right':
      return {
        transform: `spring({ frame: local, fps: ${fps}, from: 200, to: 0, config: { damping: 14, mass: 0.7 } })`,
      };
    case 'scale-pulse':
      return {
        transform: `spring({ frame: local, fps: ${fps}, from: 0.8, to: 1, config: { damping: 10, mass: 0.8 } })`,
      };
    case 'glow-pulse':
     return {
     opacity: `interpolate(local % 30, [0, 15, 30], [0.5, 1, 0.5])`,
     };
     case 'blur-reveal':
     return {
     filter: `interpolate(local, [0, 15, 30], ['blur(12px)', 'blur(4px)', 'blur(0px)'])`,
     opacity: `interpolate(local, [0, 15, 30], [0, 0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`,
     };
     case 'mask-reveal':
     return {
     clipPath: `polygon(-10% -10%, -10% 110%, interpolate(local, [0, 20], [-10, 110], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })% 110%, -10% -10%)`,
     };
    default:
      return {};
  }
}

// ─── Tipografía por tipo de contenido ────────────────────────────────────────

export function getTypographyScale(scene: SceneSpec, platform: Platform) {
  const isVertical = platform === 'tiktok' || platform === 'instagram' || platform === 'facebook';

  if (isVertical) {
    switch (scene.narrativeFunction) {
      case 'hook':
        return { h1: 68, h2: 28, body: 22, weight: 800 };
      case 'revelation':
      case 'micro-reward':
        return { h1: 56, h2: 30, body: 22, weight: 700 };
      case 'proof':
        return { h1: 42, h2: 22, body: 18, weight: 600 };
      case 'cta':
      case 'takeaway':
        return { h1: 60, h2: 24, body: 20, weight: 700 };
      default:
        return { h1: 52, h2: 26, body: 20, weight: 600 };
    }
  }

  // Horizontal
  return { h1: 48, h2: 28, body: 20, weight: 700 };
}

// ─── Color de acento dinámico por beat ───────────────────────────────────────

export function pickAccentColor(
  beat: NarrativeBeat,
  sceneIndex: number,
): string {
  if (beat.accentColor) return beat.accentColor;
  const palette = [TAD_PALETTE.primary, TAD_PALETTE.yellow, TAD_PALETTE.cyan, TAD_PALETTE.purple];
  return palette[sceneIndex % palette.length];
}
