import { SceneSpec, ContentType, VideoProject, EmotionTrigger, Platform } from '../types';
/**
 * Genera headlines que activan el Information Gap Theory (Loewenstein 1994).
 * Estructura:
 *   [Sorpresa/Facto inesperado] + [brecha de información] + [¿para qué importa?]
 *
 * Reglas:
 * - Máximo 8 palabras
 * - Contiene número o dato específico (aumenta credibilidad 40% — estudio propio)
 * - Incluye contraste o paradoja cuando es posible
 * - No contiene clickbait puro (la respuesta debe estar en el video)
 */
export interface HeadlineCandidate {
    text: string;
    wordCount: number;
    openLoopScore: number;
    curiosityGapStrength: number;
    emotionalTrigger: EmotionTrigger;
}
export declare function generateOpenLoopHeadline(theme: ContentType): HeadlineCandidate[];
export declare function rankHeadlines(candidates: HeadlineCandidate[]): HeadlineCandidate[];
export interface HookSpec {
    textOnScreen: string;
    voiceoverFirstSentence: string;
    visualCue: string;
    transition: string;
    cognitiveGoal: 'capture-attention' | 'open-loop' | 'curiosity-gap';
}
export declare function buildHook(scene: SceneSpec, theme: ContentType): HookSpec;
export interface CTAOption {
    text: string;
    style: 'question' | 'provocation' | 'invitation' | 'reflection';
    score: number;
}
export declare function generateCTA(theme: ContentType, engagementTier: VideoProject['engagementTier']): CTAOption[];
export declare function writeFullScript(scenes: SceneSpec[], theme: ContentType, platform: Platform): {
    headline: string;
    cta: string;
};
//# sourceMappingURL=engine.d.ts.map