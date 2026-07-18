import React from 'react';
interface CounterAnimProps {
    /** El número final a mostrar */
    target: number;
    /** Sufijo (ej: "x", "%", "RD$") */
    suffix?: string;
    /** Prefijo (ej: "5", "de") */
    prefix?: string;
    /** Duración de la animación en frames */
    durationFrames?: number;
    /** Color del número */
    color?: string;
    /** Tamaño en px del número */
    fontSize?: number;
    /** Label descriptivo debajo */
    label?: string;
    slideFrom?: 'left' | 'right' | 'bottom';
}
declare const CounterAnim: React.FC<CounterAnimProps>;
export { CounterAnim };
export type { CounterAnimProps };
//# sourceMappingURL=CounterAnim.d.ts.map