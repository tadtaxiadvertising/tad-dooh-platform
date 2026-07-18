"use strict";
// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Psychology Models
//  Modelos cognitivos aplicados a producción de video.
//  Cada función es pura: (input) → (output), sin side-effects.
//  Fundamentados en: Sweller (1988), Loewenstein (1994), Schultz (1997),
//  Cialdini (2001), Kahneman (1993), Zajonc (1968), Reber (2004).
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERSUASION_KNOWLEDGE = exports.MOTIVATION_KNOWLEDGE = exports.ATTENTION_KNOWLEDGE = void 0;
exports.getMinimumSceneDurationSec = getMinimumSceneDurationSec;
exports.shouldOpenLoop = shouldOpenLoop;
exports.validatePeakEndRule = validatePeakEndRule;
exports.getPrimingSequence = getPrimingSequence;
exports.checkCognitiveLoad = checkCognitiveLoad;
exports.computePacingScore = computePacingScore;
exports.computeEmotionalArc = computeEmotionalArc;
exports.getCialdiniPrinciples = getCialdiniPrinciples;
const knowledge_1 = require("../knowledge");
Object.defineProperty(exports, "ATTENTION_KNOWLEDGE", { enumerable: true, get: function () { return knowledge_1.ATTENTION_KNOWLEDGE; } });
Object.defineProperty(exports, "MOTIVATION_KNOWLEDGE", { enumerable: true, get: function () { return knowledge_1.MOTIVATION_KNOWLEDGE; } });
Object.defineProperty(exports, "PERSUASION_KNOWLEDGE", { enumerable: true, get: function () { return knowledge_1.PERSUASION_KNOWLEDGE; } });
// ─── Reglas de pacing por plataforma ─────────────────────────────────────────
/**
 * Determina el mínimo intervalo entre cambios visuales significativos
 * (scene transitions o cambios de composición) según la plataforma.
 * Basado en datos de engagement de cortos formato.
 */
function getMinimumSceneDurationSec(platform) {
    const config = {
        tiktok: 2.5,
        instagram: 3.0,
        facebook: 3.0,
        linkedin: 5.0,
        youtube: 3.0,
    };
    return config[platform] || 3.0;
}
// ─── Aplicación del Zeigarnik Effect ─────────────────────────────────────────
/**
 * Retorna si una escena debe abrir un loop narrativo (pregunta sin resolver)
 * basado en el Zeigarnik Effect: las interrupciones aumentan la retención
 * de esa información en memoria.
 * Zeigarnik (1927) + repl. Wegge (2006).
 *
 * Regla: toda escena en las primeras 2/3 del video debe dejar un loop abierto
 * si su narrativeFunction no es 'cta' ni 'takeaway'.
 */
function shouldOpenLoop(scene, projectTotalSec) {
    const OPEN_LOOP_FUNCTIONS = [
        'hook',
        'open-loop',
        'curiosity-gap',
        'revelation',
    ];
    const LAST_THIRD_START = (projectTotalSec * 2) / 3;
    if (scene.startSec + scene.durationSec > LAST_THIRD_START)
        return false;
    return OPEN_LOOP_FUNCTIONS.includes(scene.narrativeFunction);
}
function validatePeakEndRule(scenes, totalFrames) {
    const HIGH_TRIGGERS = ['curiosity', 'surprise', 'aha-moment'];
    const POSITIVE_END_TRIGGERS = [
        'empowerment',
        'reciprocity',
        'social-proof',
        'authority',
    ];
    let hasPeak = false;
    let peakFrame = 0;
    let hasPositiveEnd = false;
    let endFrame = 0;
    const PEAK_REGION = [totalFrames * 0.3, totalFrames * 0.7];
    const END_REGION_START = totalFrames * 0.75;
    for (const scene of scenes) {
        const sceneMidFrame = (scene.startSec + scene.durationSec / 2) * 30;
        const sceneEndFrame = scene.startSec * 30 + scene.durationSec * 30;
        // ¿Está en región pico?
        if (sceneMidFrame >= PEAK_REGION[0] &&
            sceneMidFrame <= PEAK_REGION[1] &&
            scene.emotionTriggers.some((t) => HIGH_TRIGGERS.includes(t))) {
            hasPeak = true;
            peakFrame = sceneMidFrame;
        }
        // ¿Está en región final?
        if (sceneEndFrame >= END_REGION_START) {
            if (scene.emotionTriggers.some((t) => POSITIVE_END_TRIGGERS.includes(t))) {
                hasPositiveEnd = true;
                endFrame = sceneEndFrame;
            }
        }
    }
    return { hasPeak, hasPositiveEnd, peakFrame, endFrame };
}
// ─── Aplicación de Priming Effect ────────────────────────────────────────────
/**
 * Bargh et al. (1996): exponer a una persona a un estímulo previo activa
 * asociaciones en su memoria ANTES del estímulo objetivo.
 *
 * Esta función retorna un orden sugerido de scenes que maximiza el priming:
 * 1. Estímulo previo (palabra/imagen clave) a los pocos segundos del inicio
 * 2. Contexto psicológico (Why this matters)
 * 3. Estímulo objetivo (la revelación principal)
 */
