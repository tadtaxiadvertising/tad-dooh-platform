"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TadHook = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const TadHook = ({ text = '¿Alguna vez te preguntaste por qué?', accentColor = '#e51636', durationInFrames = 75, // ~2.5s @ 30fps
 }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps, width, height } = (0, remotion_1.useVideoConfig)();
    const isVertical = height > width;
    // Easing: entrada rápida + pausa dramática de 0.3s, luego continue
    const fadeIn = (0, remotion_1.interpolate)(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const glowScale = (0, remotion_1.interpolate)(frame, [10, 30, 60], [0.6, 1.05, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const textY = (0, remotion_1.spring)({ frame: frame - 5, fps, from: 30, to: 0, config: { damping: 14, mass: 0.7 } });
    const dotPulse = (0, remotion_1.interpolate)(frame % 40, [0, 20, 40], [0.8, 1.3, 0.8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const bgGradient = isVertical
        ? `radial-gradient(circle at 50% 40%, ${accentColor}18 0%, transparent 60%), #050505`
        : `radial-gradient(ellipse 50% 50% at 50% 40%, ${accentColor}15 0%, transparent 70%), #050505`;
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            background: bgGradient,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: fadeIn,
            overflow: 'hidden',
        }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    top: isVertical ? '38%' : '45%',
                    left: '50%',
                    transform: `translate(-50%, -50%) scale(${dotPulse})`,
                    width: isVertical ? 40 : 60,
                    height: isVertical ? 40 : 60,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                    filter: `blur(${isVertical ? 4 : 6}px)`,
                    zIndex: 1,
                } }), (0, jsx_runtime_1.jsx)("div", { style: {
                    transform: `translateY(${textY}px)`,
                    textAlign: 'center',
                    padding: '0 60px',
                    zIndex: 2,
                }, children: (0, jsx_runtime_1.jsx)("h1", { style: {
                        fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
                        fontSize: isVertical ? 60 : 64,
                        fontWeight: 900,
                        color: '#ffffff',
                        lineHeight: 1.2,
                        letterSpacing: '-0.5px',
                        margin: 0,
                        textShadow: `0 0 40px ${accentColor}80`,
                    }, children: text.toUpperCase() }) })] }));
};
exports.TadHook = TadHook;
//# sourceMappingURL=TadHook.js.map