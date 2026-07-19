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
}
declare const KineticText: React.FC<KineticTextProps>;
export { KineticText };
export type { KineticTextProps };
//# sourceMappingURL=KineticText.d.ts.map