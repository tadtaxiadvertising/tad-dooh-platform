"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotionVideo = void 0;
const react_1 = require("react");
const remotion_1 = require("remotion");
const dynamic_ad_1 = require("./dynamic-ad");
const remotion_2 = require("remotion");
const RemotionVideo = () => {
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(remotion_2.Composition, { id: "DynamicAd", component: dynamic_ad_1.DynamicAdTemplate, durationInFrames: 300, fps: 30, width: 1080, height: 1920, defaultProps: {
                logoUrl: '',
                brandColor: '#e51636',
                primaryText: 'MI OFERTA TAD',
                secondaryText: 'Contacto: tadtaxi.com',
            } })));
};
exports.RemotionVideo = RemotionVideo;
(0, remotion_1.registerRoot)(exports.RemotionVideo);
//# sourceMappingURL=index.js.map