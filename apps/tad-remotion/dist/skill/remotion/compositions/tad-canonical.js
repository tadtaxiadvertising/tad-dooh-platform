"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositionRoot = exports.TADCanonicalComposition = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const remotion_1 = require("remotion");
const TADCanonicalCaptionedScene_1 = require("../components/TADCanonicalCaptionedScene");
const TadHook_1 = require("../components/TadHook");
const KineticText_1 = require("../components/KineticText");
const CounterAnim_1 = require("../components/CounterAnim");
const AcidAndGlowCard_1 = require("../components/AcidAndGlowCard");
const FONT_FAMILY = "'Inter', 'Outfit', 'Segoe UI', sans-serif";
const EASE_OUT = remotion_1.Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT = remotion_1.Easing.bezier(0.7, 0, 0.84, 0);
const FPS = 30;
const DEFAULT_PROJECT = {
    projectId: 'tad-default',
    theme: 'promo',
    platform: 'tiktok',
    title: 'TAD Video',
    totalDurationSec: 30,
    fps: FPS,
    actualFps: FPS,
    headline: 'Tu mensaje aquí',
    narrativeSummary: '',
    scenes: [],
    citations: [],
    metadata: {
        title: '',
        description: '',
        hashtags: [],
        postText: {
            instagram: '',
            tiktok: '',
            linkedin: '',
            facebook: '',
            youtube: '',
        },
        thumbnailPrompt: '',
    },
    assetManifest: {
        icons: [],
        gradients: [],
    },
    remotionCode: '',
    qaReport: {
        passed: true,
        checks: [],
        warnings: [],
        errors: [],
    },
    generatedAt: new Date().toISOString(),
    engagementTier: 'informative',
};
const CanonicalScene = ({ project, frame, fps }) => {
    const local = frame;
    const opacity = (0, remotion_1.interpolate)(local, [0, 20], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EASE_OUT,
    });
    const scale = (0, remotion_1.interpolate)(local, [0, 28], [0.96, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EASE_OUT,
    });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            backgroundColor: '#030303',
            opacity,
            scale,
        }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(229,22,54,0.08) 0%, transparent 60%)',
                } }), (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, rgba(3,3,3,0.55) 100%)',
                } }), (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '80px 80px',
                }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                        maxWidth: 1200, width: '100%', textAlign: 'center', fontFamily: FONT_FAMILY,
                    }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                                fontSize: 64, fontWeight: 700, color: '#fcfcfc', lineHeight: 1.1, margin: 0,
                                letterSpacing: '-1.5px', textWrap: 'balance',
                            }, children: project.headline }), project.narrativeSummary && ((0, jsx_runtime_1.jsx)("p", { style: {
                                marginTop: 32, fontSize: 28, fontWeight: 400, color: '#94a3b8', lineHeight: 1.4,
                                textWrap: 'pretty',
                            }, children: project.narrativeSummary })), project.metadata?.postText?.tiktok && ((0, jsx_runtime_1.jsx)("div", { style: {
                                marginTop: 64, display: 'inline-flex', alignItems: 'center', gap: 12,
                                padding: '14px 28px', borderRadius: 999,
                                background: 'linear-gradient(135deg, rgba(229,22,54,0.18) 0%, rgba(229,22,54,0.08) 100%)',
                                border: '1px solid rgba(229,22,54,0.35)',
                                color: '#e51636', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px',
                            }, children: project.metadata.title }))] }) })] }));
};
const SceneCard = ({ scene, index, frame, fps }) => {
    const startFrame = Math.round((scene.startSec ?? index * 5) * fps);
    const durationFrames = Math.max(Math.round((scene.durationSec ?? 4) * fps), Math.round(fps));
    const local = frame - startFrame;
    const clampedLocal = Math.max(0, Math.min(local, durationFrames));
    const opacity = (0, remotion_1.interpolate)(clampedLocal, [0, 12], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EASE_OUT,
    });
    const slideY = (0, remotion_1.interpolate)(clampedLocal, [0, 24], [24, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EASE_OUT,
    });
    const exitOpacity = (0, remotion_1.interpolate)(clampedLocal, [Math.max(durationFrames - 12, 0), durationFrames], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EASE_IN_OUT,
    });
    const combinedOpacity = Math.min(opacity, exitOpacity);
    const mp = scene.motionProfile;
    const Component = mp?.component;
    const compProps = mp?.props ?? {};
    // Renderizar componente Remotion segun motionProfile, o fallback texto
    const renderContent = () => {
        if (!Component) {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [scene.onScreenText && ((0, jsx_runtime_1.jsx)("h2", { style: {
                            fontSize: 56, fontWeight: 700, color: '#ffffff', lineHeight: 1.15, margin: 0,
                            letterSpacing: '-1px', textWrap: 'balance',
                        }, children: scene.onScreenText })), scene.visualDescription && ((0, jsx_runtime_1.jsx)("p", { style: {
                            marginTop: 28, fontSize: 24, fontWeight: 400, color: '#cbd5e1', lineHeight: 1.35,
                            textWrap: 'pretty',
                        }, children: scene.visualDescription }))] }));
        }
        switch (Component) {
            case 'TadHook':
                return (0, jsx_runtime_1.jsx)(TadHook_1.TadHook, { ...compProps });
            case 'KineticText':
                return (0, jsx_runtime_1.jsx)(KineticText_1.KineticText, { ...compProps });
            case 'CounterAnim':
                return (0, jsx_runtime_1.jsx)(CounterAnim_1.CounterAnim, { ...compProps });
            case 'GlowCard':
                return (0, jsx_runtime_1.jsx)(AcidAndGlowCard_1.GlowCard, { ...compProps });
            case 'AcidAndGlowCard':
                return (0, jsx_runtime_1.jsx)(AcidAndGlowCard_1.GlowCard, { ...compProps });
            default:
                return ((0, jsx_runtime_1.jsx)("h2", { style: {
                        fontSize: 52, fontWeight: 700, color: '#ffffff', lineHeight: 1.2, margin: 0,
                        letterSpacing: '-1px',
                    }, children: scene.onScreenText }));
        }
    };
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
            justifyContent: 'center', alignItems: 'center',
            padding: '80px 80px', opacity: combinedOpacity,
        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                maxWidth: 1200, width: '100%',
                transform: `translateY(${slideY}px)`,
                textAlign: 'center', fontFamily: FONT_FAMILY,
            }, children: renderContent() }) }));
};
const CaptionedSceneWrapper = ({ scene, frame, fps, showCaptions, }) => {
    const local = frame;
    const opacity = (0, remotion_1.interpolate)(local, [0, 10], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EASE_OUT,
    });
    const hasVoiceover = Array.isArray(scene.voiceover) && scene.voiceover.length > 0;
    if (!showCaptions || !hasVoiceover)
        return null;
    const words = scene.voiceover;
    const captions = words.map((w, i) => {
        const startMs = (w.startSec ?? scene.startSec + i * 0.38) * 1000;
        const durMs = (w.durationSec ?? 0.38) * 1000;
        return {
            text: w.word,
            startMs: Math.round(startMs),
            endMs: Math.round(startMs + durMs),
            confidence: 1,
            timestampMs: Math.round(startMs),
        };
    });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { opacity, pointerEvents: 'none' }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(229,22,54,0.06) 0%, transparent 60%)',
                } }), (0, jsx_runtime_1.jsx)(TADCanonicalCaptionedScene_1.TADCanonicalCaptionedScene, { captions: captions })] }));
};
const TADCanonicalComposition = ({ project, }) => {
    const scenes = project.scenes;
    const { fps } = (0, remotion_1.useVideoConfig)();
    const durationSec = project.totalDurationSec > 0
        ? project.totalDurationSec
        : Array.isArray(scenes) && scenes.length > 0
            ? scenes.reduce((acc, s) => acc + (s.durationSec ?? 4), 0)
            : 30;
    const totalFrames = Math.max(Math.ceil(durationSec * fps), fps);
    const frame = (0, remotion_1.useCurrentFrame)();
    return ((0, jsx_runtime_1.jsxs)(remotion_1.Sequence, { name: "TAD-Ad", from: 0, durationInFrames: totalFrames, children: [(0, jsx_runtime_1.jsx)(CanonicalScene, { project: project, frame: frame, fps: fps }), Array.isArray(scenes) && scenes.length > 0 ? (scenes.map((scene, index) => {
                const startSec = scene.startSec ?? index * 5;
                const startFrame = Math.round(startSec * fps);
                const sceneDurationFrames = Math.max(Math.round((scene.durationSec ?? 4) * fps), Math.round(fps));
                const hasVoiceover = Array.isArray(scene.voiceover) && scene.voiceover.length > 0;
                return ((0, jsx_runtime_1.jsxs)(react_1.default.Fragment, { children: [(0, jsx_runtime_1.jsx)(remotion_1.Sequence, { name: `scene-${index}`, from: startFrame, durationInFrames: sceneDurationFrames, children: (0, jsx_runtime_1.jsx)(SceneCard, { scene: scene, index: index, frame: frame, fps: fps }) }), hasVoiceover && ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { name: `scene-captions-${index}`, from: startFrame, durationInFrames: sceneDurationFrames, children: (0, jsx_runtime_1.jsx)(CaptionedSceneWrapper, { scene: scene, frame: frame, fps: fps, showCaptions: true }) }))] }, `scene-group-${index}`));
            })) : null] }));
};
exports.TADCanonicalComposition = TADCanonicalComposition;
const WrappedComposition = ({ project }) => ((0, jsx_runtime_1.jsx)(exports.TADCanonicalComposition, { project: project ?? DEFAULT_PROJECT }));
exports.CompositionRoot = WrappedComposition;
exports.default = WrappedComposition;
//# sourceMappingURL=tad-canonical.js.map