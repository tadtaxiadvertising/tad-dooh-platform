"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterAnim = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const CounterAnim = ({ target, suffix = '', prefix = '', durationFrames = 30, color = '#fad400', fontSize = 80, label, slideFrom = 'bottom', }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const local = Math.max(0, frame);
    // Easing: ease-out para el número (se ralentiza al acercarse al target)
    const progress = Math.min(1, Math.max(0, local / durationFrames));
    const easedProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    const currentValue = Math.round(easedProgress * target);
    // Spring para slider de entrada
    const slideDistance = 60;
    const slideY = (0, remotion_1.spring)({
        frame: local,
        fps,
        from: slideFrom === 'left' ? -slideDistance : slideDistance,
        to: 0,
        config: { damping: 14, mass: 0.6, stiffness: 120 },
    });
    const slideX = slideFrom === 'left' || slideFrom === 'right'
        ? (0, remotion_1.spring)({
            frame: local,
            fps,
            from: slideFrom === 'left' ? -slideDistance : slideDistance,
            to: 0,
            config: { damping: 14, mass: 0.6, stiffness: 120 },
        })
        : 0;
    const opacity = (0, remotion_1.interpolate)(local, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const glowIntensity = (0, remotion_1.interpolate)(local, [15, 30 + (target > 0 ? 15 : 0)], [0.5, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, children: (0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
                justifyContent: 'center',
                alignItems: 'center',
                opacity,
                transform: `translate(${slideX}px, ${slideY}px)`,
                textAlign: 'center',
                gap: 12,
            }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'baseline', gap: 4 }, children: [prefix ? ((0, jsx_runtime_1.jsx)("span", { style: {
                                fontSize: fontSize * 0.5,
                                fontWeight: 500,
                                color: color,
                                opacity: 0.7,
                            }, children: prefix })) : null, (0, jsx_runtime_1.jsx)("span", { style: {
                                fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
                                fontSize,
                                fontWeight: 900,
                                color,
                                lineHeight: 1,
                                letterSpacing: '-2px',
                                textShadow: `0 0 30px ${color}80`,
                            }, children: currentValue }), suffix ? ((0, jsx_runtime_1.jsx)("span", { style: {
                                fontSize: fontSize * 0.45,
                                fontWeight: 700,
                                color: color,
                                opacity: 0.9,
                            }, children: suffix })) : null] }), label ? ((0, jsx_runtime_1.jsx)("p", { style: {
                        fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
                        fontSize: fontSize * 0.28,
                        fontWeight: 500,
                        color: '#94a3b8',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                    }, children: label })) : null] }) }));
};
exports.CounterAnim = CounterAnim;
//# sourceMappingURL=CounterAnim.js.map