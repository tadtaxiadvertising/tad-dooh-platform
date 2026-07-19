import { SceneSpec, ContentType, Platform } from '../types';
export interface NarrativeBeat {
    /** ID del beat en la estructura */
    beatId: number;
    /** Título del beat */
    label: string;
    /** Timestamp de inicio (segundos) */
    startSec: number;
    /** Duración del beat en segundos */
    durationSec: number;
    /** Función narrativa */
    narrativeFunction: SceneSpec['narrativeFunction'];
    /** Objetivo cognitivo */
    cognitiveGoal: SceneSpec['cognitiveGoal'];
    /** Texto del guión (narración hablada) */
    voiceover: string;
    /** Texto en pantalla */
    onScreenText: string;
    /** Triggers emocionales del beat */
    emotionTriggers: SceneSpec['emotionTriggers'];
    /** Visual description del beat (para el Visual Director agent) */
    visualDescription: string;
    /** Efectos de motion */
    motionEffects: SceneSpec['motionEffects'];
    /** Técnica Remotion */
    remotionTechnique: SceneSpec['remotionTechnique'];
    /** Color de acento del beat */
    accentColor: string;
}
export interface SceneVisualProfile {
    component: 'TadHook' | 'KineticText' | 'CounterAnim' | 'GlowCard' | 'AcidAndGlowCard';
    props: Record<string, unknown>;
    desc?: string;
}
export declare function buildStory(theme: ContentType | string, totalSec: number, platform: Platform, engagementTier?: 'informative' | 'persuasive' | 'authority'): NarrativeBeat[];
export declare function beatsToSceneSpecs(beats: NarrativeBeat[], fps?: number): SceneSpec[];
export interface ScriptQAReport {
    passed: boolean;
    issues: string[];
    warnings: string[];
    suggestions: string[];
}
export declare function validateScript(scenes: SceneSpec[], platform: Platform): ScriptQAReport;
//# sourceMappingURL=engine.d.ts.map