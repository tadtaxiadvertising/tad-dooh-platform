"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlowCard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const GlowCard = ({ glowColor = '#e51636', blurPx = 32, padding = '32px', radius = 28, entranceFrames = 24, delayFrames = 0, float = true, children, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const local = Math.max(0, frame - delayFrames);
    const scale = (0, remotion_1.spring)({
        frame: local,
        fps,
        from: 0.92,
        to: 1,
        config: { damping: 14, mass: 0.7, stiffness: 120 },
    });
    const opacity = (0, remotion_1.interpolate)(local, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const shadowBlur = (0, remotion_1.interpolate)(local, [16, entranceFrames], [blurPx * 0.5, blurPx], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const floatY = float
        ? Math.sin((frame / fps) * 1.6) * 6
        : 0;
    const glowAlpha = (0, remotion_1.interpolate)(local % 60, [0, 30, 60], [0.15, 0.35, 0.15], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                position: 'relative',
                padding,
                borderRadius: radius,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${glowColor.slice(0, 7)}40`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: `0 0 ${shadowBlur}px ${glowColor}${Math.round(glowAlpha * 255).toString(16).padStart(2, '0')}`,
                transform: `scale(${scale}) translateY(${floatY}px)`,
                opacity,
                maxWidth: '90%',
            }, children: children }) }));
};
exports.GlowCard = GlowCard;
exports.GlowCard.displayName = 'GlowCard';
//# sourceMappingURL=AcidAndGlowCard.js.map