import React from "react";
import { registerRoot } from "remotion";
import { DynamicAdTemplate } from "./dynamic-ad";
import { Composition } from "remotion";

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition
        id="DynamicAd"
        component={DynamicAdTemplate}
        durationInFrames={300} // 10 seconds at 30fps
        fps={30}
        width={1080}
        height={1920} // Vertical for tablets
        defaultProps={{
          logoUrl: "",
          brandColor: "#e51636",
          primaryText: "MI OFERTA TAD",
          secondaryText: "Contacto: tadtaxi.com",
        }}
      />
    </>
  );
};

registerRoot(RemotionVideo);
