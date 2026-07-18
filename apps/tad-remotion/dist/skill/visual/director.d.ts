import type { Platform, SceneSpec, EmotionTrigger, MotionEffect, NarrativeBeat } from '../types';
export declare const TAD_PALETTE: {
    bgDark: string;
    bgDeep: string;
    bgPanel: string;
    primary: string;
    primaryGlow: string;
    yellow: string;
    yellowGlow: string;
    orange: string;
    purple: string;
    cyan: string;
    emerald: string;
    textPrimary: string;
    textSecondary: string;
    textDim: string;
    glassBg: string;
    glassBorder: string;
};
export interface MotionCurve {
    type: 'spring' | 'ease-in-out' | 'ease-out' | 'linear';
    config?: {
        damping: number;
        mass: number;
        stiffness: number;
    };
    durationFrames: number;
    /** Usado por interpolate para easing */
    interpolateFn?: 'easeInOut' | 'easeOut' | 'easeIn' | 'anticipate';
}
export declare function getMotionCurve(emotionTrigger: SceneSpec['emotionTriggers'][number], effect: MotionEffect): MotionCurve;
export declare function getPlatformComposition(platform: Platform): {
    width: number;
    height: number;
    fps: number;
};
export declare function getBackgroundGradient(beat: NarrativeBeat, platform: Platform): string;
export declare function describeAnimationProps(effect: MotionEffect, emotion: EmotionTrigger, frame: number, fps: number): {
    opacity: string;
    transform: string;
    filter?: undefined;
    clipPath?: undefined;
} | {
    transform: string;
    opacity?: undefined;
    filter?: undefined;
    clipPath?: undefined;
} | {
    opacity: string;
    transform?: undefined;
    filter?: undefined;
    clipPath?: undefined;
} | {
    filter: string;
    opacity: string;
    transform?: undefined;
    clipPath?: undefined;
} | {
    clipPath: string;
    opacity?: undefined;
    transform?: undefined;
    filter?: undefined;
} | {
    opacity?: undefined;
    transform?: undefined;
    filter?: undefined;
    clipPath?: undefined;
};
export declare function getTypographyScale(scene: SceneSpec, platform: Platform): {
    h1: number;
    h2: number;
    body: number;
    weight: number;
};
export declare function pickAccentColor(beat: NarrativeBeat, sceneIndex: number): string;
//# sourceMappingURL=director.d.ts.map