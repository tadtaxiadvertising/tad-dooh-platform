import React from 'react';
export interface GlowCardProps {
    /** Color del glow */
    glowColor?: string;
    /** Intensidad del blur (alias: blur) */
    blurPx?: number;
    blur?: number;
    /** Contenido hijos */
    children?: React.ReactNode;
    /** padding interno */
    padding?: string | number;
    /** border radius (alias: cornerRadius) */
    radius?: number;
    cornerRadius?: number;
    /** Duración de entrada en frames */
    entranceFrames?: number;
    /** Delay de entrada en frames */
    delayFrames?: number;
    /** ¿La tarjeta flota suavemente? */
    float?: boolean;
    /** Intensidad del glow (0-1) */
    intensity?: number;
    /** Efecto glass morphism */
    glass?: boolean;
    /** Borde visible */
    border?: boolean;
    /** Profundidad 3D */
    depth?: number;
    /** Textura granulada */
    grain?: boolean;
    /** Efecto chrome */
    chrome?: boolean;
    /** Inner stroke decorativo */
    innerStroke?: boolean;
    innerStrokeColor?: string;
    innerStrokeWidth?: number;
    /** Skew / tilt */
    skew?: number;
    tilt?: number;
    /** Chromatic shift */
    chromaShift?: number;
    noiseTexture?: string;
    vignette?: boolean;
    bloom?: boolean;
    scanlines?: boolean;
    chromatic?: boolean;
    reflection?: boolean;
    backgroundGradient?: string;
    opacity?: number;
    scale?: number;
    durationInFrames?: number;
    urgency?: string;
    /** Color de acento (fallback para glowColor) */
    accentColor?: string;
    /** Color stack para gradientes */
    colorStack?: string[];
}
export declare const GlowCard: React.FC<GlowCardProps>;
//# sourceMappingURL=AcidAndGlowCard.d.ts.map