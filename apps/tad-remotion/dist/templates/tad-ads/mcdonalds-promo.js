"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McDonaldsAd = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const McDonaldsAd = () => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const brandColor = '#da291c';
    const y = (0, remotion_1.spring)({
        frame: frame - 8,
        from: 24,
        to: 0,
        fps,
        config: { damping: 11, mass: 0.6 },
    });
    const bgScale = (0, remotion_1.interpolate)(frame, [0, 80], [1, 1.14], { extrapolateRight: 'clamp' });
    const ctaFade = (0, remotion_1.interpolate)(frame, [65, 95], [0, 1]);
    const shake = Math.sin(frame * 0.5) * 2;
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            backgroundColor: '#0a0a0b',
            overflow: 'hidden',
            fontFamily: "system-ui, -apple-system, 'Helvetica Neue', sans-serif",
        }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `radial-gradient(circle at 60% 30%, ${brandColor}55 0%, #0a0a0b 55%)`,
                    transform: `scale(${bgScale})`,
                } }), (0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                }, children: [(0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, durationInFrames: 300, children: (0, jsx_runtime_1.jsx)("div", { style: { transform: `translateY(${y}px)`, textAlign: 'center' }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    backgroundColor: brandColor,
                                    color: '#fff',
                                    padding: '24px 56px',
                                    borderRadius: '28px',
                                    display: 'inline-block',
                                    marginBottom: '28px',
                                    transform: `translateX(${shake}px)`,
                                }, children: (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '58px', fontWeight: 900, letterSpacing: '-1px' }, children: "MCDONALD'S" }) }) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 18, durationInFrames: 250, children: (0, jsx_runtime_1.jsxs)("div", { style: { transform: `translateY(${y}px)`, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)("h1", { style: {
                                        fontSize: '100px',
                                        fontWeight: 900,
                                        color: '#fff',
                                        lineHeight: 1.05,
                                        margin: '0 0 28px 0',
                                        textTransform: 'uppercase',
                                    }, children: ["Big Mac", ' ', (0, jsx_runtime_1.jsx)("span", { style: {
                                                color: '#ffc72c',
                                                textShadow: '0 0 40px #ffc72c66',
                                            }, children: "2x1" })] }), (0, jsx_runtime_1.jsx)("p", { style: {
                                        fontSize: '42px',
                                        fontWeight: 500,
                                        color: '#fff',
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        padding: '16px 48px',
                                        borderRadius: '28px',
                                        display: 'inline-block',
                                        backdropFilter: 'blur(10px)',
                                    }, children: "Por tiempo limitado" })] }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 65, durationInFrames: 65, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: '#ffc72c',
                                opacity: ctaFade,
                            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    color: '#000',
                                    fontSize: '68px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    padding: '24px 48px',
                                    borderRadius: '24px',
                                    backgroundColor: '#fff',
                                    transform: `skewX(-6deg)`,
                                }, children: "Ped\u00ED tu combo" }) }) })] })] }));
};
exports.McDonaldsAd = McDonaldsAd;
//# sourceMappingURL=mcdonalds-promo.js.map