"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotionVideo = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const dynamic_ad_1 = require("./dynamic-ad");
const tad_promo_1 = require("./tad-promo");
const fps = 30;
const RemotionVideo = () => {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(remotion_1.Composition, { id: "DynamicAd", component: dynamic_ad_1.DynamicAdTemplate, durationInFrames: 300, fps: fps, width: 1080, height: 1920, defaultProps: {
                    logoUrl: '',
                    brandColor: '#e51636',
                    primaryText: 'MI OFERTA TAD',
                    secondaryText: 'Contacto: tadtaxi.com',
                } }), (0, jsx_runtime_1.jsx)(remotion_1.Composition, { id: "TADPromoVideo", component: tad_promo_1.TadPromoVideo, durationInFrames: 900, fps: fps, width: 1920, height: 1080 })] }));
};
exports.RemotionVideo = RemotionVideo;
(0, remotion_1.registerRoot)(exports.RemotionVideo);
//# sourceMappingURL=index.js.map