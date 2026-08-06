import React from 'react';
interface CounterAnimProps {
    /** Número final a mostrar */
    target?: number;
    /** Sufijo (ej: "x", "%", "RD$") */
    suffix?: string;
    /** Prefijo (ej: "5", "de") */
    prefix?: string;
    /** Precisión decimal */
    precision?: number;
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
    /** Tensión del spring */
    tension?: number;
    /** Fricción del spring */
    friction?: number;
    /** Gap entre número y sufijo */
    suffixGap?: number;
    /** Easing como string */
    easing?: string;
    /** Glow trail al final */
    glowTrail?: boolean;
    /** Mostrar bar chart */
    barChart?: boolean;
    /** Datos del bar chart */
    barData?: Array<{
        label: string;
        value: number;
        color: string;
    }>;
    /** Label arriba de la barra */
    barLabelAbove?: boolean;
    /** Dirección de crecimiento de la barra */
    barGrowth?: 'from-bottom' | 'from-left';
    /** Radio de esquinas de la barra */
    barRadius?: number;
    /** Padding entre barras */
    barPadding?: number;
    /** Duración del crecimiento en frames */
    barGrowthDurationFrames?: number;
    /** Número de dígitos */
    digits?: number;
}
declare const CounterAnim: React.FC<CounterAnimProps>;
export { CounterAnim };
export type { CounterAnimProps };
//# sourceMappingURL=CounterAnim.d.ts.map