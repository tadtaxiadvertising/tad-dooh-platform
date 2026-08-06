import React from 'react';
interface KineticTextProps {
    text?: string;
    accentColor?: string;
    fontSize?: number;
    fontWeight?: number;
    fontColor?: string;
    /** Revelar letra por letra (true) o fade completo (false) */
    revealCharByChar?: boolean;
    /** Frames de delay antes de comenzar el reveal */
    revealDelay?: number;
    /** Cursor trail effect */
    cursorTrail?: boolean;
    /** Blend mode */
    blend?: 'normal' | 'screen' | 'overlay';
    /** Espaciado entre letras */
    letterSpacing?: number;
    /** Alto de línea */
    lineHeight?: number;
    /** Ancho máximo */
    maxWidth?: number;
    /** Alineación */
    align?: 'center' | 'left' | 'right';
    /** Vignette detrás del texto */
    vignetteBehindText?: boolean;
    /** Glow detrás del texto */
    glowBehindText?: boolean;
    /** Color del glow (fallback accentColor) */
    glowColor?: string;
    /** Color stack */
    colorStack?: string[];
}
declare const KineticText: React.FC<KineticTextProps>;
export { KineticText };
export type { KineticTextProps };
//# sourceMappingURL=KineticText.d.ts.map