"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KineticText = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";
const useSpringY = (frame, fps, from, to) => (0, remotion_1.spring)({ frame, fps, from, to, config: { damping: 16, mass: 0.5, stiffness: 140 } });
const KineticText = ({ text = 'Impulsa tu marca', accentColor = '#e51636', fontSize = 56, fontWeight = 800, fontColor = '#f8fafc', revealCharByChar = true, revealDelay = 15, cursorTrail = false, blend = 'normal', letterSpacing: ls = -0.5, lineHeight = 1.2, maxWidth = 1200, align = 'center', vignetteBehindText = false, glowBehindText = false, glowColor, colorStack, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const local = Math.max(0, frame - revealDelay);
    const finalGlowColor = glowColor || accentColor;
    const blendMode = blend === 'screen' ? 'screen' :
        blend === 'overlay' ? 'overlay' : 'normal';
    if (!revealCharByChar) {
        const opacity = (0, remotion_1.interpolate)(local, [0, 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: remotion_1.Easing.bezier(0.16, 1, 0.3, 1),
        });
        const y = useSpringY(local, fps, 20, 0);
        return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
                justifyContent: 'center',
                alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
                opacity,
                padding: '0 80px',
            }, children: [glowBehindText ? ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                        background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${finalGlowColor}20 0%, transparent 70%)`,
                        opacity: 0.5,
                    } })) : null, vignetteBehindText ? ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
                    } })) : null, (0, jsx_runtime_1.jsx)("h1", { style: {
                        fontFamily: FONT_FAMILY,
                        fontSize,
                        fontWeight,
                        color: fontColor,
                        lineHeight,
                        letterSpacing: `${ls}px`,
                        textAlign: align,
                        maxWidth,
                        transform: `translateY(${y}px)`,
                        margin: 0,
                        mixBlendMode: blendMode,
                    }, children: text })] }));
    }
    // Reveal letra por letra con spring individual
    const chars = text.split('');
    const charRevealDelay = cursorTrail ? 1 : 2;
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            justifyContent: 'center',
            alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
            padding: '0 60px',
        }, children: [glowBehindText ? ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${finalGlowColor}18 0%, transparent 70%)`,
                } })) : null, vignetteBehindText ? ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
                } })) : null, (0, jsx_runtime_1.jsx)("h1", { style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
                    gap: '0.02em',
                    fontFamily: FONT_FAMILY,
                    fontSize,
                    fontWeight,
                    color: fontColor,
                    lineHeight,
                    letterSpacing: `${ls}px`,
                    maxWidth,
                    textAlign: align,
                    margin: 0,
                    mixBlendMode: blendMode,
                }, children: chars.map((char, i) => {
                    const charFrame = local - i * charRevealDelay;
                    if (charFrame < 0) {
                        return ((0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-block', opacity: 0 }, children: '\u00A0' }, i));
                    }
                    const opacity = (0, remotion_1.interpolate)(charFrame, [0, 10], [0, 1], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                        easing: remotion_1.Easing.bezier(0.16, 1, 0.3, 1),
                    });
                    const y = useSpringY(charFrame, fps, 15, 0);
                    const charLetterSpacing = (0, remotion_1.interpolate)(charFrame, [0, 15], [0.3, 0], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                        easing: remotion_1.Easing.bezier(0.4, 0, 0.2, 1),
                    });
                    const isSpace = char === ' ';
                    return ((0, jsx_runtime_1.jsx)("span", { style: {
                            opacity,
                            transform: `translateY(${y}px)`,
                            letterSpacing: `${charLetterSpacing}em`,
                            display: 'inline-block',
                            color: isSpace ? 'transparent' : fontColor,
                            textShadow: isSpace ? 'none' : `0 0 20px ${finalGlowColor}60`,
                        }, children: isSpace ? '\u00A0' : char }, i));
                }) })] }));
};
exports.KineticText = KineticText;
//# sourceMappingURL=KineticText.js.map