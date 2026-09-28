/**
 * TAD DOOH — Fuentes oficiales y benchmarks auditables
 *
 * Cada constante del cálculo de impacto DEBE tener una entrada aquí.
 * Una cifra sin fuente es una opinión. Una cifra con fuente es un activo negociable.
 *
 * REGLA: `sourceTier` define qué tan defendible es una cifra:
 *   - 'A' = Estudio auditado / autoridad regulatoria (Nielsen IBOPE, Geopath, OAAA, MOVE, ONE, DIGESETT)
 *   - 'B' = Estudio publicado en revista peer-reviewed o industry report reconocido (WARC, eMarketer, IAB)
 *   - 'C' = Dato interno calibrado o benchmark internacional ajustado por analogía
 *   - 'D' = Supuesto operativo documentado sin fuente externa (ej. rotación 30s)
 *
 * REGLA: `appliedConfidence` indica cómo se traduce al output final:
 *   - 'point' = único valor (cuando la fuente es fuerte)
 *   - 'range' = se reporta min/expected/max (cuando la incertidumbre es > ±20%)
 *   - 'monteCarlo' = se muestrea en cálculo probabilístico
 *
 * REGLA: Cada fuente tiene `acquiredAt` y `expiresAt`. Una fuente vencida DEBE
 * marcar `stale: true` y los cálculos que la usen DEBEN mostrar warning al usuario.
 */
export type SourceTier = 'A' | 'B' | 'C' | 'D';
export type Confidence = 'point' | 'range' | 'monteCarlo';
export interface ImpactSource {
    id: string;
    variable: string;
    tier: SourceTier;
    confidence: Confidence;
    /** Nombre humano del estudio o dataset */
    studyName: string;
    /** Organización que publica o realiza */
    publisher: string;
    /** URL pública cuando esté disponible */
    url?: string;
    /** Fecha en que TAD adquirió / accedió a la fuente */
    acquiredAt: string;
    /** Fecha a partir de la cual la fuente se considera obsoleta */
    expiresAt: string;
    /** Valor(es) que aplica — point o [min, expected, max] si range */
    value: number | [number, number, number];
    unit: string;
    /** Margen de error declarado por la fuente (±%) */
    marginOfError?: number;
    /** Muestra o cohorte cuando aplique */
    sample?: string;
    /** Cómo se tradujo la fuente al valor aplicado (proxies, ajustes, normalización) */
    methodology?: string;
    /** True si la fuente venció y debe alertarse al usuario */
    stale?: boolean;
    /** Clave de metadato para ingesta de datos RD (ONE/DIGESETT/Telemetría propia) */
    rdDataKey?: string;
    /** Si esta fuente tiene datos RD propios ingestados */
    hasOwnData?: boolean;
}
export declare const SOURCES: ImpactSource[];
/** Devuelve la fuente por id */
export declare function getSource(id: string): ImpactSource | undefined;
/** Devuelve la fuente ACTIVA por variable (prefiere tier A con hasOwnData=true) */
export declare function getActiveSource(variable: string): ImpactSource | undefined;
/** Devuelve todas las fuentes ACTIVAS usadas en un cálculo (audit trail) */
export declare function sourcesUsedIn(formulaKey: keyof typeof FORMULAS_USED): ImpactSource[];
/** Mapa fórmula → fuentes usadas, para audit trail en cada cálculo */
export declare const FORMULAS_USED: {
    readonly grossImpressionsPerScreenPerMonth: readonly ["rotation-seconds", "daily-active-hours", "attention-rate"];
    readonly uniqueReachPerScreenPerMonth: readonly ["grossImpressionsPerScreenPerMonth", "taxi-occupancy-rate", "passengers-per-trip", "taxi-use-frequency-monthly"];
    readonly campaignEstimate: readonly ["screen-monthly-rate-rd", "creative-production-fee"];
};
/**
 * Determina si la calculadora está en modo "asumido" (sin datos RD propios)
 * o "calibrado" (con datos DIGESETT/ONE/eye-tracking ingestados).
 */
export declare function isCalibrationStatus(): {
    hasOwnData: boolean;
    dataSourcesIngested: string[];
    staleSourcesCount: number;
    tierDistribution: Record<SourceTier, number>;
    activeSourcesCount: number;
};
/**
 * Simula la ingesta de datos RD (para testing / migración futura).
 * En producción: webhook desde ONE/DIGESETT o job ETL Supabase.
 */
export declare function ingestRDData(sourceId: string, value: number | [number, number, number], metadata?: {
    acquiredAt?: string;
    expiresAt?: string;
    marginOfError?: number;
    sample?: string;
}): boolean;
//# sourceMappingURL=sources.d.ts.map