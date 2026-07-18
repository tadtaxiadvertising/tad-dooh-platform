"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// TAD REMOTION SKILL — Core Types
// Arquitectura limpia: tipos como contrato entre agentes especializados.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_CONFIG = void 0;
exports.PLATFORM_CONFIG = {
    tiktok: {
        ratio: '9:16',
        width: 1080,
        height: 1920,
        fps: 30,
        maxDurationSec: 60,
        optimalDurationSec: [15, 35],
        idealCutIntervalSec: [1.5, 3.5],
        textDensity: 'high',
    },
    instagram: {
        ratio: '9:16',
        width: 1080,
        height: 1920,
        fps: 30,
        maxDurationSec: 90,
        optimalDurationSec: [20, 45],
        idealCutIntervalSec: [2, 4],
        textDensity: 'medium',
    },
    facebook: {
        ratio: '9:16',
        width: 1080,
        height: 1920,
        fps: 30,
        maxDurationSec: 60,
        optimalDurationSec: [15, 35],
        idealCutIntervalSec: [2, 4],
        textDensity: 'medium',
    },
    linkedin: {
        ratio: '16:9',
        width: 1920,
        height: 1080,
        fps: 30,
        maxDurationSec: 120,
        optimalDurationSec: [40, 90],
        idealCutIntervalSec: [3, 6],
        textDensity: 'low',
    },
    youtube: {
        ratio: '16:9',
        width: 1920,
        height: 1080,
        fps: 30,
        maxDurationSec: 60,
        optimalDurationSec: [15, 35],
        idealCutIntervalSec: [2, 4],
        textDensity: 'medium',
    },
};
//# sourceMappingURL=index.js.map