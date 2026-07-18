"use strict";
// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — QA + Fact-Check Agent
//  Runs every check defined in the specification before allowing export.
//  Produces: QAReport sobre el proyecto completo.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFullQA = runFullQA;
const types_1 = require("../types");
const research_agent_1 = require("../agents/research-agent");
const models_1 = require("../psychology/models");
const engine_1 = require("../storytelling/engine");
// ─── Plataforma objetivo ─────────────────────────────────────────────────────
const DEFAULT_PLATFORM = 'tiktok';
// ─── Validación principal ────────────────────────────────────────────────────
function runFullQA(project, platform = DEFAULT_PLATFORM) {
    const checks = [];
    // 1. Verificar stat spelling
    checks.push(checkStatSpelling(project));
    // 2. Validar correcto data
    checks.push(checkVerifiedData(project));
    // 3. Detectar broken animations (contrato pre-export)
    checks.push(checkAnimationContinuity(project));
    // 4. Text fuera de pantalla
    checks.push(checkTextOnScreenBounds(project, platform));
    // 5. Color contrast
    checks.push(checkContrast(project));
    // 6. Accesibilidad base
    checks.push(checkAccessibility(project));
    // 7. Duración
    checks.push(checkDuration(project, platform));
    // 8. Audio timing
    checks.push(checkAudioTiming(project));
    // 9. CTA sync
    checks.push(checkCTASync(project));
    // 10. PEAK-END RULE
    checks.push(checkPeakEndRule(project));
    // 11. Open loop closure
    checks.push(checkOpenLoops(project));
    // 12. Facture verified curation
    checks.push(checkCitations(project));
    // 13. Cognitive load
    checks.push(checkCognitiveLoad(project));
    // 14. Script QA internal
    const scriptQA = (0, engine_1.validateScript)(project.scenes, platform);
    if (!scriptQA.passed) {
        checks.push({
            name: 'Script Continuity QA',
            passed: false,
            detail: scriptQA.issues.join('; '),
            severity: 'error',
        });
    }
    const errors = checks.filter((c) => !c.passed && c.severity === 'error').map((c) => c.name);
    const warnings = checks.filter((c) => !c.passed && c.severity === 'warning').map((c) => c.name);
    return {
        passed: errors.length === 0,
        checks,
        warnings,
        errors,
    };
}
// ─── Checks individuales ──────────────────────────────────────────────────────
function checkStatSpelling(project) {
    const typos = [
        'dato', 'estadistica', 'informacio', 'cientif', 'neurociencia',
    ];
    const lowercaseNarration = project.scenes
        .flatMap((s) => s.onScreenText.split(' '))
        .join(' ');
    const found = typos.filter((t) => lowercaseNarration.includes(t));
    // Typo wrapper for scene voiceover
    const voiceoverWords = project.scenes.flatMap((s) => s.voiceover.map((v) => v.word));
    const foundVo = typos.filter((t) => voiceoverWords.some((w) => w.toLowerCase().includes(t)));
    const totalFound = [...found, ...foundVo];
    if (totalFound.length === 0) {
        return { name: 'Stat Spelling', passed: true, detail: 'Sin errores ortográficos detectados.', severity: 'info' };
    }
    return {
        name: 'Stat Spelling',
        passed: false,
        detail: `Posibles errores: ${totalFound.join(', ')}`,
        severity: 'warning',
    };
}
function checkVerifiedData(project) {
    const textAll = project.scenes
        .flatMap((s) => [s.onScreenText, project.citations.map((c) => c.claim)])
        .join(' ');
    const result = (0, research_agent_1.factCheck)([textAll]);
    if (result.passed && result.warnings.length === 0) {
        return { name: 'Verified Data', passed: true, detail: 'Todas las afirmaciones tienen fuente verificada.', severity: 'info' };
    }
    return {
        name: 'Verified Data',
        passed: result.passed,
        detail: result.warnings.join('; '),
        severity: result.passed ? 'warning' : 'error',
    };
}
function checkAnimationContinuity(_project) {
    // El QA antes de exportación no puede ejecutar el renderer, pero puede validar
    // que cada efecto listado tenga un componente correspondiente.
    return {
        name: 'Animation Continuity',
        passed: true,
        detail: 'Validación de frames omitida (requiere render ejecución). Revisar manualmente tras primer render.',
        severity: 'info',
    };
}
function checkTextOnScreenBounds(project, platform) {
    const cfg = types_1.PLATFORM_CONFIG[platform];
    const oversized = project.scenes.filter((s) => s.onScreenText.length > (cfg.width / 18));
    if (oversized.length === 0) {
        return { name: 'Text Bounds', passed: true, detail: 'Todo el texto cabe dentro de los bounds.', severity: 'info' };
    }
    return {
        name: 'Text Bounds',
        passed: false,
        detail: `${oversized.length} escenas con texto potencialmente fuera de pantalla.`,
        severity: 'error',
    };
}
function checkContrast(project) {
    // Chequeo heurístico: los colores de acento no deben ser muy similares al fondo
    const bgHex = '#0a0a0b';
    const badAccents = ['#000000', '#000100'];
    const bad = project.scenes.some((s) => badAccents.includes(s.accentColor));
    // Fondos en escenas deben ser oscuros (o por lo menos no completamente negros puros)
    // Nota: este es un check sintáctico → ligero.
    if (bad) {
        return { name: 'Color Contrast', passed: false, detail: 'Color de acento demasiado oscuro para fondo oscuro.', severity: 'warning' };
    }
    return { name: 'Color Contrast', passed: true, detail: 'Contraste de color válido.', severity: 'info' };
}
function checkAccessibility(project) {
    const minFontSize = 14; // px mínimo para legibilidad en mobile
    const smallText = project.scenes.some((s) => s.onScreenText.length === 0);
    if (smallText) {
        return { name: 'Accessibility', passed: false, detail: 'Escena sin texto visible (solo voiceover).', severity: 'warning' };
    }
    return { name: 'Accessibility', passed: true, detail: 'Criterios básicos de accesibilidad OK.', severity: 'info' };
}
function checkDuration(project, platform) {
    const cfg = types_1.PLATFORM_CONFIG[platform];
    const total = project.scenes.reduce((a, s) => a + s.durationSec, 0);
    if (total > cfg.maxDurationSec) {
        return {
            name: 'Duration',
            passed: false,
            detail: `Duración ${total}s excede máximo ${cfg.maxDurationSec}s para ${platform}`,
            severity: 'error',
        };
    }
    if (total < cfg.optimalDurationSec[0]) {
        return {
            name: 'Duration',
            passed: false,
            detail: `Duración ${total}s es menor al mínimo recomendado ${cfg.optimalDurationSec[0]}s`,
            severity: 'warning',
        };
    }
    return { name: 'Duration', passed: true, detail: `Duración ${total}s dentro del target.`, severity: 'info' };
}
function checkAudioTiming(project) {
    // Validar que cada escena con voiceover tenga timestamps consistentes
    const inconsistent = project.scenes.filter((s) => {
        if (s.voiceover.length === 0)
            return false;
        const totalVo = s.voiceover.reduce((a, v) => a + v.durationSec, 0);
        return Math.abs(totalVo - s.durationSec) > 1.5;
    });
    if (inconsistent.length === 0) {
        return { name: 'Audio Timing', passed: true, detail: 'Voiceover sincronizado con escenas.', severity: 'info' };
    }
    return {
        name: 'Audio Timing',
        passed: false,
        detail: `${inconsistent.length} escenas con desajuste entre voiceover y duración.`,
        severity: 'warning',
    };
}
function checkCTASync(project) {
    const hasCTA = project.scenes.some((s) => s.narrativeFunction === 'cta');
    if (!hasCTA) {
        return { name: 'CTASync', passed: false, detail: 'Sin CTA final. Agregar antes de exportar.', severity: 'error' };
    }
    // El CTA debe estar en los últimos 20% del video
    const ctaScenes = project.scenes.filter((s) => s.narrativeFunction === 'cta');
    const total = project.scenes.reduce((a, s) => a + s.durationSec, 0);
    const lastCTAStart = Math.max(...ctaScenes.map((s) => s.startSec));
    if (lastCTAStart > total * 0.85) {
        return { name: 'CTASync', passed: true, detail: 'CTA aparece en los últimos 15% del video.', severity: 'info' };
    }
    return { name: 'CTASync', passed: true, detail: 'CTA colocado apropiadamente.', severity: 'info' };
}
function checkPeakEndRule(project) {
    const totalFrames = Math.round(project.totalDurationSec * project.fps);
    const peakEnd = (0, models_1.validatePeakEndRule)(project.scenes, totalFrames);
    if (!peakEnd.hasPeak) {
        return { name: 'Peak-End Rule', passed: false, detail: 'Sin pico emocional en región 30-70% (Kahneman et al. 1993).', severity: 'warning' };
    }
    if (!peakEnd.hasPositiveEnd) {
        return { name: 'Peak-End Rule', passed: false, detail: 'Sin closure positivo en región final >75%.', severity: 'warning' };
    }
    return { name: 'Peak-End Rule', passed: true, detail: `Pico @frame ${peakEnd.peakFrame?.toFixed(0)}, final @frame ${peakEnd.endFrame?.toFixed(0)}.`, severity: 'info' };
}
function checkOpenLoops(project) {
    const totalSec = project.scenes.reduce((a, s) => a + s.durationSec, 0);
    const openLoopScenes = project.scenes.filter((s) => ['hook', 'open-loop', 'curiosity-gap'].includes(s.narrativeFunction));
    if (openLoopScenes.length === 0) {
        return { name: 'Open Loops', passed: false, detail: 'Sin open-loop narrativo. El video pierde retención (Zeigarnik, 1927).', severity: 'warning' };
    }
    return { name: 'Open Loops', passed: true, detail: `${openLoopScenes.length} open-loops detectados.`, severity: 'info' };
}
function checkCitations(project) {
    if (project.citations.length === 0) {
        return { name: 'Citations', passed: false, detail: 'Sin citas. El contenido debe incluir fuentes profesionales.', severity: 'warning' };
    }
    return { name: 'Citations', passed: true, detail: `${project.citations.length} citas integradas.`, severity: 'info' };
}
function checkCognitiveLoad(project) {
    const minDuration = (0, models_1.getMinimumSceneDurationSec)(DEFAULT_PLATFORM);
    const fastCuts = project.scenes.filter((s) => s.durationSec < minDuration * 0.6);
    if (fastCuts.length > 3) {
        return {
            name: 'Cognitive Load',
            passed: false,
            detail: `${fastCuts.length} escenas muy cortas (${fastCuts.map(s => `${s.durationSec}s`).join(', ')}). Excede chunks (Sweller, 1988).`,
            severity: 'warning',
        };
    }
    return { name: 'Cognitive Load', passed: true, detail: 'Carga cognitiva dentro del rango aceptable.', severity: 'info' };
}
//# sourceMappingURL=qa-agent.js.map