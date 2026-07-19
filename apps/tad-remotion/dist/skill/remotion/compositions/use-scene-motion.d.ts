import type { MotionSceneProfile } from '../../types';
type Motion = {
    entrance: number;
    exit: number;
    opacity: number;
    translateX: number;
    translateY: number;
    scale: number;
    rotate: number;
    blur: number;
    glow: number;
};
export declare function useSceneMotion(localFrame: number, durationFrames: number, profile?: MotionSceneProfile): Motion;
export default useSceneMotion;
//# sourceMappingURL=use-scene-motion.d.ts.map