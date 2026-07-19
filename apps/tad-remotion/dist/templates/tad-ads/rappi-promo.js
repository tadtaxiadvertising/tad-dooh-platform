"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RappiAd = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const RappiAd = () => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const brandColor = '#00bf54';
    const boxY = (0, remotion_1.spring)({
        frame: frame - 8,
        from: 30,
        to: 0,
        fps,
        config: { damping: 11, mass: 0.6 },
    });
    const bgScale = (0, remotion_1.interpolate)(frame, [0, 90], [1, 1.16], {
        extrapolateRight: 'clamp',
    });
    const textY = (0, remotion_1.spring)({
        frame: frame - 22,
        from: 24,
        to: 0,
        fps,
        config: { damping: 13, mass: 0.7 },
    });
    const dashOffset = (0, remotion_1.interpolate)(frame, [30, 120], [0, 1000]);
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            backgroundColor: '#050505',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `radial-gradient(circle at 70% 70%, ${brandColor}33 0%, #050505 55%)`,
                    transform: `scale(${bgScale})`,
                } }), (0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                }, children: [(0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, durationInFrames: 300, children: (0, jsx_runtime_1.jsx)("div", { style: { transform: `translateY(${boxY}px)`, textAlign: 'center' }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    backgroundColor: '#fff',
                                    color: '#000',
                                    padding: '24px 48px',
                                    borderRadius: '18px',
                                    display: 'inline-block',
                                    marginBottom: '28px',
                                }, children: (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '54px', fontWeight: 900, letterSpacing: '-1px' }, children: "RAPPI" }) }) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 18, durationInFrames: 250, children: (0, jsx_runtime_1.jsxs)("div", { style: { transform: `translateY(${textY}px)`, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)("h1", { style: {
                                        fontSize: '96px',
                                        fontWeight: 900,
                                        color: '#fff',
                                        lineHeight: 1.05,
                                        margin: '0 0 32px 0',
                                        textTransform: 'uppercase',
                                    }, children: ["ENTREGA", ' ', (0, jsx_runtime_1.jsx)("span", { style: {
                                                color: brandColor,
                                                textDecoration: 'underline',
                                                textDecorationThickness: '6px',
                                            }, children: "AHORA" })] }), (0, jsx_runtime_1.jsx)("p", { style: {
                                        fontSize: '42px',
                                        fontWeight: 500,
                                        color: '#fff',
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        padding: '16px 44px',
                                        borderRadius: '28px',
                                        display: 'inline-block',
                                        backdropFilter: 'blur(10px)',
                                    }, children: "Ped\u00ED lo que quieras \u2022 R\u00E1pido" })] }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 60, durationInFrames: 60, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: brandColor,
                            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    color: '#000',
                                    fontSize: '64px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    padding: '24px 40px',
                                    border: '6px solid #000',
                                    borderRadius: '24px',
                                }, children: "PED\u00CD YA" }) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, durationInFrames: 330, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                                overflow: 'hidden',
                                opacity: 0.35,
                                pointerEvents: 'none',
                            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundImage: 'repeating-linear-gradient(90deg, #fff 0px, #fff 6px, transparent 6px, transparent 40px)',
                                    backgroundPosition: `${dashOffset}px 0`,
                                    backgroundSize: '40px 100%',
                                } }) }) })] })] }));
};
exports.RappiAd = RappiAd;
//# sourceMappingURL=rappi-promo.js.map