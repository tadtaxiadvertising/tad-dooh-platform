"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicAdTemplate = void 0;
const react_1 = __importDefault(require("react"));
const remotion_1 = require("remotion");
const DynamicAdTemplate = ({ logoUrl, brandColor = '#e51636', primaryText = '¡OFERTA 2x1 SOLO POR HOY!', secondaryText = 'Haz tu orden ahora', }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    const bgScale = (0, remotion_1.interpolate)(frame, [0, 150], [1, 1.1], {
        extrapolateRight: 'clamp',
    });
    const logoScale = (0, remotion_1.spring)({
        frame: frame - 10,
        from: 0,
        to: 1,
        fps,
        config: { damping: 12, mass: 0.5 },
    });
    const textY = (0, remotion_1.spring)({
        frame: frame - 25,
        from: 100,
        to: 0,
        fps,
    });
    const textOpacity = (0, remotion_1.interpolate)(frame, [25, 45], [0, 1]);
    return (react_1.default.createElement(remotion_1.AbsoluteFill, { style: { backgroundColor: '#0a0a0b', overflow: 'hidden' } },
        react_1.default.createElement(remotion_1.AbsoluteFill, { style: {
                background: `radial-gradient(circle at center, ${brandColor} 0%, #0a0a0b 100%)`,
                opacity: 0.4,
                transform: `scale(${bgScale})`,
            } }),
        react_1.default.createElement(remotion_1.AbsoluteFill, { style: { justifyContent: 'center', alignItems: 'center' } },
            react_1.default.createElement("div", { style: {
                    transform: `scale(${logoScale})`,
                    background: 'white',
                    padding: '40px',
                    borderRadius: '50px',
                    boxShadow: `0px 20px 50px ${brandColor}80`,
                    marginBottom: '40px',
                } }, logoUrl && (react_1.default.createElement(remotion_1.Img, { src: logoUrl, style: { width: '300px', height: 'auto', objectFit: 'contain' } }))),
            react_1.default.createElement(remotion_1.Sequence, { from: 25 },
                react_1.default.createElement("div", { style: {
                        transform: `translateY(${textY}px)`,
                        opacity: textOpacity,
                        textAlign: 'center',
                    } },
                    react_1.default.createElement("h1", { style: {
                            fontFamily: 'sans-serif',
                            fontSize: '80px',
                            fontWeight: 900,
                            color: 'white',
                            lineHeight: 1.1,
                            textTransform: 'uppercase',
                            margin: 0,
                        } }, primaryText),
                    react_1.default.createElement("p", { style: {
                            fontFamily: 'sans-serif',
                            fontSize: '35px',
                            fontWeight: 500,
                            color: brandColor,
                            marginTop: '20px',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: '10px 30px',
                            borderRadius: '20px',
                            display: 'inline-block',
                        } }, secondaryText))))));
};
exports.DynamicAdTemplate = DynamicAdTemplate;
//# sourceMappingURL=dynamic-ad.js.map