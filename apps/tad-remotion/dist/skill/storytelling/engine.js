"use strict";
// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Storytelling Engine
//  Transforma un tema en una narrativa de 7 beats comprimida a 15-45 segundos.
//
//  Estructuras utilizadas:
//   • Pixar Story Spine (Coats / 2010) — 6 beats básicos
//   • Mini 7-Beat Hero Journey (Campbell 1949 comprimido) — 5 beats
//   • Pre-Master + Call-Back pattern (para multiplatform)
//
//  Cuando el video es >30s, se aplica el Hero Journey completo;
//  cuando <=30s, el Pixar Spine comprimido a 5 beats.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStory = buildStory;
exports.beatsToSceneSpecs = beatsToSceneSpecs;
exports.validateScript = validateScript;
// ─── Config de pacing del story ───────────────────────────────────────────────
const PIXAR_SPINE_BEATS = [
    {
        beatId: 1,
        label: 'THE WORLD AS IT IS',
        narrativeFunction: 'hook',
        cognitiveGoal: 'capture-attention',
        voiceover: '', // llenado por el tema
        onScreenText: '', // llenado por el tema
        emotionTriggers: ['curiosity', 'surprise'],
        visualDescription: '',
        motionEffects: ['spring-enter', 'glow-pulse'],
        remotionTechnique: 'AbsoluteFill',
    },
    {
        beatId: 2,
        label: 'THE QUESTION EVERYONE IGNORES',
        narrativeFunction: 'open-loop',
        cognitiveGoal: 'open-loop',
        voiceover: '',
        onScreenText: '',
        emotionTriggers: ['curiosity', 'surprise'],
        visualDescription: '',
        motionEffects: ['slide-in-right', 'kinetic-text'],
        remotionTechnique: 'Sequence',
    },
    {
        beatId: 3,
        label: 'THE REVELATION',
        narrativeFunction: 'revelation',
        cognitiveGoal: 'reward-prediction',
        voiceover: '',
        onScreenText: '',
        emotionTriggers: ['aha-moment', 'surprise'],
        visualDescription: '',
        motionEffects: ['spring-enter', 'blur-reveal'],
        remotionTechnique: 'interpolate',
    },
    {
        beatId: 4,
        label: 'WHY IT MATTERS (proof)',
        narrativeFunction: 'proof',
        cognitiveGoal: 'social-proof',
        voiceover: '',
        onScreenText: '',
        emotionTriggers: ['authority', 'social-proof'],
        visualDescription: '',
        motionEffects: ['counter-anim', 'fade-in'],
        remotionTechnique: 'AnimatedSVG',
    },
    {
        beatId: 5,
        label: 'IMAGINE IF…',
        narrativeFunction: 'calibration',
        cognitiveGoal: 'processing-fluency',
        voiceover: '',
        onScreenText: '',
        emotionTriggers: ['empowerment'],
        visualDescription: '',
        motionEffects: ['parallax-y', 'scale-pulse'],
        remotionTechnique: 'AbsoluteFill',
    },
    {
        beatId: 6,
        label: 'SO WHAT NOW?',
        narrativeFunction: 'takeaway',
        cognitiveGoal: 'peak-end',
        voiceover: '',
        onScreenText: '',
        emotionTriggers: ['empowerment', 'curiosity'],
        visualDescription: '',
        motionEffects: ['mask-reveal', 'fade-in'],
        remotionTechnique: 'Sequence',
    },
    {
        beatId: 7,
        label: 'CTA',
        narrativeFunction: 'cta',
        cognitiveGoal: 'open-loop',
        voiceover: '',
        onScreenText: '',
        emotionTriggers: ['empowerment', 'authority'],
        visualDescription: '',
        motionEffects: ['glow-pulse', 'spring-enter'],
        remotionTechnique: 'AbsoluteFill',
    },
];
// ─── Voiceover templates por tipo de contenido ────────────────────────────────
const VOICEOVER_TEMPLATES = {
    'why-diesel': `Seguro has visto un taxi con pantalla y no le prestaste atención.
Y sin embargo… semanas después no puedes sacar esa marca de tu cabeza.
No es magia. Es neurociencia aplicada.
Tu cerebro retiene 3 veces más información en movimiento que en una pantalla fija.
Porque cuando te mueves… tu mente está más alerta. más receptiva.
No es publicidad. Es una experiencia que se instala sola.
TAD convierte cada trayecto en una conversación memorable.`,
    'attention-economy': `Vivimos en la economía de la atención.
Cada día ves más de 10,000 mensajes publicitarios.
Y tu cerebro aprende a ignorarlos todos.
Pero hay un lugar donde JAMAÁS ignoras lo que ves: adentro de un taxi.
Porque estás solo, sin distracciones, en un espacio íntimo.
En ese momento… tu atención no tiene precio.
TAD captura ese instante.`,
    'brain-ad': `¿Qué pasa en tu cerebro cuando miras una pantalla en movimiento?
Tu sistema de recompensa se activa. Liberas dopamina.
La corteza visual procesa imágenes en movimiento 60 veces mejor que texto.
Y almacenas la experiencia como vivencia… no como anuncio.
Eso se llama memoria episódica.
Y TAD la usa para que tu marca se recuerde… para siempre.`,
    'dead-time': `Los taxis en República Dominicana recorren millones de kilómetros al año.
En cada trayecto, el pasajero pasa entre 20 y 40 minutos en un espacio cerrado.
Sin radio. Sin celular. Sin nada. Solo atención pura.
Las marcas llaman a eso "tiempo muerto".
TAD lo llama "tu oportunidad dorada".
Porque cuando todo el mundo compite por 2 segundos de scroll… tú conviertes cada trayecto en una experiencia memorable.`,
    'impossible-to-ignore': `Hay 3 razones por las que una publicidad es imposible de ignorar:
Uno: sorpresa. No es lo que esperas ver.
Dos: novedad. Es información que tu cerebro no ha procesado antes.
Tres: emoción. Toca algo que te importa.
TAD combina las tres en un lugar donde el pasajero está expuesto sin defensa:
adentro de un taxi, en plena ciudad, en su mundo.
Sin escape. Sin scroll. Solo TAD y él.`,
    'myth-busting': `MITO: La publicidad en taxis es solo para grandes marcas.
REALIDAD: TAD hace que cualquier negocio pueda anunciarse en 1,500 taxis con campañas desde quinientos pesos.
MITO: No se puede medir el impacto.
REALIDAD: Tenemos métricas de cobertura, frecuencia y engagement por campaña.
MITO: Es publicidad intrusiva.
REALIDAD: El 78% de los pasajeros la considera entretenimiento útil, no publicidad tradicional.`,
    'explainer': `Publicidad DOOH es publicidad en pantallas digitales, fuera del hogar, en movimiento.
TAD instala pantallas en taxis. Cada taxi es un punto de contacto con la ciudad.
Las marcas compran espacios de 30 segundos en estas pantallas.
Los pasajeros ven contenido relevante SIN costo.
Las marcas llegan a millones de dominicanos en su vida cotidiana.
Es el medio más eficiente del 2024 para generar recordación.`,
};
// ─── On-screen text generado para cada tema ───────────────────────────────────
const ON_SCREEN_TEXT = {
    'why-diesel': 'Recordación 3x vs. redes',
    'attention-economy': 'Tu CEREBRO no puede ignorarlo',
    'brain-ad': 'Neurociencia a tu servicio',
    'dead-time': 'Tu oportunidad dorada',
    'impossible-to-ignore': '3 razones. 1 lugar.',
    'myth-busting': 'Lo que NADIE te dice sobre DOOH',
    'explainer': 'DOOH para dominicanos',
};
// ─── Factores de pacing por duración ─────────────────────────────────────────
const PIXAR_SPINE_TIMING = [
    0.10, // 1: THE WORLD AS IT IS (10%)
    0.18, // 2: THE QUESTION EVERYONE IGNORES (18%)
    0.30, // 3: THE REVELATION (30%)
    0.50, // 4: WHY IT MATTERS (50%)
    0.70, // 5: IMAGINE IF (70%)
    0.88, // 6: SO WHAT NOW? (88%)
    1.00, // 7: CTA (100%)
];
// ─── Construir guión completo desde un tema ───────────────────────────────────
function buildStory(theme, totalSec, platform, engagementTier = 'informative') {
    const resolvedTheme = Object.keys(VOICEOVER_TEMPLATES).includes(theme)
        ? theme
        : 'explainer';
    const baseBeats = [...PIXAR_SPINE_BEATS];
    const beats = [];
    let cumulativeStart = 0;
    for (let i = 0; i < baseBeats.length; i++) {
        const template = baseBeats[i];
        const startRatio = PIXAR_SPINE_TIMING[i];
        const nextStartRatio = PIXAR_SPINE_TIMING[i + 1] ?? 1.0;
        const beatDurationSec = i === baseBeats.length - 1
            ? Math.max(1, totalSec - cumulativeStart)
            : Math.round((nextStartRatio - startRatio) * totalSec);
        const accentColor = getAccentForBeat(i, resolvedTheme, platform);
        const beat = {
            ...template,
            startSec: cumulativeStart,
            durationSec: beatDurationSec,
            voiceover: template.beatId === 1
                ? VOICEOVER_TEMPLATES[resolvedTheme].split('\n').slice(0, 1).join(' ')
                : injectIntoVoiceover(VOICEOVER_TEMPLATES[resolvedTheme], template.beatId, beatDurationSec),
            onScreenText: template.beatId === 1
                ? 'Tu cerebro recuerda esto sin querer'
                : getOnScreenTextForBeat(template.beatId, resolvedTheme),
            visualDescription: getVisualDescriptionForBeat(template.beatId, resolvedTheme, platform),
            accentColor,
        };
        beats.push(beat);
        cumulativeStart += beatDurationSec;
    }
    return beats;
}
// ─── Convertir NarrativeBeat[] → SceneSpec[] (ready for pipeline) ─────────────
function beatsToSceneSpecs(beats, fps = 30) {
    return beats.map((beat, idx) => ({
        id: idx,
        startSec: beat.startSec,
        durationSec: beat.durationSec,
        narrativeFunction: beat.narrativeFunction,
        cognitiveGoal: beat.cognitiveGoal,
        voiceover: beat.voiceover
            .split(' ')
            .map((w, i) => ({
            word: w,
            durationSec: 0.35, // aproximado; el Voice Agent recalibra con TTS real
            startSec: beat.startSec + i * 0.35,
        })),
        subtitles: [], // se llenan en pipeline con subtítulos sincronizados
        onScreenText: beat.onScreenText,
        visualDescription: beat.visualDescription,
        assetsNeeded: inferAssetsFromBeat(beat),
        motionEffects: beat.motionEffects,
        accentColor: beat.accentColor,
        remotionTechnique: beat.remotionTechnique,
        emotionTriggers: beat.emotionTriggers,
    }));
}
// ─── Helpers privados ─────────────────────────────────────────────────────────
function getAccentForBeat(beatId, theme, platform) {
    // TAD brand: rojo + amarillo. Variantes según beat para mantener interés visual.
    const TAD_RED = '#e51636';
    const TAD_YELLOW = '#fad400';
    const DARK = '#0f172a';
    const accents = [TAD_RED, TAD_YELLOW, '#f97316', '#8b5cf6', '#06b6d4', TAD_RED];
    return accents[beatId % accents.length];
}
function injectIntoVoiceover(base, beatId, beatDurationSec) {
    // En un sistema completo, esto usaría el Copywriter Agent para refinar.
    // Por ahora: calcula palabras que caben en la duración (0.35s/palabra).
    const lines = base.split('\n').filter((l) => l.trim() !== '');
    const line = lines[Math.min(beatId - 1, lines.length - 1)];
    const maxWords = Math.round(beatDurationSec / 0.35);
    return line.split(' ').slice(0, maxWords).join(' ');
}
function getOnScreenTextForBeat(beatId, theme) {
    const map = {
        1: 'Tu cerebro recuerda esto sin querer', // hook con gancho visual fuerte
        2: '¿Por qué esta pantalla?', // open loop
        3: 'Ciencia, no magia', // revelation
        4: 'Datos reales', // proof
        5: 'Imagina el impacto', // calibration
        6: 'Conecta con tu audiencia', // takeaway
        7: 'Conecta tu marca HOY', // CTA
    };
    return map[beatId] || '';
}
function getVisualDescriptionForBeat(beatId, theme, platform) {
    const isVertical = platform === 'tiktok' || platform === 'instagram' || platform === 'facebook';
    switch (beatId) {
        case 1:
            return isVertical
                ? 'Cierre oscuro. Un punto de luz roja aparece en el centro. Se expande lentamente. Tipografía grande aparece con animación de entrada.'
                : 'Un taxi en silueta cruza la pantalla de izquierda a derecha con partículas doradas detrás. Título sobre fondo oscuro con glow.';
        case 2:
            return isVertical
                ? 'Texto grande en el centro con pregunta. Icono de ojo o pregunta animado a la izquierda. Fondo con profundidad (partículas).'
                : 'Splitscreen: izquierda cerebro con ícono de atención, derecha anuncio en taxi. Conexión con línea animada.';
        case 3:
            return isVertical
                ? 'Contador animado subiendo de 0 a 3x. Lupa sobre resultado. Elementos de "revelación" con animación Glow.'
                : 'Gráfico de barras comparativas: redes sociales vs. taxis. Animación de crecimiento.';
        case 4:
            return isVertical
                ? 'Badge "Estudio verificado" + 3 bullets animados uno a uno.'
                : 'Tarjetas glassmórficas con 3 estudios científicos citados iconográficamente.';
        case 5:
            return isVertical
                ? 'Animación de ciudad con taxi circulando. Dos caminos divergentes: uno genérico (ignorado), otro TAD (conectado).'
                : 'Mapa de RD con puntos de luz. Taxis en movimiento. Líneas de conexión entre branding.';
        case 6:
            return isVertical
                ? 'Pulso de onda desde el centro con logo TAD. "Conecta tu marca hoy" sutil. Call-back visual del beat 1.'
                : 'Logo TAD central con anillos de pulso. Lema: "Cada trayecto es una oportunidad."';
        default:
            return '';
    }
}
function inferAssetsFromBeat(beat) {
    const needs = [];
    if (beat.narrativeFunction === 'proof') {
        needs.push({ type: 'icon', description: 'icono científico/certificado', library: '@remotion/shapes' });
        needs.push({ type: 'svg', description: 'gráfico estadístico animado', library: '@remotion/skia' });
    }
    if (beat.motionEffects.includes('particle-drift')) {
        needs.push({ type: 'particle', description: 'partículas doradas', library: '@remotion/noise' });
    }
    return needs;
}
function validateScript(scenes, platform) {
    const issues = [];
    const warnings = [];
    const suggestions = [];
    const totalSec = scenes.reduce((acc, s) => acc + s.durationSec, 0);
    const platformCfg = require('../types').PLATFORM_CONFIG?.[platform] ??
        { optimalDurationSec: [15, 45], idealCutIntervalSec: [2, 4] };
    // 1. Duración total
    if (totalSec < platformCfg.optimalDurationSec[0]) {
        warnings.push(`Duración ${totalSec}s es menor al optimum mínimo ${platformCfg.optimalDurationSec[0]}s`);
    }
    if (totalSec > 60) {
        suggestions.push('Considerar split en dos videos para mantener retención >90%');
    }
    // 2. Sin loop abierto cerca del inicio
    const hasHook = scenes.some((s) => s.narrativeFunction === 'hook');
    if (!hasHook) {
        issues.push('El guión no tiene un beat "hook" explícito en los primeros 2s');
    }
    // 3. Distribución de funciones narrativas (debe haber variedad)
    const functions = scenes.map((s) => s.narrativeFunction);
    const hasVariety = new Set(functions).size >= 4;
    if (!hasVariety) {
        warnings.push('Poca variedad de funciones narrativas; riesgo de monotonía');
    }
    // 4. CTA detection
    const hasCta = scenes.some((s) => s.narrativeFunction === 'cta');
    if (!hasCta) {
        issues.push('El guión no tiene CTA (call to action) final');
    }
    // 5. Verbal queue check: toda escena con voiceover debe tener subtítulo
    const missingSubs = scenes.filter((s) => s.voiceover.length > 0 && s.subtitles.length === 0);
    if (missingSubs.length > 0) {
        warnings.push(`${missingSubs.length} escenas tienen voiceover sin subtítulos iniciales`);
    }
    // 6. Valley analysis: ¿hay más de X segundos sin evento emocional?
    const valleys = findValleys(scenes);
    if (valleys.length > 0) {
        warnings.push(`Valleys (sin evento emocional fuerte) en segundos: ${valleys.join(', ')}`);
    }
    return {
        passed: issues.length === 0,
        issues,
        warnings,
        suggestions,
    };
}
function findValleys(scenes) {
    const valleys = [];
    const LOW_TRIGGERS = [];
    const HIGH_INTENSITY = [
        ['curiosity'],
        ['surprise'],
        ['aha-moment'],
        ['fomo'],
    ];
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const isLow = scene.emotionTriggers.every((t) => LOW_TRIGGERS.includes(t));
        const isHigh = HIGH_INTENSITY.some((hs) => hs.every((h) => scene.emotionTriggers.includes(h)));
        if (isLow && !isHigh) {
            valleys.push({ startSec: scene.startSec, durationSec: scene.durationSec });
        }
    }
    return valleys;
}
//# sourceMappingURL=engine.js.map