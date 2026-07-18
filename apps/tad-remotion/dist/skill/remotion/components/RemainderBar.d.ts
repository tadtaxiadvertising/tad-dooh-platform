import React from 'react';
export interface RemainderBarProps {
    /** Duración total en frames */
    totalFrames?: number;
    /** Color de la barra */
    color?: string;
    /** Altura en px */
    height?: number;
    /** Si pulsa al 100% */
    endPulse?: boolean;
}
declare const RemainderBar: React.FC<RemainderBarProps>;
export { RemainderBar };
//# sourceMappingURL=RemainderBar.d.ts.map