"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSceneMotion = useSceneMotion;
const remotion_1 = require("remotion");
const EASE_OUT = remotion_1.Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT = remotion_1.Easing.bezier(0.7, 0, 0.84, 0);
const EASE_IN = remotion_1.Easing.bezier(0.7, 0, 0.84, 0);
const ENTRANCE_DUR = 18;
const EXIT_DUR = 18;
function easeFor(preset) {
    if (preset === 'ease-in')
        return EASE_IN;
    if (preset === 'ease-in-out')
        return EASE_IN_OUT;
    return EASE_OUT;
}
function useSceneMotion(localFrame, durationFrames, profile) {
    const entrancePreset = profile?.entrance ?? 'fade-in-up';
    const exitPreset = profile?.exit ?? 'fade-out';
    const sustainPreset = profile?.sustain ?? 'float';
    const timingPreset = profile?.timing ?? 'scene';
    // Timing modes: snap => fast (12f), reveal => mid (18f), cinematic => slow (24f)
    const dur = timingPreset === 'snap' ? 12
        : timingPreset === 'reveal' ? 16
            : timingPreset === 'cinematic' ? 24
                : timingPreset === 'data' ? 20
                    : timingPreset === 'message' ? 22
                        : 18;
    const entranceEnd = Math.min(dur, Math.max(dur, 0));
    const entranceProgress = (0, remotion_1.interpolate)(localFrame, [0, entranceEnd], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: easeFor(),
    });
    const exitStart = Math.max(durationFrames - EXIT_DUR, entranceEnd);
    const exitProgress = (0, remotion_1.interpolate)(localFrame, [exitStart, Math.max(exitStart + EXIT_DUR, durationFrames)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeFor('ease-in-out') });
    let opacity = 1 - exitProgress;
    if (entrancePreset === 'fade-out' || entrancePreset === 'fade-in-up') {
        opacity = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            * (1 - exitProgress);
    }
    let translateY = 0;
    let translateX = 0;
    let scale = 1;
    let rotate = 0;
    let blur = 0;
    let glow = 1;
    // Entrance translations
    switch (entrancePreset) {
        case 'fade-in-up':
            translateY = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
            blur = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            break;
        case 'scale-spring':
        case 'zoom-in-spring':
            scale = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [0.85, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
            blur = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            break;
        case 'slide-in-right':
            translateX = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
            break;
        case 'slide-in-left':
            translateX = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [-60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
            break;
        case 'blur-reveal':
            blur = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            break;
        case 'count-up':
            translateY = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
            break;
        case 'mask-reveal':
            translateY = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            break;
        case 'spring-enter':
            scale = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [0.92, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
            blur = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            break;
        default:
            translateY = (0, remotion_1.interpolate)(entranceProgress, [0, 1], [28, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
            break;
    }
    // Sustain: pulsing / floating
    if (sustainPreset === 'float') {
        const phase = (localFrame / 60) * Math.PI * 2;
        translateY += Math.sin(phase) * 4;
        scale *= 1 + Math.sin(phase) * 0.005;
    }
    else if (sustainPreset === 'pulse-glow') {
        const phase = (localFrame / 30) * Math.PI;
        glow = 1 + Math.sin(phase) * 0.18;
        scale *= 1 + Math.sin(phase) * 0.012;
    }
    else if (sustainPreset === 'parallax-y') {
        translateY -= (localFrame / durationFrames) * 12;
    }
    else if (sustainPreset === 'tilt') {
        rotate = Math.sin(localFrame / 20) * 0.8;
    }
    else if (sustainPreset === 'drift') {
        translateX = Math.sin(localFrame / 40) * 3;
    }
    // Exit transforms
    switch (exitPreset) {
        case 'slide-out-left':
            translateX -= (0, remotion_1.interpolate)(exitProgress, [0, 1], [0, 80], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IN_OUT });
            break;
        case 'scale-out':
            scale *= (0, remotion_1.interpolate)(exitProgress, [0, 1], [1, 0.92], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IN_OUT });
            break;
        case 'mask-scale':
            scale *= (0, remotion_1.interpolate)(exitProgress, [0, 1], [1, 1.04], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IN_OUT });
            opacity *= 1 - exitProgress;
            break;
        case 'mask-fade':
            translateY -= (0, remotion_1.interpolate)(exitProgress, [0, 1], [0, -20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            break;
        case 'fade-out':
        default:
            opacity *= 1 - exitProgress;
            break;
    }
    if (entranceProgress < 1) {
        opacity = Math.min(opacity, entranceProgress);
    }
    if (exitProgress > 0) {
        opacity *= 1 - exitProgress;
    }
    if (opacity < 0)
        opacity = 0;
    if (opacity > 1)
        opacity = 1;
    return {
        entrance: entranceProgress,
        exit: exitProgress,
        opacity,
        translateX,
        translateY,
        scale,
        rotate,
        blur,
        glow,
    };
}
exports.default = useSceneMotion;
//# sourceMappingURL=use-scene-motion.js.map