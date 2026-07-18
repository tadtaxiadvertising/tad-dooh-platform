"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticleField = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — ParticleField
//  Campo de partículas doradas sutiles para fondos premium.
//  Aplica: Disney Secondary Motion + Parallax sutil.
// ─────────────────────────────────────────────────────────────────────────────
const react_1 = __importDefault(require("react"));
const remotion_1 = require("remotion");
const ParticleField = ({ color = '#fad400', count = 35, maxSize = 2.5, opacity = 0.5, speed = 0.4, }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { width, height } = (0, remotion_1.useVideoConfig)();
    // Semilla determinística por seed (evita destellos aleatorios frame a frame)
    const particles = react_1.default.useMemo(() => {
        const out = [];
        for (let i = 0; i < count; i++) {
            const seed = i * 9973;
            out.push({
                x: (0, remotion_1.random)(seed) * width,
                y: (0, remotion_1.random)(seed + 1) * height,
                size: (0, remotion_1.random)(seed + 2) * maxSize,
                seed,
            });
        }
        return out;
    }, [count, maxSize, width, height]);
    const globalOpacity = (0, remotion_1.interpolate)(frame, [0, 30], [0, opacity], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { pointerEvents: 'none', zIndex: 1 }, children: particles.map((p, i) => {
            const drift = (frame * speed) % height;
            const parallaxY = (p.y + drift * (0.1 + (p.seed % 5) * 0.05)) % height;
            const twinkle = (0, remotion_1.interpolate)((frame * 0.8 + p.seed) % 60, [0, 30, 60], [0.2, 1, 0.2], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            });
            return ((0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    left: p.x,
                    top: parallaxY,
                    width: p.size,
                    height: p.size,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 ${p.size * 3}px ${color}80`,
                    opacity: globalOpacity * twinkle,
                } }, i));
        }) }));
};
exports.ParticleField = ParticleField;
ParticleField.displayName = 'ParticleField';
//# sourceMappingURL=ParticleField.js.map