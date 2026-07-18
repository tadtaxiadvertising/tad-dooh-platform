"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotionVideo = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const dynamic_ad_1 = require("./dynamic-ad");
const fps = 30;
const durationInSeconds = 10;
const RemotionVideo = () => {
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(remotion_1.Composition, { id: "DynamicAd", component: dynamic_ad_1.DynamicAdTemplate, durationInFrames: Math.round(fps * durationInSeconds), fps: fps, width: 1080, height: 1920, defaultProps: {
                logoUrl: '',
                brandColor: '#e51636',
                primaryText: 'MI OFERTA TAD',
                secondaryText: 'Contacto: tadtaxi.com',
            } }) }));
};
exports.RemotionVideo = RemotionVideo;
(0, remotion_1.registerRoot)(exports.RemotionVideo);
//# sourceMappingURL=index.js.map