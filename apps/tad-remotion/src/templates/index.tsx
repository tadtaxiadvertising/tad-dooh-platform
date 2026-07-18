import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { DynamicAdTemplate } from './dynamic-ad';
import { TadPromoVideo } from './tad-promo';

const fps = 30;

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition
        id="DynamicAd"
        component={DynamicAdTemplate}
        durationInFrames={300}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{
          logoUrl: '',
          brandColor: '#e51636',
          primaryText: 'MI OFERTA TAD',
          secondaryText: 'Contacto: tadtaxi.com',
        }}
      />
      <Composition
        id="TADPromoVideo"
        component={TadPromoVideo}
        durationInFrames={900}
        fps={fps}
        width={1920}
        height={1080}
      />
    </>
  );
};

registerRoot(RemotionVideo);