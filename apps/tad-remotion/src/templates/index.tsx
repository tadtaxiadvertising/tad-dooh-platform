import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { DynamicAdTemplate } from './dynamic-ad';

const fps = 30;
const durationInSeconds = 10;

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition
        id="DynamicAd"
        component={DynamicAdTemplate}
        durationInFrames={Math.round(fps * durationInSeconds)}
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
    </>
  );
};

registerRoot(RemotionVideo);