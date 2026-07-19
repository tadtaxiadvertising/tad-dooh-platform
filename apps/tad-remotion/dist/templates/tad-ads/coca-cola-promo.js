"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CocaColaAd = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const CocaColaAd = () => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const brandColor = '#f40009';
    const y = (0, remotion_1.spring)({
        frame: frame - 10,
        from: 20,
        to: 0,
        fps,
        config: { damping: 13, mass: 0.5 },
    });
    const bgScale = (0, remotion_1.interpolate)(frame, [0, 80], [1, 1.12], { extrapolateRight: 'clamp' });
    const fadeIn = (0, remotion_1.interpolate)(frame, [35, 70], [0, 1]);
    const wave = Math.sin((frame / 18) * Math.PI);
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            backgroundColor: '#0a0a0b',
            overflow: 'hidden',
            fontFamily: "system-ui, -apple-system, 'Helvetica Neue', sans-serif",
        }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `radial-gradient(circle at 40% 60%, ${brandColor}44 0%, #0a0a0b 55%)`,
                    transform: `scale(${bgScale})`,
                } }), (0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { justifyContent: 'center', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, durationInFrames: 300, children: (0, jsx_runtime_1.jsxs)("div", { style: { transform: `translateY(${y}px)`, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                        color: '#fff',
                                        fontSize: '54px',
                                        fontWeight: 900,
                                        letterSpacing: '10px',
                                        marginBottom: '24px',
                                    }, children: "COCA-COLA" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                        width: '120px',
                                        height: '6px',
                                        backgroundColor: brandColor,
                                        margin: '0 auto 32px auto',
                                        borderRadius: '4px',
                                    } })] }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 22, durationInFrames: 250, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                transform: `translateY(${y}px)`,
                                textAlign: 'center',
                                opacity: fadeIn,
                            }, children: [(0, jsx_runtime_1.jsxs)("h1", { style: {
                                        fontSize: '110px',
                                        fontWeight: 900,
                                        color: '#fff',
                                        lineHeight: 1,
                                        margin: '0 0 28px 0',
                                        textTransform: 'uppercase',
                                        letterSpacing: '-2px',
                                    }, children: ["Destapa", ' ', (0, jsx_runtime_1.jsx)("span", { style: {
                                                color: brandColor,
                                                display: 'inline-block',
                                                transform: `scale(${1 + wave * 0.04})`,
                                            }, children: "la felicidad" })] }), (0, jsx_runtime_1.jsx)("p", { style: {
                                        fontSize: '42px',
                                        fontWeight: 300,
                                        color: '#cbd5e1',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                    }, children: "Refrescante. Cl\u00E1sica. Ahora." })] }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 75, durationInFrames: 55, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: '#fff',
                            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    color: '#000',
                                    fontSize: '66px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    padding: '24px 56px',
                                    borderRadius: '24px',
                                    border: '4px solid #000',
                                }, children: "Tom\u00E1 Coca-Cola" }) }) })] })] }));
};
exports.CocaColaAd = CocaColaAd;
//# sourceMappingURL=coca-cola-promo.js.map