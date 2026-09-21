"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverRecruit = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const FONT = "'Inter', 'Outfit', -apple-system, sans-serif";
const YELLOW = '#fad400';
const WHITE = '#ffffff';
const BG = '#000000';
const FPS = 30;
// ── Scene 1: HOOK (0-4s) ──────────────────────────────────────────────────
const S1 = ({ f }) => {
    const op = (0, remotion_1.interpolate)(f, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const sc = (0, remotion_1.spring)({ frame: Math.max(0, f - 3), fps: FPS, from: 1.3, to: 1, config: { damping: 10, mass: 0.4 } });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { background: BG, justifyContent: 'center', alignItems: 'center', opacity: op, transform: `scale(${sc})` }, children: [(0, jsx_runtime_1.jsx)("div", { style: { width: 80, height: 80, borderRadius: 16, background: YELLOW, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, color: BG, boxShadow: `0 0 60px ${YELLOW}70`, marginBottom: 30 }, children: "TAD" }), (0, jsx_runtime_1.jsx)("h1", { style: { fontFamily: FONT, fontSize: 80, fontWeight: 900, color: WHITE, margin: 0, textAlign: 'center', letterSpacing: '-1px' }, children: "CONDUCTORES" }), (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: FONT, fontSize: 22, fontWeight: 700, color: YELLOW, margin: '16px 0 0', letterSpacing: '6px', textTransform: 'uppercase' }, children: "Te estamos buscando" })] }));
};
// ── Scene 2: GANA (4-9s) ──────────────────────────────────────────────────
const S2 = ({ f }) => {
    const op = (0, remotion_1.interpolate)(f, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const ty = (0, remotion_1.spring)({ frame: Math.max(0, f), fps: FPS, from: 40, to: 0, config: { damping: 12, mass: 0.5 } });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { background: BG, justifyContent: 'center', alignItems: 'center', opacity: op, transform: `translateY(${ty}px)`, padding: '0 40px' }, children: [(0, jsx_runtime_1.jsx)("h1", { style: { fontFamily: FONT, fontSize: 72, fontWeight: 900, color: WHITE, textAlign: 'center', margin: 0 }, children: "GANA HASTA" }), (0, jsx_runtime_1.jsx)("h1", { style: { fontFamily: FONT, fontSize: 120, fontWeight: 900, color: YELLOW, textAlign: 'center', margin: '10px 0', letterSpacing: '-2px' }, children: "RD$15,000" }), (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: FONT, fontSize: 28, fontWeight: 600, color: WHITE, textAlign: 'center', margin: 0 }, children: "CADA MES" }), (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: FONT, fontSize: 16, fontWeight: 400, color: '#a1a1aa', textAlign: 'center', marginTop: 16 }, children: "Sin hacer nada extra. Solo instalamos la pantalla." })] }));
};
// ── Scene 3: BENEFICIOS (9-16s) ───────────────────────────────────────────
const S3 = ({ f }) => {
    const items = [
        { n: 'RD$500', l: 'POR SLOT', c: YELLOW },
        { n: 'RD$500', l: 'POR REFERIDO', c: WHITE },
        { n: 'RD$5,000', l: 'RETIRO MÍNIMO', c: YELLOW },
    ];
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { background: BG, justifyContent: 'center', padding: '0 40px' }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontFamily: FONT, fontSize: 24, fontWeight: 800, color: WHITE, textAlign: 'center', marginBottom: 30, letterSpacing: '2px' }, children: "BENEFICIOS" }), items.map((it, i) => {
                const d = 5 + i * 10;
                const op = (0, remotion_1.interpolate)(Math.max(0, f - d), [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', marginBottom: 10, border: `1px solid ${it.c}30`, borderRadius: 12, opacity: op }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontFamily: FONT, fontSize: 32, fontWeight: 900, color: it.c }, children: it.n }), (0, jsx_runtime_1.jsx)("span", { style: { fontFamily: FONT, fontSize: 14, fontWeight: 600, color: '#a1a1aa', letterSpacing: '2px' }, children: it.l })] }, i);
            })] }));
};
// ── Scene 4: REFERIDOS (16-22s) ──────────────────────────────────────────
const S4 = ({ f }) => {
    const sc = (0, remotion_1.spring)({ frame: Math.max(0, f), fps: FPS, from: 0.85, to: 1, config: { damping: 10, mass: 0.5 } });
    const op = (0, remotion_1.interpolate)(f, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return ((0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { background: BG, justifyContent: 'center', alignItems: 'center', opacity: op, transform: `scale(${sc})`, padding: '0 40px' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { padding: '30px', borderRadius: 20, border: `2px solid ${YELLOW}60`, textAlign: 'center', maxWidth: 600 }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontFamily: FONT, fontSize: 28, fontWeight: 900, color: WHITE, margin: 0 }, children: "SISTEMA DE REFERIDOS" }), (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: FONT, fontSize: 48, fontWeight: 900, color: YELLOW, margin: '20px 0 8px' }, children: "RD$500" }), (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: FONT, fontSize: 18, fontWeight: 500, color: WHITE, margin: 0 }, children: "Por cada conductor que refieras" }), (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: FONT, fontSize: 14, fontWeight: 400, color: '#a1a1aa', marginTop: 12 }, children: "Sin l\u00EDmite \u2022 C\u00F3digo QR \u00FAnico" })] }) }));
};
// ── Scene 5: TODO (22-26s) ───────────────────────────────────────────────
const S5 = ({ f }) => {
    const items = ['📱 Billetera digital', '📍 GPS inteligente', '🏦 Pago directo', '🔗 QR de referidos'];
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { background: BG, justifyContent: 'center', padding: '0 40px' }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontFamily: FONT, fontSize: 22, fontWeight: 800, color: WHITE, textAlign: 'center', marginBottom: 24 }, children: "TODO INCLUIDO" }), items.map((t, i) => {
                const d = 3 + i * 6;
                const op = (0, remotion_1.interpolate)(Math.max(0, f - d), [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const x = (0, remotion_1.interpolate)(Math.max(0, f - d), [0, 10], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return (0, jsx_runtime_1.jsx)("div", { style: { opacity: op, transform: `translateX(${x}px)`, padding: '14px 16px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontFamily: FONT, fontSize: 18, fontWeight: 600, color: WHITE }, children: t }, i);
            })] }));
};
// ── Scene 6: CTA (26-30s) ────────────────────────────────────────────────
const S6 = ({ f }) => {
    const sc = (0, remotion_1.spring)({ frame: Math.max(0, f), fps: FPS, from: 0.8, to: 1, config: { damping: 10, mass: 0.4 } });
    const op = (0, remotion_1.interpolate)(f, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { background: BG, justifyContent: 'center', alignItems: 'center', opacity: op, transform: `scale(${sc})` }, children: [(0, jsx_runtime_1.jsx)("div", { style: { width: 80, height: 80, borderRadius: 16, background: YELLOW, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, color: BG, marginBottom: 20 }, children: "TAD" }), (0, jsx_runtime_1.jsx)("h1", { style: { fontFamily: FONT, fontSize: 64, fontWeight: 900, color: WHITE, textAlign: 'center', margin: 0, letterSpacing: '-1px' }, children: "\u00DANETE A LA RED" }), (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: FONT, fontSize: 18, fontWeight: 600, color: YELLOW, marginTop: 16 }, children: "Escanea el QR del conductor TAD" }), (0, jsx_runtime_1.jsx)("p", { style: { fontFamily: FONT, fontSize: 14, fontWeight: 400, color: '#a1a1aa', marginTop: 20 }, children: "tad.do \u2014 Empieza hoy" })] }));
};
// ── COMPOSITION ───────────────────────────────────────────────────────────
const DriverRecruit = () => {
    const f = (0, remotion_1.useCurrentFrame)();
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { children: [(0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 0, durationInFrames: 120, children: (0, jsx_runtime_1.jsx)(S1, { f: f }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 120, durationInFrames: 150, children: (0, jsx_runtime_1.jsx)(S2, { f: Math.max(0, f - 120) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 270, durationInFrames: 210, children: (0, jsx_runtime_1.jsx)(S3, { f: Math.max(0, f - 270) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 480, durationInFrames: 180, children: (0, jsx_runtime_1.jsx)(S4, { f: Math.max(0, f - 480) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 660, durationInFrames: 120, children: (0, jsx_runtime_1.jsx)(S5, { f: Math.max(0, f - 660) }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: 780, durationInFrames: 120, children: (0, jsx_runtime_1.jsx)(S6, { f: Math.max(0, f - 780) }) })] }));
};
exports.DriverRecruit = DriverRecruit;
exports.default = DriverRecruit;
//# sourceMappingURL=driver-recruit.js.map