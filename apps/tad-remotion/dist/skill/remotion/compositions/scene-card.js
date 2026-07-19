"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneCard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const TadHook_1 = require("../components/TadHook");
const KineticText_1 = require("../components/KineticText");
const CounterAnim_1 = require("../components/CounterAnim");
const AcidAndGlowCard_1 = require("../components/AcidAndGlowCard");
const use_scene_motion_1 = require("./use-scene-motion");
const FONT_FAMILY = "'Inter', 'Outfit', -apple-system, sans-serif";
const SceneCard = ({ scene, index, frame, fps }) => {
    const startFrame = Math.round((scene.startSec ?? index * 5) * fps);
    const durationFrames = Math.max(Math.round((scene.durationSec ?? 4) * fps), Math.round(fps));
    const local = Math.max(0, frame - startFrame);
    const clampedLocal = Math.min(local, durationFrames);
    const m = (0, use_scene_motion_1.useSceneMotion)(clampedLocal, durationFrames, scene.motionProfile);
    const transform = `translateY(${m.translateY}px) translateX(${m.translateX}px) scale(${m.scale}) rotate(${m.rotate}deg)`;
    const filter = m.blur > 0.1 ? `blur(${m.blur.toFixed(2)}px)` : undefined;
    const transitionStyle = {
        transform,
        WebkitFilter: filter,
        filter,
        opacity: m.opacity,
    };
    const { component, props } = (scene.motionProfile ?? {});
    const normalizedProps = { ...(props ?? {}), accentColor: scene.accentColor };
    const wrap = (children, maxW = 1200) => ((0, jsx_runtime_1.jsx)("div", { style: { maxWidth: maxW, width: '100%', ...transitionStyle }, children: children }));
    if (component === 'TadHook') {
        return ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { name: `scene-${index}`, from: startFrame, durationInFrames: durationFrames, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 80px',
                    backgroundColor: '#030303',
                    pointerEvents: 'none',
                }, children: wrap((0, jsx_runtime_1.jsx)(TadHook_1.TadHook, { ...normalizedProps, durationInFrames: durationFrames })) }) }));
    }
    if (component === 'KineticText') {
        return ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { name: `scene-${index}`, from: startFrame, durationInFrames: durationFrames, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 80px',
                    backgroundColor: '#030303',
                    pointerEvents: 'none',
                }, children: wrap((0, jsx_runtime_1.jsx)(KineticText_1.KineticText, { ...normalizedProps, text: scene.onScreenText })) }) }));
    }
    if (component === 'CounterAnim') {
        return ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { name: `scene-${index}`, from: startFrame, durationInFrames: durationFrames, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#030303',
                    pointerEvents: 'none',
                }, children: wrap((0, jsx_runtime_1.jsx)(CounterAnim_1.CounterAnim, { ...normalizedProps, color: scene.accentColor })) }) }));
    }
    if (component === 'GlowCard' || component === 'AcidAndGlowCard') {
        return ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { name: `scene-${index}`, from: startFrame, durationInFrames: durationFrames, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 80px',
                    backgroundColor: '#030303',
                    pointerEvents: 'none',
                }, children: wrap((0, jsx_runtime_1.jsx)("div", { style: { filter: m.glow > 1.001 ? `brightness(${m.glow.toFixed(3)})` : undefined }, children: (0, jsx_runtime_1.jsx)(AcidAndGlowCard_1.GlowCard, { ...normalizedProps }) })) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(remotion_1.Sequence, { name: `scene-${index}`, from: startFrame, durationInFrames: durationFrames, children: (0, jsx_runtime_1.jsx)(remotion_1.AbsoluteFill, { style: {
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 80px',
                backgroundColor: '#030303',
                pointerEvents: 'none',
            }, children: wrap((0, jsx_runtime_1.jsxs)("div", { style: {
                    textAlign: 'center',
                    fontFamily: FONT_FAMILY,
                }, children: [scene.onScreenText ? ((0, jsx_runtime_1.jsx)("h3", { style: {
                            fontSize: 56,
                            fontWeight: 700,
                            color: '#ffffff',
                            lineHeight: 1.15,
                            margin: 0,
                            letterSpacing: '-1px',
                            textWrap: 'balance',
                        }, children: scene.onScreenText })) : null, scene.visualDescription ? ((0, jsx_runtime_1.jsx)("p", { style: {
                            marginTop: 28,
                            fontSize: 24,
                            fontWeight: 400,
                            color: '#cbd5e1',
                            lineHeight: 1.35,
                            textWrap: 'pretty',
                        }, children: scene.visualDescription })) : null] })) }) }));
};
exports.SceneCard = SceneCard;
exports.default = exports.SceneCard;
//# sourceMappingURL=scene-card.js.map