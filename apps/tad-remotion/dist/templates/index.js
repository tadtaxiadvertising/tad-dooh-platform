"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const tad_canonical_1 = require("../skill/remotion/compositions/tad-canonical");
const driver_recruit_1 = require("./driver-recruit");
const engine_1 = require("../skill/storytelling/engine");
// ── Seed scenes from the real storytelling pipeline ─────────────────────────
const FPS = 30;
const TOTAL_SEC = 30;
const seedBeats = (0, engine_1.buildStory)('why-diesel', TOTAL_SEC, 'tiktok', 'persuasive');
const seedScenes = (0, engine_1.beatsToSceneSpecs)(seedBeats, FPS);
const DEFAULT_PROJECT = {
    projectId: 'tad-default-seed',
    theme: 'why-diesel',
    platform: 'tiktok',
    title: 'TAD — Por qué tu cerebro recuerda esto sin querer',
    totalDurationSec: TOTAL_SEC,
    fps: FPS,
    actualFps: FPS,
    headline: 'Tu cerebro recuerda esto sin querer',
    narrativeSummary: 'Un anuncio en pantalla de taxi planta tu marca en memoria episódica — sin scrolls, sin skip, sin escape.',
    scenes: seedScenes,
    citations: [],
    metadata: {
        title: 'TAD · DOOH',
        description: 'Recordación 3x vs. redes sociales',
        hashtags: ['#DOOH', '#TAD', '#advertising'],
        postText: {
            instagram: 'TAD — el medio que tu cerebro no puede ignorar.',
            tiktok: '3x más recordación. Sin scroll. Sin skip. Solo TAD.',
            linkedin: 'TAD convierte tiempo muerto en recordación de marca.',
            facebook: 'TAD — cada trayecto es una oportunidad.',
            youtube: 'Tu cerebro recuerda esto sin querer.',
        },
        thumbnailPrompt: 'Pantalla de taxi con marca TAD y glow rojo',
    },
    assetManifest: { icons: [], gradients: [], customAssets: [] },
    remotionCode: '',
    qaReport: {
        passed: true,
        checks: [],
        warnings: [],
        errors: [],
    },
    generatedAt: new Date().toISOString(),
    engagementTier: 'persuasive',
};
const WrappedComposition = ({ project }) => ((0, jsx_runtime_1.jsx)(tad_canonical_1.TADCanonicalComposition, { project: project ?? DEFAULT_PROJECT }));
// ── Remotion entry root ─────────────────────────────────────────────────────
const RemotionRoot = () => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(remotion_1.Composition, { id: "DynamicAd", component: WrappedComposition, durationInFrames: 900, fps: FPS, width: 1080, height: 1920 }), (0, jsx_runtime_1.jsx)(remotion_1.Composition, { id: "DriverRecruit", component: driver_recruit_1.DriverRecruit, durationInFrames: 900, fps: FPS, width: 1080, height: 1920 })] }));
(0, remotion_1.registerRoot)(RemotionRoot);
exports.default = RemotionRoot;
//# sourceMappingURL=index.js.map