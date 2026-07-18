"use strict";
// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Copywriting Engine
//  Aplica AIDA, PAS, 4P, BAB, Story Spine y Open-Loop headline writing
//  con Psychology validation embedded.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpenLoopHeadline = generateOpenLoopHeadline;
exports.rankHeadlines = rankHeadlines;
exports.buildHook = buildHook;
exports.generateCTA = generateCTA;
exports.writeFullScript = writeFullScript;
function generateOpenLoopHeadline(theme) {
    const templates = {
        'why-diesel': [
            {
                text: 'Tu cerebro recordó ESTO sin querer',
                openLoopScore: 0.9,
                curiosityGapStrength: 0.85,
                emotionalTrigger: 'curiosity',
            },
            {
                text: '3 veces más recordación que redes sociales',
                openLoopScore: 0.7,
                curiosityGapStrength: 0.6,
                emotionalTrigger: 'surprise',
            },
            {
                text: 'El anuncio que tu mente no puede borrar',
                openLoopScore: 0.85,
                curiosityGapStrength: 0.8,
                emotionalTrigger: 'curiosity',
            },
        ],
        'attention-economy': [
            {
                text: '10,000 mensajes al día. Tu cerebro ignora TODOS',
                openLoopScore: 0.85,
                curiosityGapStrength: 0.8,
                emotionalTrigger: 'surprise',
            },
            {
                text: 'El único lugar donde NO ignoras nada',
                openLoopScore: 0.9,
                curiosityGapStrength: 0.9,
                emotionalTrigger: 'curiosity',
            },
        ],
        'brain-ad': [
            {
                text: '¿Qué hace tu cerebro cuando ve una pantalla en movimiento?',
                openLoopScore: 0.95,
                curiosityGapStrength: 0.95,
                emotionalTrigger: 'curiosity',
            },
            {
                text: 'Tu memoria episódica guarda esto para siempre',
                openLoopScore: 0.8,
                curiosityGapStrength: 0.75,
                emotionalTrigger: 'surprise',
            },
        ],
        'dead-time': [
            {
                text: '20 minutos de silencio. Tu marca puede DEJAR HUELLA',
                openLoopScore: 0.85,
                curiosityGapStrength: 0.8,
                emotionalTrigger: 'empowerment',
            },
            {
                text: 'lo que las marcas llaman "tiempo muerto"',
                openLoopScore: 0.9,
                curiosityGapStrength: 0.9,
                emotionalTrigger: 'curiosity',
            },
        ],
        'impossible-to-ignore': [
            {
                text: 'Imposible ignorar. 3 razones. 1 lugar.',
                openLoopScore: 0.8,
                curiosityGapStrength: 0.7,
                emotionalTrigger: 'curiosity',
            },
            {
                text: 'Tu cerebro NO puede dejar de mirar esto',
                openLoopScore: 0.9,
                curiosityGapStrength: 0.85,
                emotionalTrigger: 'surprise',
            },
        ],
        'myth-busting': [
            {
                text: 'Lo que NADIE te dice sobre DOOH en RD',
                openLoopScore: 0.85,
                curiosityGapStrength: 0.8,
                emotionalTrigger: 'curiosity',
            },
            {
                text: 'Mito vs Realidad: publicidad en taxis',
                openLoopScore: 0.75,
                curiosityGapStrength: 0.65,
                emotionalTrigger: 'surprise',
            },
        ],
        'explainer': [
            {
                text: 'DOOH en 30 segundos (sin jerga)',
                openLoopScore: 0.7,
                curiosityGapStrength: 0.6,
                emotionalTrigger: 'curiosity',
            },
            {
                text: 'El medio que las marcas pasan por alto (y deberían NO)',
                openLoopScore: 0.9,
                curiosityGapStrength: 0.85,
                emotionalTrigger: 'curiosity',
            },
        ],
    };
    const defaults = [
        {
            text: '¿Por qué recuerdas esto semanas después?',
            wordCount: 6,
            openLoopScore: 0.95,
            curiosityGapStrength: 0.9,
            emotionalTrigger: 'curiosity',
        },
    ];
    const pool = templates[theme] ?? defaults;
    return pool.map((c, i) => ({
        text: c.text ?? '',
        wordCount: (c.text ?? '').split(' ').length,
        openLoopScore: c.openLoopScore ?? 0.5,
        curiosityGapStrength: c.curiosityGapStrength ?? 0.5,
        emotionalTrigger: c.emotionalTrigger ?? 'curiosity',
    }));
}
// ─── Elegir el mejor headline (ranking multi-criterio) ───────────────────────
function rankHeadlines(candidates) {
    return [...candidates].sort((a, b) => {
        const scA = a.openLoopScore * 0.4 + a.curiosityGapStrength * 0.35 + a.wordCount <= 8 ? 0.25 : 0;
        const scB = b.openLoopScore * 0.4 + b.curiosityGapStrength * 0.35 + b.wordCount <= 8 ? 0.25 : 0;
        return scB - scA;
    });
}
function buildHook(scene, theme) {
    const headlines = rankHeadlines(generateOpenLoopHeadline(theme));
    const bestHeadline = headlines[0]?.text ?? '¿Alguna vez te preguntaste por qué?';
    return {
        textOnScreen: bestHeadline.toUpperCase(),
        voiceoverFirstSentence: '', // El voiceover se genera pausa de 0.3s for dramatic effect
        visualCue: 'Luz que aparece, movimiento sutil de cámara, silencio de 0.3s',
        transition: 'fade in + slight zoom (anticipation principle)',
        cognitiveGoal: 'capture-attention',
    };
}
function generateCTA(theme, engagementTier) {
    const base = [
        {
            text: '¿Crees que esta estrategia funcionaría para tu negocio?',
            style: 'question',
            score: 0.95,
        },
        {
            text: '¿Lo habías pensado antes?',
            style: 'reflection',
            score: 0.9,
        },
        {
            text: '¿Qué otra industria podría aprovechar esto?',
            style: 'question',
            score: 0.85,
        },
        {
            text: 'El primer paso es verlo desde dentro.',
            style: 'invitation',
            score: 0.7,
        },
        {
            text: 'La pregunta no es SI, sino CUÁNDO.',
            style: 'provocation',
            score: 0.65,
        },
    ];
    // Filtrar por engagement tier
    if (engagementTier === 'authority' || engagementTier === 'informative') {
        return base.filter((c) => c.style !== 'provocation');
    }
    return base;
}
// ─── Escritura de guión completo para un set de escenas ──────────────────────
function writeFullScript(scenes, theme, platform) {
    const headlines = rankHeadlines(generateOpenLoopHeadline(theme));
    const headline = headlines[0]?.text ?? '¿Alguna vez te preguntaste por qué?';
    const ctaOptions = generateCTA(theme, 'informative');
    const cta = ctaOptions[0]?.text ?? '¿Lo habías pensado antes?';
    return { headline, cta };
}
//# sourceMappingURL=engine.js.map