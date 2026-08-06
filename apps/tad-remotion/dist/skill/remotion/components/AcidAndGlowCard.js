"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlowCard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const GlowCard = ({ glowColor, blurPx, blur, padding = '32px', radius, cornerRadius, entranceFrames = 24, delayFrames = 0, float = true, intensity = 0.8, glass = false, border = true, depth = 3, grain = false, chrome = false, innerStroke = false, innerStrokeColor, innerStrokeWidth = 1, skew = 0, tilt = 0, chromaShift = 0, noiseTexture, vignette = false, bloom = false, scanlines = false, chromatic = false, reflection = false, backgroundGradient, opacity = 1, scale: scaleProp, durationInFrames, urgency, accentColor, colorStack, children, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const local = Math.max(0, frame - delayFrames);
    // Resolve aliases
    const finalBlur = blurPx ?? blur ?? 32;
    const finalRadius = radius ?? cornerRadius ?? 28;
    const finalGlowColor = glowColor ?? accentColor ?? '#e51636';
    const finalPadding = typeof padding === 'number' ? `${padding}px` : padding;
    const entryScale = (0, remotion_1.spring)({
        frame: local,
        fps,
        from: 0.92,
        to: 1,
        config: { damping: 14, mass: 0.7, stiffness: 120 },
    });
    const entryOpacity = (0, remotion_1.interpolate)(local, [0, 16], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const shadowBlur = (0, remotion_1.interpolate)(local, [16, entranceFrames], [finalBlur * 0.5, finalBlur], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const floatY = float
        ? Math.sin((frame / fps) * 1.6) * (depth * 1.5)
        : 0;
    const glowAlpha = (0, remotion_1.interpolate)(local % 60, [0, 30, 60], [0.15, 0.35, 0.15], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    // Glass effect: backdrop blur
    const glassStyles = glass
        ? {
            backdropFilter: `blur(${finalBlur * 0.3}px)`,
            WebkitBackdropFilter: `blur(${finalBlur * 0.3}px)`,
            background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)`,
        }
        : { background: 'rgba(255,255,255,0.04)' };
    // Chrome effect: metallic sheen
    const chromeStyles = chrome
        ? {
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.04) 60%, transparent 100%)`,
        }
        : {};
    // Grain overlay
    const grainOverlay = grain ? ((0, jsx_runtime_1.jsx)("div", { style: {
            position: 'absolute',
            inset: 0,
            borderRadius: finalRadius,
            opacity: 0.15,
            mixBlendMode: 'overlay',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
            pointerEvents: 'none',
        } })) : null;
    // Bloom effect: extra glow layer
    const bloomOverlay = bloom ? ((0, jsx_runtime_1.jsx)("div", { style: {
            position: 'absolute',
            inset: -20,
            borderRadius: finalRadius + 20,
            background: `radial-gradient(circle at 50% 50%, ${finalGlowColor}40 0%, transparent 70%)`,
            filter: `blur(${finalBlur}px)`,
            opacity: 0.4 + (intensity * 0.3),
            pointerEvents: 'none',
        } })) : null;
    // Vignette
    const vignetteOverlay = vignette ? ((0, jsx_runtime_1.jsx)("div", { style: {
            position: 'absolute',
            inset: 0,
            borderRadius: finalRadius,
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
            pointerEvents: 'none',
        } })) : null;
    // Inner stroke
    const innerStrokeStyle = innerStroke
        ? {
            boxShadow: `inset 0 0 0 ${innerStrokeWidth}px ${innerStrokeColor || finalGlowColor}60`,
        }
        : {};
    // Skew transform
    const skewTransform = skew !== 0 || tilt !== 0
        ? `skew(${skew}deg) rotateX(${tilt}deg)`
        : 'none';
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
        }, children: [backgroundGradient ? ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: backgroundGradient,
                    opacity: 0.6,
                } })) : null, bloomOverlay, (0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'relative',
                    padding: finalPadding,
                    borderRadius: finalRadius,
                    ...glassStyles,
                    ...chromeStyles,
                    border: border ? `1px solid ${finalGlowColor}40` : 'none',
                    ...innerStrokeStyle,
                    boxShadow: `0 0 ${shadowBlur}px ${finalGlowColor}${Math.round(glowAlpha * 255).toString(16).padStart(2, '0')}${innerStroke ? ', ' + innerStrokeStyle.boxShadow : ''}`,
                    transform: `scale(${scaleProp ?? entryScale}) translateY(${floatY}px) ${skewTransform}`,
                    opacity: entryOpacity * opacity,
                    maxWidth: '90%',
                    overflow: 'hidden',
                    transition: 'none',
                }, children: [grainOverlay, vignetteOverlay, children] })] }));
};
exports.GlowCard = GlowCard;
exports.GlowCard.displayName = 'GlowCard';
//# sourceMappingURL=AcidAndGlowCard.js.map