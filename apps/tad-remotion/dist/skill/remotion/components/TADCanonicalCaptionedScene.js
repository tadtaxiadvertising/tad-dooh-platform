"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TADCanonicalCaptionedScene = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// ─────────────────────────────────────────────────────────────────────────────
// TAD REMOTION SKILL — TikTok-style captioned scene alineado con @remotion/captions
// Sigue display-captions.md oficial: paginación, whitespace 'pre', highlight por palabra.
// ─────────────────────────────────────────────────────────────────────────────
const remotion_1 = require("remotion");
const captions_1 = require("@remotion/captions");
// ─── Ajustes visuales TAD (alineados a best practices Remotion) ──────────────
const FONT_FAMILY = "'Inter', 'Outfit', 'Segoe UI', sans-serif";
const HIGHLIGHT_COLOR = '#e51636'; // rojo TAD
const BASE_COLOR = '#ffffff';
const CAPTION_SWITCH_MS = 1100;
const CAPTIONS_BG = 'linear-gradient(180deg, rgba(3,3,3,0.25) 0%, rgba(3,3,3,0.60) 55%, rgba(3,3,3,0.92) 100%)';
// ─── Página de subtítulo ────────────────────────────────────────────────────
const CaptionPage = ({ page }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const currentTimeMs = (frame / fps) * 1000;
    const absoluteTimeMs = page.startMs + currentTimeMs;
    // Fade entrada palabra-activa con easing
    const wordHighlightOpacity = (0, remotion_1.interpolate)(absoluteTimeMs, [page.startMs, page.startMs + 80], [0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: remotion_1.Easing.bezier(0.16, 1, 0.3, 1) });
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '0 64px 96px',
            pointerEvents: 'none',
        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                fontSize: 46,
                fontWeight: 700,
                fontFamily: FONT_FAMILY,
                lineHeight: 1.25,
                textAlign: 'center',
                color: BASE_COLOR,
                whiteSpace: 'pre',
                maxWidth: 1140,
                width: '100%',
                padding: '18px 28px',
                borderRadius: 28,
                background: CAPTIONS_BG,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
            }, children: page.tokens.map((token) => {
                const isActive = token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;
                return ((0, jsx_runtime_1.jsx)("span", { style: {
                        color: isActive ? HIGHLIGHT_COLOR : BASE_COLOR,
                        opacity: isActive ? wordHighlightOpacity : 1,
                        transition: 'color 80ms linear',
                    }, children: token.text }, token.fromMs));
            }) }) }));
};
const TADCanonicalCaptionedScene = ({ captions, bgSrc, }) => {
    const { pages } = (0, captions_1.createTikTokStyleCaptions)({
        captions,
        combineTokensWithinMilliseconds: CAPTION_SWITCH_MS,
    });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { children: [bgSrc ? ((0, jsx_runtime_1.jsx)("video", { src: bgSrc, style: { width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }, muted: true, playsInline: true })) : ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(229,22,54,0.08) 0%, transparent 60%)',
                } })), pages.map((page, index) => {
                const nextPage = pages[index + 1] ?? null;
                const { fps } = (0, remotion_1.useVideoConfig)();
                const startFrame = (page.startMs / 1000) * fps;
                const endFrame = nextPage
                    ? (nextPage.startMs / 1000) * fps
                    : startFrame + (CAPTION_SWITCH_MS / 1000) * fps;
                const durationInFrames = endFrame - startFrame;
                if (durationInFrames <= 0)
                    return null;
                return ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: startFrame, durationInFrames: durationInFrames, children: (0, jsx_runtime_1.jsx)(CaptionPage, { page: page }) }, page.startMs));
            })] }));
};
exports.TADCanonicalCaptionedScene = TADCanonicalCaptionedScene;
exports.default = exports.TADCanonicalCaptionedScene;
//# sourceMappingURL=TADCanonicalCaptionedScene.js.map