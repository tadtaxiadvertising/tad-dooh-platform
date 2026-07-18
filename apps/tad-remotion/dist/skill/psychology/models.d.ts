import { EmotionTrigger, Platform, SceneSpec, VideoProject } from '../types';
import { ATTENTION_KNOWLEDGE, MOTIVATION_KNOWLEDGE, PERSUASION_KNOWLEDGE } from '../knowledge';
/**
 * Determina el mínimo intervalo entre cambios visuales significativos
 * (scene transitions o cambios de composición) según la plataforma.
 * Basado en datos de engagement de cortos formato.
 */
export declare function getMinimumSceneDurationSec(platform: Platform): number;
/**
 * Retorna si una escena debe abrir un loop narrativo (pregunta sin resolver)
 * basado en el Zeigarnik Effect: las interrupciones aumentan la retención
 * de esa información en memoria.
 * Zeigarnik (1927) + repl. Wegge (2006).
 *
 * Regla: toda escena en las primeras 2/3 del video debe dejar un loop abierto
 * si su narrativeFunction no es 'cta' ni 'takeaway'.
 */
export declare function shouldOpenLoop(scene: SceneSpec, projectTotalSec: number): boolean;
/**
 * Verifica que el proyecto tenga al menos:
 * 1. Un "pico emocional" (peak) con triggers de curiosidad/sorpresa/aha-moment
 * 2. Un cierre positivo (end) con triggers de empowerment/reciprocity
 *
 * Kahneman et al. (1993): la experiencia se juzga por el pico y el final.
 */
export interface PeakEndValidation {
    hasPeak: boolean;
    hasPositiveEnd: boolean;
    peakFrame?: number;
    endFrame?: number;
}
export declare function validatePeakEndRule(scenes: SceneSpec[], totalFrames: number): PeakEndValidation;
/**
 * Bargh et al. (1996): exponer a una persona a un estímulo previo activa
 * asociaciones en su memoria ANTES del estímulo objetivo.
 *
 * Esta función retorna un orden sugerido de scenes que maximiza el priming:
 * 1. Estímulo previo (palabra/imagen clave) a los pocos segundos del inicio
 * 2. Contexto psicológico (Why this matters)
 * 3. Estímulo objetivo (la revelación principal)
 */
export declare function getPrimingSequence(scenes: SceneSpec[]): SceneSpec[];
/**
 * Sweller (1988): memoria de trabajo = 4 ± 1 chunks.
 *
 * Un "chunk" visual operativo en video = un texto en pantalla + un gráfico
 * o icono + un movimiento simultáneo.
 *
 * Si en cualquier segundo dado hay más de 4 chunks simultáneos: WARNING.
 */
export interface CognitiveLoadWarning {
    frame: number;
    chunkCount: number;
    severity: 'warning' | 'critical';
}
export declare function checkCognitiveLoad(scenes: SceneSpec[]): CognitiveLoadWarning[];
/**
 * Retorna un índice de calidad del pacing del video:
 * 1.0 = ideal, 0 = pacing pésimo.
 *
 * Criterios:
 * - Cambios cada 1.5-4s (plataformas verticales)
 * - Cambios cada 3-6s (plataformas horizontales)
 * - No más de 3 segundos sin cambio visual o textual
 */
export declare function computePacingScore(scenes: SceneSpec[], platform: Platform): number;
/**
 * Calcula la intensidad emocional a lo largo del video basado en triggers
 * de Cialdini (2001) + Regla del Peak-End.
 * Retorna un array de intensidades por segundo.
 */
export declare function computeEmotionalArc(scenes: SceneSpec[], totalSec: number): {
    second: number;
    intensity: number;
    trigger: EmotionTrigger | null;
}[];
/**
 * Retorna los 2-3 principios de Cialdini más relevantes para un tipo de
 * contenido DOOH. Justificación:
 *
 * - 'informative': Autoridad + Reciprocidad (damos conocimiento, generamos
 *   confianza; luego el espectador quiere corresponder).
 * - 'persuasive': Escasez + Prueba Social (capacidad limitada por taxi +
 *   "otras marcas ya lo hacen").
 * - 'authority': Autoridad + Prueba Social + Compromiso.
 */
export declare function getCialdiniPrinciples(tier?: VideoProject['engagementTier']): string[];
export { ATTENTION_KNOWLEDGE, MOTIVATION_KNOWLEDGE, PERSUASION_KNOWLEDGE };
//# sourceMappingURL=models.d.ts.map