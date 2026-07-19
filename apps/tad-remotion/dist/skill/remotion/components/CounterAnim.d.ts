import React from 'react';
interface CounterAnimProps {
    /** Número final a mostrar */
    target?: number;
    /** Sufijo (ej: "x", "%", "RD$") */
    suffix?: string;
    /** Prefijo (ej: "5", "de") */
    prefix?: string;
    /** Frames que dura la animación del contador */
    durationFrames?: number;
    /** Color principal del número */
    color?: string;
    /** Tamaño en px del número */
    fontSize?: number;
    /** Label descriptivo debajo */
    label?: string;
    /** Dirección de entrada del slider */
    slideFrom?: 'left' | 'right' | 'bottom';
}
declare const CounterAnim: React.FC<CounterAnimProps>;
export { CounterAnim };
export type { CounterAnimProps };
//# sourceMappingURL=CounterAnim.d.ts.map