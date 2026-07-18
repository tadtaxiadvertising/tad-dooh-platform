import React from 'react';
export interface ParticleFieldProps {
    /** Color de las partículas */
    color?: string;
    /** Cantidad de partículas */
    count?: number;
    /** Tamaño máximo (px) */
    maxSize?: number;
    /** Si están encendidas por defecto */
    opacity?: number;
    /** Velocidad de drift */
    speed?: number;
}
declare const ParticleField: React.FC<ParticleFieldProps>;
export { ParticleField };
//# sourceMappingURL=ParticleField.d.ts.map