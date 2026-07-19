"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarbucksAd = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const StarbucksAd = () => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const brandColor = '#1e3932';
    const accent = '#d4e9e2';
    const y = (0, remotion_1.spring)({
        frame: frame - 10,
        from: 20,
        to: 0,
        fps,
        config: { damping: 14, mass: 0.5 },
    });
    const bgLightness = (0, remotion_1.interpolate)(frame, [0, 120], [0.92, 1], {
        extrapolateRight: 'clamp',
    });
    const fadeIn = (0, remotion_1.interpolate)(frame, [40, 80], [0, 1]);
    const blur = (0, remotion_1.interpolate)(frame, [20, 70], [12, 0], { extrapolateRight: 'clamp' });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            backgroundColor: '#f2f0eb',
            overflow: 'hidden',
            fontFamily: "'Lato', 'Segoe UI', system-ui, sans-serif",
        }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    backgroundColor: `hsl(160, 20%, ${bgLightness * 100}%)`,
                    opacity: 0.6,
                } }), (0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                }, children: [(0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, durationInFrames: 300, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                transform: `translateY(${y}px)`,
                                textAlign: 'center',
                            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    color: brandColor,
                                    fontSize: '54px',
                                    fontWeight: 900,
                                    letterSpacing: '6px',
                                    marginBottom: '24px',
                                }, children: "STARBUCKS" }) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 25, durationInFrames: 250, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                transform: `translateY(${y}px)`,
                                textAlign: 'center',
                                opacity: fadeIn,
                                filter: `blur(${blur}px)`,
                            }, children: [(0, jsx_runtime_1.jsxs)("h1", { style: {
                                        fontSize: '80px',
                                        fontWeight: 800,
                                        color: brandColor,
                                        lineHeight: 1.05,
                                        margin: '0 0 24px 0',
                                        textTransform: 'uppercase',
                                    }, children: ["Frappuccino", (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)("span", { style: { color: '#00704a' }, children: "Nuevo" })] }), (0, jsx_runtime_1.jsx)("p", { style: {
                                        fontSize: '44px',
                                        fontWeight: 300,
                                        color: '#1b4332',
                                        maxWidth: '900px',
                                        margin: '0 auto',
                                        lineHeight: 1.3,
                                    }, children: "M\u00E1ximo sabor en cada sorbo" })] }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 80, durationInFrames: 50, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: brandColor,
                            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    color: '#fff',
                                    fontSize: '56px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '3px',
                                }, children: "Ven\u00ED por el tuyo" }) }) })] })] }));
};
exports.StarbucksAd = StarbucksAd;
//# sourceMappingURL=starbucks-promo.js.map