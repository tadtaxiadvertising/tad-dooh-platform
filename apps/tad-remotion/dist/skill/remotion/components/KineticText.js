"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KineticText = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";
const useSpringY = (frame, fps, from, to) => (0, remotion_1.spring)({ frame, fps, from, to, config: { damping: 16, mass: 0.5, stiffness: 140 } });
const KineticText = ({ text = 'Impulsa tu marca', accentColor = '#e51636', fontSize = 56, fontWeight = 800, fontColor = '#f8fafc', revealCharByChar = true, revealDelay = 15, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const local = Math.max(0, frame - revealDelay);
    if (!revealCharByChar) {
        const opacity = (0, remotion_1.interpolate)(local, [0, 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: remotion_1.Easing.bezier(0.16, 1, 0.3, 1),
        });
        const y = useSpringY(local, fps, 20, 0);
        return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { justifyContent: 'center', alignItems: 'center', opacity, padding: '0 80px' }, children: (0, jsx_runtime_1.jsx)("h1", { style: {
                    fontFamily: FONT_FAMILY,
                    fontSize,
                    fontWeight,
                    color: fontColor,
                    lineHeight: 1.2,
                    letterSpacing: '-0.5px',
                    textAlign: 'center',
                    transform: `translateY(${y}px)`,
                    margin: 0,
                }, children: text }) }));
    }
    // Reveal letra por letra con spring individual
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { justifyContent: 'center', alignItems: 'center', padding: '0 60px' }, children: (0, jsx_runtime_1.jsx)("h1", { style: {
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.02em',
                fontFamily: FONT_FAMILY,
                fontSize,
                fontWeight,
                color: fontColor,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
                textAlign: 'center',
                margin: 0,
            }, children: text.split('').map((char, i) => {
                const charFrame = local - i * 2;
                if (charFrame < 0) {
                    // Espacios vacíos pero ocupando espacio (nbsp)
                    return ((0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-block', opacity: 0 }, children: '\u00A0' }, i));
                }
                const opacity = (0, remotion_1.interpolate)(charFrame, [0, 10], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                    easing: remotion_1.Easing.bezier(0.16, 1, 0.3, 1),
                });
                const y = useSpringY(charFrame, fps, 15, 0);
                const letterSpacing = (0, remotion_1.interpolate)(charFrame, [0, 15], [0.3, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                    easing: remotion_1.Easing.bezier(0.4, 0, 0.2, 1),
                });
                const isSpace = char === ' ';
                return ((0, jsx_runtime_1.jsx)("span", { style: {
                        opacity,
                        transform: `translateY(${y}px)`,
                        letterSpacing: `${letterSpacing}em`,
                        display: 'inline-block',
                        color: isSpace ? 'transparent' : fontColor,
                        textShadow: isSpace ? 'none' : `0 0 20px ${accentColor}60`,
                    }, children: isSpace ? '\u00A0' : char }, i));
            }) }) }));
};
exports.KineticText = KineticText;
//# sourceMappingURL=KineticText.js.map