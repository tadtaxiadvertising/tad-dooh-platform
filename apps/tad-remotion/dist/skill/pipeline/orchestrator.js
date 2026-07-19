"use strict";
// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Master Pipeline
//  Orquesta todos los agentes especializados para producir un VideoProject
//  listo para publicar desde cualquier tema + plataforma elegida.
//
//  Flujo:
//   1. Storyteller Agent   → NarrativeBeat[]
//   2. Copywriter Agent    → headline + CTA
//   3. Script Writer Agent → SceneSpec[] computable + subtítulos base
//   4. Visual Director     → specs de composición y gradientes
//   5. Research Agent      → enriquece con citas verificadas
//   6. QA Agent            → QAReport
//  ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
exports.getPipelineSummary = getPipelineSummary;
const engine_1 = require("../storytelling/engine");
const engine_2 = require("../copywriting/engine");
const script_writer_1 = require("../agents/script-writer");
const research_agent_1 = require("../agents/research-agent");
const models_1 = require("../psychology/models");
const director_1 = require("../visual/director");
const export_agent_1 = require("../agents/export-agent");
const qa_agent_1 = require("../agents/qa-agent");
// ─── Ejecutar pipeline completo ────────────────────────────────────────────────
async function runPipeline(input) {
    // 1. Validar y resolver inputs
    const platform = input.platform ?? 'tiktok';
    const theme = resolveTheme(input.theme);
    const durationSec = input.durationSec ?? (platform === 'linkedin' ? 70 : 30);
    const fps = 30;
    const brandColor = input.brand?.colorPrimary ?? director_1.TAD_PALETTE.primary;
    // 2. Storyteller Agent — NarrativeBeat[]
    const beats = (0, engine_1.buildStory)(theme, durationSec, platform);
    // 3. Copywriter Agent — headline + CTA
    const { headline, cta } = (0, engine_2.writeFullScript)(beats.map((b) => ({
        ...b,
        onScreenText: b.onScreenText,
    })), theme, platform);
    // 4. Script Writer Agent — SceneSpec[] computable
    let scriptOutput = (0, script_writer_1.scriptWriterAgent)(beats, theme, platform, fps);
    // Aplicar brand color a todas las escenas
    const scenes = scriptOutput.scenes.map((scene, idx) => ({
        ...scene,
        accentColor: input.brand?.colorPrimary ?? (0, director_1.pickAccentColor)({ ...beats[idx], accentColor: '' }, idx),
        remotionTechnique: scene.remotionTechnique,
    }));
    // 5. Construit projecte base
    const projectId = `tad-video-${Date.now()}`;
    const totalFrames = Math.round(durationSec * fps);
    const narrativeOrientation = input.tone === 'provocative'
        ? 'INVASIÓN DE ATENCIÓN'
        : input.tone === 'educational'
            ? 'CONOCIMIENTO EN MOVIMIENTO'
            : 'EXPERIENCIA URBANA';
    const peakEndValidation = (0, models_1.validatePeakEndRule)(scenes, totalFrames);
    const pacingScore = (0, models_1.computePacingScore)(scenes, platform);
    const transcriptSummary = scriptOutput.narrativeSummary ||
        'Narrativa estructurada por TAD Remotion skill.';
    const project = {
        projectId,
        theme,
        platform,
        title: headline,
        totalDurationSec: durationSec,
        fps,
        actualFps: fps,
        headline,
        narrativeSummary: transcriptSummary,
        scenes,
        citations: [],
        metadata: {
            title: headline,
            description: `${headline} — publi TAD DOOH de ${durationSec}s sobre ${theme}.`,
            hashtags: ['DOOH', 'TAD', theme],
            postText: {
                instagram: '',
                tiktok: '',
                linkedin: '',
                facebook: '',
                youtube: '',
            },
            thumbnailPrompt: `Publicidad DOOH TAD para ${theme}: taxis en movimiento, tipografía brillante sobre fondo oscuro.`,
        },
        assetManifest: {
            icons: [],
            gradients: scenes.map((_, i) => (0, director_1.getBackgroundGradient)({ ...beats[i], accentColor: scenes[i]?.accentColor ?? director_1.TAD_PALETTE.primary }, platform)),
            customAssets: [],
        },
        remotionCode: '',
        qaReport: {
            passed: false,
            checks: [],
            warnings: [],
            errors: [],
        },
        generatedAt: new Date().toISOString(),
    };
    // 6. Research Agent — insertar citas verificadas
    const enriched = (0, research_agent_1.applyResearch)({ project, theme });
    const citations = (0, research_agent_1.buildCitations)(theme);
    enriched.citations = [...(enriched.citations ?? []), ...citations];
    const finalProject = enriched;
    // 7. Metadata — Export Agent
    const metadata = (0, export_agent_1.exportMetadata)(finalProject, platform);
    finalProject.metadata = metadata;
    finalProject.metadata.title = headline;
    finalProject.metadata.thumbnailPrompt = metadata.thumbnailPrompt;
    // 8. QA — QA Agent
    const qaReport = (0, qa_agent_1.runFullQA)(finalProject, platform);
    finalProject.qaReport = qaReport;
    // 9. Generar emotional arc para monitoring futuro
    finalProject.metadata = {
        ...finalProject.metadata,
    };
    // 10. Remotion code representation (placeholder — completado por Remotion Generator)
    finalProject.remotionCode = `// GENERADO POR PIPELINE. Completar con componentes Remotion.\n// Ver skill/remotion/compositions/`;
    return finalProject;
}
// ─── Resolver theme a ContentType válido ─────────────────────────────────────
function resolveTheme(raw) {
    const valid = [
        'why-diesel',
        'attention-economy',
        'brain-ad',
        'dead-time',
        'impossible-to-ignore',
        'myth-busting',
        'explainer',
    ];
    if (valid.includes(raw))
        return raw;
    // Buscar palabra clave más cercana (fuzzy simple)
    const keywords = {
        recordacion: 'why-diesel',
        atención: 'attention-economy',
        atencion: 'attention-economy',
        cerebro: 'brain-ad',
        tiempo_muerto: 'dead-time',
        'tiempo muerto': 'dead-time',
        'dead-time': 'dead-time',
        ignorar: 'impossible-to-ignore',
        mito: 'myth-busting',
        myth: 'myth-busting',
        qué: 'explainer',
        que: 'explainer',
        dooh: 'explainer',
    };
    const lower = raw.toLowerCase();
    for (const [k, v] of Object.entries(keywords)) {
        if (lower.includes(k))
            return v;
    }
    return 'explainer';
}
// ─── Helpers de reporte ──────────────────────────────────────────────────────
function getPipelineSummary(project) {
    const qa = project.qaReport;
    const totalScenes = project.scenes.length;
    const totalDuration = project.totalDurationSec;
    const avgSceneDuration = (totalScenes > 0 ? totalDuration / totalScenes : 0).toFixed(1);
    const citationsCount = project.citations.length;
    return [
        `TAD Remotion Pipeline — Reporte`,
        `─────────────────────────────────`,
        `Proyecto : ${project.projectId}`,
        `Tema     : ${project.theme}`,
        `Plataforma: ${project.platform}`,
        `Duración : ${totalDuration}s (${totalDuration > 0 ? ((totalDuration / 60) * 100).toFixed(0) : 0})% min`,
        `Escenas  : ${totalScenes}`,
        `AvgScene : ${avgSceneDuration}s`,
        `Citas    : ${citationsCount}`,
        `QA Pass  : ${qa.passed ? '✅ PASS' : '❌ FAIL'}`,
        ...(qa.errors.length > 0 ? [`Errores  : ${qa.errors.join(', ')}`] : []),
        ...(qa.warnings.length > 0 ? [`Warnings : ${qa.warnings.join(', ')}`] : []),
    ].join('\n');
}
//# sourceMappingURL=orchestrator.js.map