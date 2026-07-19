"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const tad_canonical_1 = require("../skill/remotion/compositions/tad-canonical");
// Default project — type assertion porque los campos reales se inyectan vía pipeline
const DEFAULT_PROJECT = {
    projectId: 'tad-default',
    theme: 'promo',
    platform: 'tiktok',
    title: 'TAD Video',
    totalDurationSec: 30,
    fps: 30,
    actualFps: 30,
    headline: 'Tu mensaje aquí',
    narrativeSummary: '',
    scenes: [],
    citations: [],
    metadata: {},
    assetManifest: {},
    remotionCode: '',
    qaReport: {},
    generatedAt: new Date().toISOString(),
};
const WrappedComposition = ({ project }) => ((0, jsx_runtime_1.jsx)(tad_canonical_1.TADCanonicalComposition, { project: project ?? DEFAULT_PROJECT }));
// ── Remotion entry root ─────────────────────────────────────────────────────
const RemotionRoot = () => ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(remotion_1.Composition, { id: "DynamicAd", component: WrappedComposition, durationInFrames: 900, fps: 30, width: 1080, height: 1920 }) }));
(0, remotion_1.registerRoot)(RemotionRoot);
exports.default = RemotionRoot;
//# sourceMappingURL=index.js.map