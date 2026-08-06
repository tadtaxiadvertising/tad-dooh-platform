"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TadHook = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
// spring helper: valores numéricos en px para translateY
const useSpringY = (frame, fps, from, to) => (0, remotion_1.spring)({ frame, fps, from, to, config: { damping: 14, mass: 0.7, stiffness: 120 } });
const TadHook = ({ text, headline, subline, accentColor = '#e51636', colorStack, texture = 'minimal', depth = 3, contrast = 'high', easingIn, easingOut, durationInFrames = 75, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps, width, height } = (0, remotion_1.useVideoConfig)();
    const isVertical = height > width;
    // Resolve alias: headline > text
    const hookText = text || headline || '¿Alguna vez te preguntaste por qué?';
    const contrastMultiplier = contrast === 'high' ? 1 : contrast === 'medium' ? 0.7 : 0.5;
    // Fade in rápido: 0→1 en 12 frames (0.4s @ 30fps)
    const fadeIn = (0, remotion_1.interpolate)(frame, [0, 12], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: remotion_1.Easing.bezier(0.16, 1, 0.3, 1),
    });
    // Glow central: pulso en escala
    const dotScale = (0, remotion_1.interpolate)(frame, [10, 30, durationInFrames], [0.6, 1.05, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: remotion_1.Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    // Texto entra desde abajo con spring
    const textY = useSpringY(Math.max(0, frame - 5), fps, 30, 0);
    // Dot pulsante: escala en cada ciclo de 40 frames
    const dotPulse = (0, remotion_1.interpolate)(frame % 40, [0, 20, 40], [0.8, 1.3, 0.8], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: remotion_1.Easing.bezier(0.4, 0, 0.2, 1),
    });
    // Configurar textura
    const particleCount = texture === 'particles' ? 12 : texture === 'neon' ? 6 : 0;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
        const x = 10 + (i * 80) % 90;
        const y = 10 + (i * 60) % 80;
        const size = texture === 'particles' ? 2 + (i % 3) : 0.5;
        const particleOpacity = (0, remotion_1.interpolate)((frame + i * 10) % 60, [0, 30, 60], [0, 0.5 * contrastMultiplier, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        particles.push((0, jsx_runtime_1.jsx)("div", { style: {
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                borderRadius: '50%',
                background: colorStack?.[i % (colorStack?.length || 1)] || accentColor,
                opacity: particleOpacity,
                filter: `blur(${texture === 'neon' ? 4 : 1}px)`,
                transform: `translateY(${Math.sin((frame + i * 20) * 0.05) * 10}px)`,
            } }, i));
    }
    const bgGradient = isVertical
        ? `radial-gradient(circle at 50% 40%, ${accentColor}${Math.round(24 * contrastMultiplier).toString(16).padStart(2, '0')} 0%, transparent 60%), #050505`
        : `radial-gradient(ellipse 50% 50% at 50% 40%, ${accentColor}${Math.round(21 * contrastMultiplier).toString(16).padStart(2, '0')} 0%, transparent 70%), #050505`;
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            background: bgGradient,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: fadeIn,
            overflow: 'hidden',
        }, children: [particles, (0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    top: isVertical ? '38%' : '45%',
                    left: '50%',
                    transform: `translate(-50%, -50%) scale(${dotScale * dotPulse})`,
                    width: isVertical ? 40 : 60,
                    height: isVertical ? 40 : 60,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                    filter: `blur(${isVertical ? 4 : 6}px)`,
                    zIndex: 1,
                    opacity: 0.6 * contrastMultiplier,
                } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    transform: `translateY(${textY}px)`,
                    textAlign: 'center',
                    padding: '0 60px',
                    zIndex: 2,
                }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                            fontFamily: "'Inter', 'Outfit', -apple-system, sans-serif",
                            fontSize: isVertical ? (depth > 3 ? 60 : 52) : 64,
                            fontWeight: 900,
                            color: '#ffffff',
                            lineHeight: 1.2,
                            letterSpacing: '-0.5px',
                            margin: 0,
                            textShadow: `0 0 ${40 * contrastMultiplier}px ${accentColor}80`,
                        }, children: hookText.toUpperCase() }), subline ? ((0, jsx_runtime_1.jsx)("p", { style: {
                            fontFamily: "'Inter', 'Outfit', -apple-system, sans-serif",
                            fontSize: isVertical ? 24 : 28,
                            fontWeight: 400,
                            color: '#94a3b8',
                            marginTop: 16,
                            opacity: fadeIn,
                        }, children: subline })) : null] })] }));
};
exports.TadHook = TadHook;
//# sourceMappingURL=TadHook.js.map