function getPrimingSequence(scenes) {
    // Orden preferido para memoria a largo plazo
    const PREFERENCE_ORDER = {
        hook: 1,
        'open-loop': 2,
        'curiosity-gap': 3,
        calibration: 4,
        revelation: 5,
        'micro-reward': 6,
        proof: 7,
        'emotion-build': 8,
        cliffhanger: 9,
        takeaway: 10,
        cta: 11,
    };
    return [...scenes].sort((a, b) => {
        const rankA = PREFERENCE_ORDER[a.narrativeFunction] ?? 5;
        const rankB = PREFERENCE_ORDER[b.narrativeFunction] ?? 5;
        return rankA - rankB;
    });
}
function checkCognitiveLoad(scenes) {
    const warnings = [];
    const MAX_CHUNKS = 4;
    for (const scene of scenes) {
        const startFrame = scene.startSec * 30;
        const endFrame = startFrame + scene.durationSec * 30;
        // Heurística: cada texto en pantalla = 1 chunk, cada motion effect = +0.5
        const textChunks = scene.onScreenText ? 1 : 0;
        const motionChunks = scene.motionEffects.length * 0.5;
        const totalChunks = textChunks + motionChunks + 1; // +1 = base visual
        for (let f = startFrame; f <= endFrame; f += 15) {
            // Sample every 0.5 seconds
            if (totalChunks > MAX_CHUNKS + 1) {
                warnings.push({
                    frame: f,
                    chunkCount: Math.ceil(totalChunks),
                    severity: totalChunks > MAX_CHUNKS + 2 ? 'critical' : 'warning',
                });
            }
        }
    }
    return warnings;
}
// ─── Calidad de pacing: ideal cuts index ─────────────────────────────────────
/**
 * Retorna un índice de calidad del pacing del video:
 * 1.0 = ideal, 0 = pacing pésimo.
 *
 * Criterios:
 * - Cambios cada 1.5-4s (plataformas verticales)
 * - Cambios cada 3-6s (plataformas horizontales)
 * - No más de 3 segundos sin cambio visual o textual
 */
function computePacingScore(scenes, platform) {
    const MIN_INTERVAL = getMinimumSceneDurationSec(platform);
    const MAX_INTERVAL = MIN_INTERVAL * 2.5;
    const GAPS = [];
    for (let i = 1; i < scenes.length; i++) {
        const prevEnd = scenes[i - 1].startSec + scenes[i - 1].durationSec;
        const currStart = scenes[i].startSec;
        GAPS.push(currStart - prevEnd);
    }
    if (GAPS.length === 0)
        return 1.0;
    let score = 1.0;
    for (const gap of GAPS) {
        if (gap < MIN_INTERVAL * 0.5) {
            score -= 0.2; // demasiado rápido
        }
        else if (gap > MAX_INTERVAL) {
            score -= 0.15; // demasiado lento
        }
        else {
            score += 0.02;
        }
    }
    return Math.max(0, Math.min(1, score));
}
// ─── Emotional Arc: ea-index ─────────────────────────────────────────────────
/**
 * Calcula la intensidad emocional a lo largo del video basado en triggers
 * de Cialdini (2001) + Regla del Peak-End.
 * Retorna un array de intensidades por segundo.
 */
function computeEmotionalArc(scenes, totalSec) {
    const arc = [];
    // Trigger base: curiosidad = 0.6, sorpresa = 0.8, aha = 0.9, empowerment = 0.7
    const TRIGGER_WEIGHT = {
        curiosity: 0.6,
        surprise: 0.85,
        'aha-moment': 0.9,
        'social-proof': 0.65,
        authority: 0.7,
        reciprocity: 0.6,
        scarcity: 0.75,
        fomo: 0.8,
        empowerment: 0.7,
        relief: 0.55,
    };
    for (let s = 0; s <= totalSec; s++) {
        const scene = scenes.find((sc) => s >= sc.startSec && s < sc.startSec + sc.durationSec);
        let maxIntensity = 0.3; // base
        let dominantTrigger = null;
        if (scene) {
            for (const trigger of scene.emotionTriggers) {
                const w = TRIGGER_WEIGHT[trigger] ?? 0.5;
                if (w > maxIntensity) {
                    maxIntensity = w;
                    dominantTrigger = trigger;
                }
            }
        }
        // Aplicar peak-end boost
        const peakStart = totalSec * 0.3;
        const peakEnd = totalSec * 0.7;
        const isPeakZone = s >= peakStart && s <= peakEnd;
        if (isPeakZone && maxIntensity > 0.5) {
            maxIntensity = Math.min(1, maxIntensity + 0.1);
        }
        arc.push({ second: s, intensity: maxIntensity, trigger: dominantTrigger });
    }
    return arc;
}
// ─── Cialdini Principle Router ───────────────────────────────────────────────
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
function getCialdiniPrinciples(tier = 'informative') {
    switch (tier) {
        case 'persuasive':
            return ['escases', 'prueba-social', 'urgencia'];
        case 'authority':
            return ['autoridad', 'prueba-social', 'compromiso'];
        default:
            return ['autoridad', 'reciprocidad', 'prueba-social'];
    }
}
//# sourceMappingURL=models.js.map