"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TadPromoVideo = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
// ─── Brand Constants ─────────────────────────────────────
const C = {
    tadYellow: '#fad400',
    tadYellowBright: '#eab308',
    tadYellowGlow: 'rgba(250, 212, 0, 0.25)',
    bg: '#0f172a',
    bgDark: '#000000',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textDim: '#64748b',
    glassBg: 'rgba(255, 255, 255, 0.04)',
    glassBgStrong: 'rgba(255, 255, 255, 0.08)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassBorderStrong: 'rgba(250, 212, 0, 0.15)',
};
const FONT = "'Inter', 'Roboto', system-ui, -apple-system, sans-serif";
// ─── Scene Timings (frames @ 30fps) ──────────────────────
const S = {
    hook: { start: 0, end: 150 },
    solution: { start: 150, end: 450 },
    interactive: { start: 450, end: 750 },
    cta: { start: 750, end: 900 },
};
const TOTAL_FRAMES = 900;
// ─── Helpers ──────────────────────────────────────────────
/** Generic fade in, hold, fade out */
function useFadeRange(frame, fadeIn, holdEnd, fadeOut, fadeDur = 20) {
    return (0, remotion_1.interpolate)(frame, [0, fadeIn + fadeDur, holdEnd - fadeDur, holdEnd], fadeOut === 0 ? [0, 1, 1, 1] : [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}
/** Spring-based slide up */
function useSlideUp(frame, delay = 0, config = { damping: 14, mass: 0.8, stiffness: 100 }) {
    return (0, remotion_1.spring)({
        frame: frame - delay,
        fps: 30,
        from: 60,
        to: 0,
        config,
    });
}
// ─── Shared Components ───────────────────────────────────
const GlassCard = ({ opacity = 1, style, children }) => ((0, jsx_runtime_1.jsx)("div", { style: {
        background: C.glassBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 20,
        padding: '28px 36px',
        opacity,
        ...style,
    }, children: children }));
const Badge = ({ text, icon = '◆', delay = 0, frame, sceneStart }) => {
    const local = frame - sceneStart - delay;
    const opacity = (0, remotion_1.interpolate)(local, [0, 15], [0, 1], { extrapolateLeft: 'clamp' });
    const x = (0, remotion_1.spring)({ frame: local, fps: 30, from: -30, to: 0, config: { damping: 15, mass: 0.5 } });
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: C.glassBgStrong,
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 100,
            padding: '8px 18px 8px 14px',
            opacity,
            transform: `translateX(${x}px)`,
            margin: '6px 0',
            fontSize: 16,
            fontWeight: 500,
            color: C.textPrimary,
        }, children: [(0, jsx_runtime_1.jsx)("span", { style: { color: C.tadYellow, fontSize: 14 }, children: icon }), text] }));
};
// ─── Scene 1: The Hook (0s → 5s) ─────────────────────────
const SceneHook = ({ frame }) => {
    const local = frame - S.hook.start;
    const opacity = useFadeRange(local, 0, 150, 150);
    const slideY = useSlideUp(local, 0, { damping: 16, mass: 0.7, stiffness: 100 });
    // Moving dot on a path
    const dotX = (0, remotion_1.interpolate)(local * 1.5 % 120, [0, 60, 120], [-10, 110, -10], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const dotPulse = (0, remotion_1.interpolate)(local % 40, [0, 20, 40], [1, 1.3, 1]);
    const pathOpacity = (0, remotion_1.interpolate)(local % 30, [0, 15, 30], [0.15, 0.4, 0.15]);
    // Pulsing beacon at bottom
    const beaconScale = (0, remotion_1.interpolate)(local % 60, [0, 30, 60], [1, 1.8, 1]);
    const beaconOpacity = (0, remotion_1.interpolate)(local % 60, [0, 30, 60], [0.4, 0, 0.4]);
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { backgroundColor: C.bg, opacity }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `
            radial-gradient(ellipse 60% 50% at 50% 40%, rgba(250, 212, 0, 0.06) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 80% 70%, rgba(234, 179, 8, 0.04) 0%, transparent 60%)
          `,
                } }), (0, jsx_runtime_1.jsx)("div", { style: { position: 'absolute', inset: 0, overflow: 'hidden' }, children: [0, 1, 2].map((i) => ((0, jsx_runtime_1.jsx)("div", { style: {
                        position: 'absolute',
                        left: '8%',
                        right: '8%',
                        top: `${60 + i * 40}%`,
                        height: 1.5,
                        background: `linear-gradient(90deg, transparent 0%, ${C.tadYellow}${Math.round(pathOpacity * 60).toString(16).padStart(2, '0')} 50%, transparent 100%)`,
                    } }, i))) }), (0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    top: '61%',
                    left: `${dotX}%`,
                    transform: `translate(-50%, -50%) scale(${dotPulse})`,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: C.tadYellow,
                    boxShadow: `0 0 24px ${C.tadYellowGlow}`,
                    zIndex: 2,
                } }), (0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    top: '61%',
                    left: `${dotX}%`,
                    transform: `translate(-50%, -50%) scale(${beaconScale})`,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: `1.5px solid ${C.tadYellow}`,
                    opacity: beaconOpacity,
                    zIndex: 1,
                } }), (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: { justifyContent: 'center', alignItems: 'center', padding: '0 100px' }, children: (0, jsx_runtime_1.jsx)("div", { style: { transform: `translateY(${slideY}px)`, textAlign: 'center' }, children: (0, jsx_runtime_1.jsxs)("h1", { style: {
                            fontFamily: FONT,
                            fontSize: 54,
                            fontWeight: 700,
                            color: C.textPrimary,
                            lineHeight: 1.3,
                            margin: 0,
                            letterSpacing: '-0.5px',
                        }, children: ["\u00BFC\u00F3mo llegar a tu audiencia", ' ', (0, jsx_runtime_1.jsx)("span", { style: { color: C.tadYellow }, children: "mientras se mueve por la ciudad" }), "?"] }) }) })] }));
};
// ─── Scene 2: The Solution (5s → 15s) ────────────────────
const SceneSolution = ({ frame }) => {
    const local = frame - S.solution.start;
    const opacity = useFadeRange(local, 0, 290, 300, 25);
    const slideY = useSlideUp(local, 10);
    const badgeDelay = useSlideUp(local, 30, { damping: 12, mass: 0.6, stiffness: 100 });
    // Tablet mockup floating animation
    const tabletFloatY = (0, remotion_1.spring)({
        frame: local,
        fps: 30,
        from: 0,
        to: -8,
        config: { damping: 6, mass: 1.5 },
    });
    const tabletFloatX = (0, remotion_1.spring)({
        frame: (local + 20) % 80,
        fps: 30,
        from: -4,
        to: 4,
        config: { damping: 5, mass: 2 },
    });
    // Screen glow pulse
    const screenPulse = (0, remotion_1.interpolate)(local % 50, [0, 25, 50], [1, 1.03, 1]);
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { backgroundColor: C.bg, opacity }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `
            radial-gradient(ellipse 50% 60% at 30% 50%, rgba(250, 212, 0, 0.05) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 70% 50%, rgba(234, 179, 8, 0.03) 0%, transparent 50%)
          `,
                } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    padding: '0 80px',
                    gap: 60,
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                            transform: `translate(${tabletFloatX}px, ${tabletFloatY}px)`,
                            flexShrink: 0,
                        }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                width: 280,
                                height: 380,
                                borderRadius: 28,
                                background: 'rgba(15, 23, 42, 0.8)',
                                backdropFilter: 'blur(12px)',
                                border: `1.5px solid ${C.glassBorderStrong}`,
                                boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 40px ${C.tadYellowGlow}`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 20,
                                position: 'relative',
                                overflow: 'hidden',
                            }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 16,
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    transform: `scale(${screenPulse})`,
                                }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                            width: '80%',
                                            height: 100,
                                            borderRadius: 12,
                                            background: `linear-gradient(135deg, ${C.tadYellow}30, ${C.tadYellow}10)`,
                                            border: `1px solid ${C.tadYellow}40`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: C.tadYellow,
                                            fontSize: 13,
                                            fontWeight: 600,
                                        }, children: "AD SLOT" }), (0, jsx_runtime_1.jsx)("div", { style: { width: '70%', height: 4, borderRadius: 2, background: C.glassBgStrong } }), (0, jsx_runtime_1.jsx)("div", { style: { width: '50%', height: 4, borderRadius: 2, background: C.glassBgStrong } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                            position: 'absolute',
                                            bottom: 16,
                                            left: 20,
                                            right: 20,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: 10,
                                            color: C.textDim,
                                        }, children: [(0, jsx_runtime_1.jsx)("span", { children: "\u25CF\u25CF\u25CF\u25CF\u25CF" }), (0, jsx_runtime_1.jsx)("span", { children: "12:30" })] })] }) }) }), (0, jsx_runtime_1.jsxs)("div", { style: {
                            transform: `translateY(${slideY}px)`,
                            opacity,
                            maxWidth: 550,
                        }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                                    fontFamily: FONT,
                                    fontSize: 46,
                                    fontWeight: 800,
                                    color: C.tadYellow,
                                    margin: '0 0 8px 0',
                                    letterSpacing: '-1px',
                                    lineHeight: 1.1,
                                }, children: "TAD DOOH Platform" }), (0, jsx_runtime_1.jsx)("h2", { style: {
                                    fontFamily: FONT,
                                    fontSize: 22,
                                    fontWeight: 400,
                                    color: C.textSecondary,
                                    margin: '0 0 24px 0',
                                }, children: "Publicidad Digital Premium en Taxis" }), (0, jsx_runtime_1.jsxs)("div", { style: { transform: `translateY(${badgeDelay > 0 ? 0 : badgeDelay}px)` }, children: [(0, jsx_runtime_1.jsx)(Badge, { text: "Audiencia Cautiva", icon: "\uD83C\uDFAF", delay: 0, frame: local, sceneStart: 0 }), (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)(Badge, { text: "15 Slots Exclusivos", icon: "\u2B50", delay: 20, frame: local, sceneStart: 0 }), (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)(Badge, { text: "30s de Impacto", icon: "\u26A1", delay: 40, frame: local, sceneStart: 0 }), (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)(Badge, { text: "Cobertura Nacional", icon: "\uD83C\uDF0E", delay: 60, frame: local, sceneStart: 0 })] })] })] })] }));
};
// ─── Scene 3: Interactivity & Pricing (15s → 25s) ───────
const SceneInteractive = ({ frame }) => {
    const local = frame - S.interactive.start;
    const opacity = useFadeRange(local, 0, 290, 300, 25);
    // QR code pulsing
    const qrScale = (0, remotion_1.spring)({
        frame: local,
        fps: 30,
        from: 0.6,
        to: 1,
        config: { damping: 10, mass: 0.8 },
    });
    const qrGlow = (0, remotion_1.interpolate)(local % 40, [0, 20, 40], [0.3, 0.7, 0.3]);
    // Phone sliding in from right
    const phoneX = (0, remotion_1.spring)({
        frame: local - 20,
        fps: 30,
        from: 200,
        to: 0,
        config: { damping: 14, mass: 0.7 },
    });
    const phoneOpacity = (0, remotion_1.interpolate)(local, [20, 45], [0, 1], { extrapolateLeft: 'clamp' });
    // Nexus profile buttons stagger
    const btn1Y = (0, remotion_1.spring)({ frame: local - 50, fps: 30, from: 40, to: 0, config: { damping: 12, mass: 0.5 } });
    const btn2Y = (0, remotion_1.spring)({ frame: local - 65, fps: 30, from: 40, to: 0, config: { damping: 12, mass: 0.5 } });
    const btn3Y = (0, remotion_1.spring)({ frame: local - 80, fps: 30, from: 40, to: 0, config: { damping: 12, mass: 0.5 } });
    // Pricing card
    const priceScale = (0, remotion_1.spring)({
        frame: local - 100,
        fps: 30,
        from: 0.8,
        to: 1,
        config: { damping: 12, mass: 0.6 },
    });
    // Scanning beam animation
    const beamY = (0, remotion_1.interpolate)(local % 80, [0, 40, 80], [-60, 200, -60]);
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { backgroundColor: C.bg, opacity }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `
            radial-gradient(ellipse 50% 60% at 50% 40%, rgba(250, 212, 0, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 20% 80%, rgba(234, 179, 8, 0.03) 0%, transparent 50%)
          `,
                } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    padding: '0 80px',
                    gap: 50,
                }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', width: 300, height: 400, flexShrink: 0 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                    position: 'absolute',
                                    left: 10,
                                    top: 80,
                                    width: 130,
                                    height: 130,
                                    borderRadius: 16,
                                    background: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transform: `scale(${qrScale})`,
                                    boxShadow: `0 0 40px rgba(250, 212, 0, ${qrGlow})`,
                                }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                        width: 100,
                                        height: 100,
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                        gridTemplateRows: 'repeat(7, 1fr)',
                                        gap: 3,
                                    }, children: Array.from({ length: 49 }, (_, i) => {
                                        const row = Math.floor(i / 7);
                                        const col = i % 7;
                                        const isBlack = (row < 3 && col < 3) ||
                                            (row < 3 && col > 3) ||
                                            (row > 3 && col < 3) ||
                                            (row >= 3 && col >= 3 && (row + col) % 2 === 0);
                                        return ((0, jsx_runtime_1.jsx)("div", { style: {
                                                background: isBlack ? '#111' : 'transparent',
                                                borderRadius: 2,
                                            } }, i));
                                    }) }) }), (0, jsx_runtime_1.jsx)("div", { style: {
                                    position: 'absolute',
                                    left: 10,
                                    width: 130,
                                    height: 3,
                                    background: `linear-gradient(90deg, transparent, ${C.tadYellow}, transparent)`,
                                    top: 80 + beamY,
                                    opacity: 0.7,
                                    filter: 'blur(1px)',
                                } }), (0, jsx_runtime_1.jsx)("div", { style: {
                                    position: 'absolute',
                                    left: 120,
                                    top: 140,
                                    width: 50,
                                    height: 2,
                                    background: `linear-gradient(90deg, ${C.tadYellow}80, transparent)`,
                                    transform: 'rotate(15deg)',
                                    opacity: phoneOpacity,
                                } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                    position: 'absolute',
                                    right: 0,
                                    top: 50,
                                    width: 160,
                                    height: 300,
                                    borderRadius: 24,
                                    background: 'rgba(15, 23, 42, 0.85)',
                                    backdropFilter: 'blur(12px)',
                                    border: `1.5px solid ${C.glassBorder}`,
                                    transform: `translateX(${phoneX}px)`,
                                    opacity: phoneOpacity,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '40px 16px 16px',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                                }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                            position: 'absolute',
                                            top: 12,
                                            width: 50,
                                            height: 6,
                                            borderRadius: 3,
                                            background: C.glassBgStrong,
                                        } }), (0, jsx_runtime_1.jsx)("span", { style: {
                                            color: C.tadYellow,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            marginBottom: 16,
                                        }, children: "Perfil Nexus" }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                            width: '100%',
                                            alignItems: 'center',
                                        }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                    width: '90%',
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    background: '#25D366',
                                                    color: 'white',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    textAlign: 'center',
                                                    transform: `translateY(${btn1Y}px)`,
                                                }, children: "WhatsApp" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                    width: '90%',
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    background: '#6366f1',
                                                    color: 'white',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    textAlign: 'center',
                                                    transform: `translateY(${btn2Y}px)`,
                                                }, children: "Men\u00FA Digital" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                    width: '90%',
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    background: '#ea580c',
                                                    color: 'white',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    textAlign: 'center',
                                                    transform: `translateY(${btn3Y}px)`,
                                                }, children: "UberEats" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { maxWidth: 520 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { opacity, transform: `translateY(${useSlideUp(local, 5)}px)` }, children: [(0, jsx_runtime_1.jsx)("h2", { style: {
                                            fontFamily: FONT,
                                            fontSize: 26,
                                            fontWeight: 600,
                                            color: C.textPrimary,
                                            margin: '0 0 8px 0',
                                        }, children: "Convierte vistas en ventas" }), (0, jsx_runtime_1.jsxs)("p", { style: {
                                            fontFamily: FONT,
                                            fontSize: 18,
                                            fontWeight: 400,
                                            color: C.textSecondary,
                                            margin: '0 0 20px 0',
                                            lineHeight: 1.5,
                                        }, children: ["Con c\u00F3digos QR din\u00E1micos que conectan a tus clientes con", ' ', (0, jsx_runtime_1.jsx)("span", { style: { color: C.tadYellow }, children: "experiencias interactivas" }), " en tiempo real."] })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                    transform: `scale(${priceScale})`,
                                    opacity: (0, remotion_1.interpolate)(local, [100, 130], [0, 1], { extrapolateLeft: 'clamp' }),
                                }, children: (0, jsx_runtime_1.jsxs)(GlassCard, { style: {
                                        border: `1px solid ${C.glassBorderStrong}`,
                                        boxShadow: `0 0 30px ${C.tadYellowGlow}`,
                                        textAlign: 'center',
                                    }, children: [(0, jsx_runtime_1.jsx)("p", { style: {
                                                fontFamily: FONT,
                                                fontSize: 14,
                                                color: C.textDim,
                                                margin: 0,
                                                textTransform: 'uppercase',
                                                letterSpacing: 2,
                                            }, children: "Campa\u00F1as desde" }), (0, jsx_runtime_1.jsxs)("p", { style: {
                                                fontFamily: FONT,
                                                fontSize: 42,
                                                fontWeight: 800,
                                                color: C.tadYellow,
                                                margin: '4px 0',
                                                letterSpacing: '-1px',
                                            }, children: ["RD$1,500", (0, jsx_runtime_1.jsx)("span", { style: {
                                                        fontSize: 18,
                                                        fontWeight: 400,
                                                        color: C.textSecondary,
                                                    }, children: "/mes" })] }), (0, jsx_runtime_1.jsx)("p", { style: {
                                                fontFamily: FONT,
                                                fontSize: 13,
                                                color: C.textSecondary,
                                                margin: 0,
                                            }, children: "Sin contratos largos \u00B7 Resultados medibles" })] }) })] })] })] }));
};
// ─── Scene 4: Call to Action (25s → 30s) ─────────────────
const SceneCTA = ({ frame }) => {
    const local = frame - S.cta.start;
    const opacity = useFadeRange(local, 0, 150, 150, 30);
    const slideY = useSlideUp(local, 0, { damping: 20, mass: 0.5, stiffness: 120 });
    const subOpacity = (0, remotion_1.interpolate)(local, [15, 35], [0, 1], { extrapolateLeft: 'clamp' });
    // Pulse rings
    const ring1Scale = (0, remotion_1.spring)({ frame: local, fps: 30, from: 1, to: 2.5, config: { damping: 4, mass: 2 } });
    const ring1Opacity = (0, remotion_1.interpolate)(local, [0, 60, 150], [0.5, 0, 0], { extrapolateLeft: 'clamp' });
    const ring2Scale = (0, remotion_1.spring)({ frame: local - 20, fps: 30, from: 1, to: 2.5, config: { damping: 4, mass: 2 } });
    const ring2Opacity = (0, remotion_1.interpolate)(local, [20, 80, 150], [0.4, 0, 0], { extrapolateLeft: 'clamp' });
    // Logo glow
    const logoGlow = (0, remotion_1.interpolate)(local % 40, [0, 20, 40], [0.6, 1, 0.6]);
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: { backgroundColor: C.bgDark, opacity }, children: [(0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    background: `
            radial-gradient(ellipse 50% 50% at 50% 50%, rgba(250, 212, 0, 0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 50% 80%, rgba(234, 179, 8, 0.04) 0%, transparent 50%)
          `,
                } }), (0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                    position: 'absolute',
                                    width: 180,
                                    height: 180,
                                    borderRadius: '50%',
                                    border: `2px solid ${C.tadYellow}`,
                                    opacity: ring1Opacity,
                                    transform: `scale(${ring1Scale})`,
                                } }), (0, jsx_runtime_1.jsx)("div", { style: {
                                    position: 'absolute',
                                    width: 180,
                                    height: 180,
                                    borderRadius: '50%',
                                    border: `1.5px solid ${C.tadYellow}`,
                                    opacity: ring2Opacity,
                                    transform: `scale(${ring2Scale})`,
                                } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                    transform: `translateY(${slideY}px) scale(${logoGlow * 0.15 + 0.85})`,
                                    opacity,
                                    zIndex: 2,
                                    textAlign: 'center',
                                }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                                            fontFamily: FONT,
                                            fontSize: 80,
                                            fontWeight: 900,
                                            color: C.tadYellow,
                                            margin: 0,
                                            letterSpacing: '-3px',
                                            textShadow: `0 0 40px ${C.tadYellowGlow}`,
                                            lineHeight: 1,
                                        }, children: "TAD" }), (0, jsx_runtime_1.jsx)("p", { style: {
                                            fontFamily: FONT,
                                            fontSize: 14,
                                            color: C.textDim,
                                            letterSpacing: 6,
                                            textTransform: 'uppercase',
                                            marginTop: 8,
                                        }, children: "DOOH PLATFORM" })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                            opacity: subOpacity,
                            transform: `translateY(${(0, remotion_1.spring)({ frame: local - 15, fps: 30, from: 30, to: 0, config: { damping: 14, mass: 0.6 } })}px)`,
                            textAlign: 'center',
                            marginTop: 60,
                        }, children: [(0, jsx_runtime_1.jsxs)("p", { style: {
                                    fontFamily: FONT,
                                    fontSize: 24,
                                    fontWeight: 500,
                                    color: C.textPrimary,
                                    margin: 0,
                                    letterSpacing: '-0.3px',
                                }, children: ["\u00DAnete a la red.", ' ', (0, jsx_runtime_1.jsx)("span", { style: { color: C.tadYellow }, children: "Escanea y Conecta." })] }), (0, jsx_runtime_1.jsx)("p", { style: {
                                    fontFamily: FONT,
                                    fontSize: 14,
                                    color: C.textDim,
                                    marginTop: 12,
                                    letterSpacing: 1,
                                }, children: "tad.do \u2014 Rep\u00FAblica Dominicana" })] })] })] }));
};
// ─── Main Composition ────────────────────────────────────
const TadPromoVideo = () => {
    const frame = (0, remotion_1.useCurrentFrame)();
    return ((0, jsx_runtime_1.jsxs)(remotion_1.AbsoluteFill, { style: {
            backgroundColor: C.bgDark,
            fontFamily: FONT,
        }, children: [(0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: S.hook.start, durationInFrames: S.hook.end - S.hook.start, children: (0, jsx_runtime_1.jsx)(SceneHook, { frame: frame }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: S.solution.start, durationInFrames: S.solution.end - S.solution.start, children: (0, jsx_runtime_1.jsx)(SceneSolution, { frame: frame }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: S.interactive.start, durationInFrames: S.interactive.end - S.interactive.start, children: (0, jsx_runtime_1.jsx)(SceneInteractive, { frame: frame }) }), (0, jsx_runtime_1.jsx)(remotion_1.Sequence, { from: S.cta.start, durationInFrames: S.cta.end - S.cta.start, children: (0, jsx_runtime_1.jsx)(SceneCTA, { frame: frame }) })] }));
};
exports.TadPromoVideo = TadPromoVideo;
//# sourceMappingURL=tad-promo.js.map