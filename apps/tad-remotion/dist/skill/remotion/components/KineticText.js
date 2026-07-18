"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KineticText = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const KineticText = ({ text, accentColor = '#e51636', fontSize = 56, fontWeight = 800, fontColor = '#f8fafc', revealCharByChar = true, revealDelay = 15, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const local = frame - revealDelay;
    if (!revealCharByChar) {
        // Todo el texto aparece en fade
        const opacity = (0, remotion_1.interpolate)(local, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const y = (0, remotion_1.spring)({ frame: local, fps, from: 20, to: 0, config: { damping: 14, mass: 0.7 } });
        return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { justifyContent: 'center', alignItems: 'center', opacity, padding: '0 80px' }, children: (0, jsx_runtime_1.jsx)("h1", { style: {
                    fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
                    fontSize,
                    fontWeight,
                    color: fontColor,
                    lineHeight: 1.2,
                    letterSpacing: '-0.5px',
                    textAlign: 'center',
                    transform: `translateY(${y}px)`,
                }, children: text }) }));
    }
    // Reveal char by char (letters appear progressively with spring)
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { justifyContent: 'center', alignItems: 'center', padding: '0 60px' }, children: (0, jsx_runtime_1.jsx)("h1", { style: {
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.02em',
                fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
                fontSize,
                fontWeight,
                color: fontColor,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
                textAlign: 'center',
            }, children: text.split('').map((char, i) => {
                const charFrame = local - i * 2;
                if (charFrame < 0)
                    return null;
                const opacity = (0, remotion_1.interpolate)(charFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const y = (0, remotion_1.spring)({
                    frame: charFrame,
                    fps,
                    from: 15,
                    to: 0,
                    config: { damping: 16, mass: 0.5 },
                });
                const letterSpacing = (0, remotion_1.interpolate)(charFrame, [0, 15], [0.3, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return ((0, jsx_runtime_1.jsx)("span", { style: {
                        opacity,
                        transform: `translateY(${y}px)`,
                        letterSpacing: `${letterSpacing}em`,
                        display: 'inline-block',
                        color: char === ' ' ? 'transparent' : fontColor,
                        textShadow: char !== ' ' ? `0 0 20px ${accentColor}60` : 'none',
                    }, children: char === ' ' ? '\u00A0' : char }, i));
            }) }) }));
};
exports.KineticText = KineticText;
//# sourceMappingURL=KineticText.js.map