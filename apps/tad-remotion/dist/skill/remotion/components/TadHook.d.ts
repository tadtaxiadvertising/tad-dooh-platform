import React from 'react';
interface TadHookProps {
    /** Texto del hook (pregunta o declaración sorprendente) — alias: headline */
    text?: string;
    headline?: string;
    /** Subtítulo / subline */
    subline?: string;
    /** Color de acento TAD */
    accentColor?: string;
    /** Color stack para gradientes */
    colorStack?: string[];
    /** Textura: 'neon' | 'particles' | 'minimal' */
    texture?: string;
    /** Profundidad visual */
    depth?: number;
    /** Contraste: 'high' | 'medium' | 'low' */
    contrast?: string;
    /** Easing de entrada */
    easingIn?: string;
    /** Easing de salida */
    easingOut?: string;
    /** Duración total del hook en frames */
    durationInFrames?: number;
}
declare const TadHook: React.FC<TadHookProps>;
export { TadHook };
export type { TadHookProps };
//# sourceMappingURL=TadHook.d.ts.map