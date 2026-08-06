"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterAnim = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";
// spring direccional: desde la dirección elegida hacia 0
const useSlideSpring = (frame, fps, slideFrom, distance, config) => {
    const cfg = config || { damping: 14, mass: 0.6, stiffness: 120 };
    const y = slideFrom === 'bottom'
        ? (0, remotion_1.spring)({ frame, fps, from: distance, to: 0, config: cfg })
        : 0;
    const x = slideFrom !== 'bottom'
        ? (0, remotion_1.spring)({ frame, fps, from: slideFrom === 'left' ? -distance : distance, to: 0, config: cfg })
        : 0;
    return { x, y };
};
const CounterAnim = ({ target = 100, suffix = '', prefix = '', precision = 0, durationFrames = 30, color = '#fad400', fontSize = 80, label, slideFrom = 'bottom', tension = 180, friction = 12, suffixGap = 6, easing = 'ease-out', glowTrail = false, barChart = false, barData, barLabelAbove = false, barGrowth = 'from-bottom', barRadius = 8, barPadding = 14, barGrowthDurationFrames = 45, digits, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const local = Math.max(0, frame);
    // Spring config from tension/friction
    const springConfig = {
        damping: friction * 1.5,
        mass: 0.6,
        stiffness: tension,
    };
    // Progreso de 0→1
    const progress = (0, remotion_1.interpolate)(local, [0, durationFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: remotion_1.Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    const currentValue = (progress * target).toFixed(precision);
    // Slider spring
    const { x: slideX, y: slideY } = useSlideSpring(local, fps, slideFrom, 60, springConfig);
    // Glow trail
    const glowProgress = glowTrail
        ? (0, remotion_1.interpolate)(local, [durationFrames, durationFrames + 15], [0.5, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: remotion_1.Easing.bezier(0.25, 0.1, 0.25, 1),
        })
        : (0, remotion_1.interpolate)(local, [durationFrames, durationFrames + 15], [0.5, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: remotion_1.Easing.bezier(0.25, 0.1, 0.25, 1),
        });
    const opacity = (0, remotion_1.interpolate)(local, [0, 15], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: remotion_1.Easing.bezier(0.16, 1, 0.3, 1),
    });
    // Bar chart
    const renderBarChart = () => {
        if (!barChart || !barData || barData.length === 0)
            return null;
        const maxValue = Math.max(...barData.map((d) => d.value), 1);
        return ((0, jsx_runtime_1.jsx)("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                gap: barPadding,
                marginTop: 24,
                height: fontSize * 1.2,
            }, children: barData.map((bar, i) => {
                const barProgress = (0, remotion_1.interpolate)(Math.max(0, local - i * 5), [0, barGrowthDurationFrames], [0, bar.value / maxValue], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const barHeight = Math.max(barProgress * fontSize * 1.2, 2);
                const barOpacity = (0, remotion_1.interpolate)(Math.max(0, local - i * 5), [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return ((0, jsx_runtime_1.jsxs)("div", { style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        opacity: barOpacity,
                    }, children: [barLabelAbove ? ((0, jsx_runtime_1.jsx)("span", { style: {
                                fontFamily: FONT_FAMILY,
                                fontSize: fontSize * 0.18,
                                fontWeight: 600,
                                color: bar.color,
                            }, children: bar.label })) : null, (0, jsx_runtime_1.jsx)("div", { style: {
                                width: fontSize * 0.3,
                                height: barHeight,
                                borderRadius: barRadius,
                                background: bar.color,
                                transition: 'none',
                                boxShadow: glowTrail ? `0 0 10px ${bar.color}60` : 'none',
                            } }), !barLabelAbove ? ((0, jsx_runtime_1.jsx)("span", { style: {
                                fontFamily: FONT_FAMILY,
                                fontSize: fontSize * 0.16,
                                fontWeight: 500,
                                color: '#94a3b8',
                            }, children: bar.label })) : null] }, i));
            }) }));
    };
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            justifyContent: 'center',
            alignItems: 'center',
            opacity,
            transform: `translate(${slideX}px, ${slideY}px)`,
            textAlign: 'center',
            gap: 12,
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'baseline', gap: suffixGap }, children: [prefix ? ((0, jsx_runtime_1.jsx)("span", { style: {
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
                            fontVariantNumeric: 'tabular-nums',
                        }, children: currentValue }), suffix ? ((0, jsx_runtime_1.jsx)("span", { style: {
                            fontFamily: FONT_FAMILY,
                            fontSize: fontSize * 0.45,
                            fontWeight: 700,
                            color,
                            opacity: 0.9,
                        }, children: suffix })) : null] }), renderBarChart(), label ? ((0, jsx_runtime_1.jsx)("p", { style: {
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