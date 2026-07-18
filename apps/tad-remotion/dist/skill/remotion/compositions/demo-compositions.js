"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotionRoot = exports.TADCompositionWrapper = exports.TADGenericComposition = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const TadHook_1 = require("../components/TadHook");
const KineticText_1 = require("../components/KineticText");
const CounterAnim_1 = require("../components/CounterAnim");
const AcidAndGlowCard_1 = require("../components/AcidAndGlowCard");
const ParticleField_1 = require("../components/ParticleField");
const RemainderBar_1 = require("../components/RemainderBar");
const types_1 = require("../../types");
// ─── TADGenericComposition ─────────────────────────────────────────────────
const TADGenericComposition = ({ theme = 'explainer', }) => {
    const { durationInFrames } = (0, remotion_1.useVideoConfig)();
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { background: '#050505' }, children: [(0, jsx_runtime_1.jsx)(ParticleField_1.ParticleField, { color: "#fad400", count: 30, speed: 0.3 }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, durationInFrames: Math.floor(durationInFrames * 0.2), children: (0, jsx_runtime_1.jsx)(TadHook_1.TadHook, { text: "\u00BFAlguna vez te preguntaste por qu\u00E9?", accentColor: "#e51636", durationInFrames: Math.floor(durationInFrames * 0.2) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: Math.floor(durationInFrames * 0.2), durationInFrames: Math.floor(durationInFrames * 0.4), children: (0, jsx_runtime_1.jsx)(KineticText_1.KineticText, { text: "Tu cerebro recuerda 3 veces m\u00E1s la publicidad en movimiento", accentColor: "#fad400", fontSize: 52 }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: Math.floor(durationInFrames * 0.5), durationInFrames: Math.floor(durationInFrames * 0.3), children: (0, jsx_runtime_1.jsx)(CounterAnim_1.CounterAnim, { target: 3, suffix: "x", prefix: "", label: "m\u00E1s recordaci\u00F3n", color: "#fad400", fontSize: 90 }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: Math.floor(durationInFrames * 0.65), durationInFrames: Math.floor(durationInFrames * 0.25), children: (0, jsx_runtime_1.jsx)(AcidAndGlowCard_1.GlowCard, { glowColor: "#e51636", entranceFrames: 24, children: (0, jsx_runtime_1.jsx)("p", { style: {
                            color: '#94a3b8',
                            fontSize: 18,
                            textAlign: 'center',
                            maxWidth: 500,
                            lineHeight: 1.5,
                        }, children: "La publicidad DOOH en taxis convierte cada trayecto en una experiencia memorable. Cient\u00EDficamente demostrado." }) }) }), (0, jsx_runtime_1.jsx)(RemainderBar_1.RemainderBar, { totalFrames: durationInFrames, color: "#e51636", height: 3, endPulse: true })] }));
};
exports.TADGenericComposition = TADGenericComposition;
// ─── TADCompositionWrapper (wrapper que el pipeline puede consumir) ──────────
const TADCompositionWrapper = () => {
    const { width, height } = (0, remotion_1.useVideoConfig)();
    const isVertical = height > width;
    // En un sistema completo, aquí se aplicarían props resueltos por el pipeline:
    // platform, theme, brand, citations, etc.
    return (0, jsx_runtime_1.jsx)(exports.TADGenericComposition, { theme: "why-diesel" });
};
exports.TADCompositionWrapper = TADCompositionWrapper;
// ─── Root: registrar composiciones por plataforma ──────────────────────────
const RemotionRoot = () => {
    const fps = 30;
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: Object.entries(types_1.PLATFORM_CONFIG).map(([platformId, cfg]) => ((0, jsx_runtime_1.jsx)(remotion_1.Composition, { id: `TADDemo-${platformId}`, component: exports.TADGenericComposition, durationInFrames: Math.round(cfg.optimalDurationSec[1] * fps), fps: cfg.fps, width: cfg.width, height: cfg.height, defaultProps: { theme: 'why-diesel' } }, platformId))) }));
};
exports.RemotionRoot = RemotionRoot;
(0, remotion_1.registerRoot)(exports.RemotionRoot);
//# sourceMappingURL=demo-compositions.js.map