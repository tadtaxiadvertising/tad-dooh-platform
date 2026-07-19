"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PedidosYaAd = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const PedidosYaAd = () => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const brandColor = '#f7ca18';
    const bgColor = '#0a0a0b';
    const flameY = (0, remotion_1.spring)({
        frame: frame - 5,
        from: 60,
        to: 0,
        fps,
        config: { damping: 10, mass: 0.6 },
    });
    const bgScale = (0, remotion_1.interpolate)(frame, [0, 90], [1, 1.12], {
        extrapolateRight: 'clamp',
    });
    const textSlide = (0, remotion_1.spring)({
        frame: frame - 20,
        from: 40,
        to: 0,
        fps,
        config: { damping: 14, mass: 0.7 },
    });
    const ctaBg = (0, remotion_1.interpolate)(frame, [60, 90], [0, 1]);
    const pulse = Math.sin((frame / 15) * Math.PI) * 4;
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            backgroundColor: bgColor,
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `radial-gradient(circle at 30% 20%, ${brandColor}33 0%, ${bgColor} 60%)`,
                    transform: `scale(${bgScale})`,
                } }), (0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                }, children: [(0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, durationInFrames: 300, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                transform: `translateY(${flameY}px)`,
                                textAlign: 'center',
                            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    backgroundColor: brandColor,
                                    color: '#000',
                                    padding: '24px 40px',
                                    borderRadius: '24px',
                                    display: 'inline-block',
                                    marginBottom: '32px',
                                }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                                        fontSize: '56px',
                                        fontWeight: 900,
                                        letterSpacing: '-2px',
                                    }, children: "PEDIDOSYA" }) }) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 18, durationInFrames: 250, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                transform: `translateY(${textSlide}px)`,
                                textAlign: 'center',
                            }, children: [(0, jsx_runtime_1.jsxs)("h1", { style: {
                                        fontSize: '96px',
                                        fontWeight: 900,
                                        color: '#fff',
                                        lineHeight: 1.05,
                                        margin: '0 0 32px 0',
                                        textTransform: 'uppercase',
                                    }, children: ["HASTA", ' ', (0, jsx_runtime_1.jsx)("span", { style: {
                                                color: brandColor,
                                                display: 'inline-block',
                                                transform: `scale(${1 + pulse * 0.02})`,
                                            }, children: "40%" }), ' ', "OFF"] }), (0, jsx_runtime_1.jsx)("p", { style: {
                                        fontSize: '42px',
                                        fontWeight: 500,
                                        color: '#fff',
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        padding: '16px 40px',
                                        borderRadius: '28px',
                                        display: 'inline-block',
                                        backdropFilter: 'blur(10px)',
                                    }, children: "Tu delivery ahora" })] }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 55, durationInFrames: 60, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: brandColor,
                                opacity: ctaBg,
                            }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                    color: '#000',
                                    fontSize: '64px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    borderRadius: '20px',
                                    padding: '24px 40px',
                                    backgroundColor: '#fff',
                                }, children: "PED\u00CD AHORA" }) }) })] })] }));
};
exports.PedidosYaAd = PedidosYaAd;
//# sourceMappingURL=pedidosya-promo.js.map