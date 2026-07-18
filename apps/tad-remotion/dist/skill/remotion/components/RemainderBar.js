"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemainderBar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const RemainderBar = ({ totalFrames = 2700, color = '#e51636', height = 3, endPulse = true, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const progress = Math.min(1, frame / totalFrames);
    const widthPct = progress * 100;
    // Durante los últimos 60 frames emitir un "pulse glow" tip Peak-End
    const endRegionStart = totalFrames - 90;
    const isEndRegion = frame >= endRegionStart;
    const endPulseIntensity = isEndRegion
        ? (0, remotion_1.interpolate)(frame, [endRegionStart, endRegionStart + 30], [0, 1], { extrapolateLeft: 'clamp' })
        : 0;
    const baseOpacity = (0, remotion_1.interpolate)(frame, [0, 20], [0, 0.7], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const pulseScale = endPulse && endPulseIntensity > 0
        ? 1 + Math.sin((frame / fps) * 6) * 0.5 * endPulseIntensity
        : 1;
    const barGlow = endPulse && endPulseIntensity > 0 ? 20 * endPulseIntensity : 12;
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 24,
            paddingLeft: 40,
            paddingRight: 40,
            pointerEvents: 'none',
            zIndex: 10,
        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                width: '100%',
                height,
                borderRadius: height,
                background: 'rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden',
            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${widthPct}%`,
                    borderRadius: height,
                    background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                    transform: `scaleX(${pulseScale})`,
                    transformOrigin: 'left center',
                    boxShadow: `0 0 ${barGlow}px ${color}80`,
                    opacity: baseOpacity + (endPulseIntensity * 0.3),
                    transition: 'transform 0.1s linear',
                } }) }) }));
};
exports.RemainderBar = RemainderBar;
RemainderBar.displayName = 'RemainderBar';
//# sourceMappingURL=RemainderBar.js.map