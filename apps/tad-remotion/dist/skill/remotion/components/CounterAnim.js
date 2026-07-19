"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterAnim = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";
// spring direccional: desde la dirección elegida hacia 0
const useSlideSpring = (frame, fps, slideFrom, distance) => {
    const config = { damping: 14, mass: 0.6, stiffness: 120 };
    const y = slideFrom === 'bottom'
        ? (0, remotion_1.spring)({ frame, fps, from: distance, to: 0, config })
        : 0;
    const x = slideFrom !== 'bottom'
        ? (0, remotion_1.spring)({ frame, fps, from: slideFrom === 'left' ? -distance : distance, to: 0, config })
        : 0;
    return { x, y };
};
const CounterAnim = ({ target = 100, suffix = '', prefix = '', durationFrames = 30, color = '#fad400', fontSize = 80, label, slideFrom = 'bottom', }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const local = Math.max(0, frame);
    // Progreso de 0→1 con cubic ease-out
    const progress = (0, remotion_1.interpolate)(local, [0, durationFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: remotion_1.Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    const currentValue = Math.round(progress * target);
    // Slider spring
    const { x: slideX, y: slideY } = useSlideSpring(local, fps, slideFrom, 60);
    // Glow entra después de que el número aparece
    const glowProgress = (0, remotion_1.interpolate)(local, [durationFrames, durationFrames + 15], [0.5, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: remotion_1.Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    const opacity = (0, remotion_1.interpolate)(local, [0, 15], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: remotion_1.Easing.bezier(0.16, 1, 0.3, 1),
    });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            justifyContent: 'center',
            alignItems: 'center',
            opacity,
            transform: `translate(${slideX}px, ${slideY}px)`,
            textAlign: 'center',
            gap: 12,
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'baseline', gap: 4 }, children: [prefix ? ((0, jsx_runtime_1.jsx)("span", { style: {
                            fontFamily: FONT_FAMILY,
                            fontSize: fontSize * 0.5,
                            fontWeight: 500,
                            color,
                            opacity: 0.7,
                        }, children: prefix })) : null, (0, jsx_runtime_1.jsx)("span", { style: {
                            fontFamily: FONT_FAMILY,
                            fontSize,
                            fontWeight: 900,
                            color,
                            lineHeight: 1,
                            letterSpacing: '-2px',
                            textShadow: `0 0 ${Math.round(30 * glowProgress)}px ${color}80`,
                        }, children: currentValue }), suffix ? ((0, jsx_runtime_1.jsx)("span", { style: {
                            fontFamily: FONT_FAMILY,
                            fontSize: fontSize * 0.45,
                            fontWeight: 700,
                            color,
                            opacity: 0.9,
                        }, children: suffix })) : null] }), label ? ((0, jsx_runtime_1.jsx)("p", { style: {
                    fontFamily: FONT_FAMILY,
                    fontSize: fontSize * 0.28,
                    fontWeight: 500,
                    color: '#94a3b8',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                }, children: label })) : null] }));
};
exports.CounterAnim = CounterAnim;
//# sourceMappingURL=CounterAnim.js.map