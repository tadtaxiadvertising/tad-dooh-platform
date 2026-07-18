import React from 'react';
export interface GlowCardProps {
    /** Color del glow */
    glowColor?: string;
    /** Intensidad del blur */
    blurPx?: number;
    /** Contenido hijos */
    children?: React.ReactNode;
    /** padding interno */
    padding?: string;
    /** border radius */
    radius?: number;
    /** Duración de entrada en frames */
    entranceFrames?: number;
    /** Delay de entrada en frames */
    delayFrames?: number;
    /** ¿La tarjeta flota suavemente? */
    float?: boolean;
}
export declare const GlowCard: React.FC<GlowCardProps>;
//# sourceMappingURL=AcidAndGlowCard.d.ts.map