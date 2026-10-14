import React from "react";

export interface DynamicAdProps {
  logoUrl: string;
  brandColor: string;
  bgUrl?: string;
  primaryText: string;
  secondaryText: string;
  [key: string]: any;
}

export const DynamicAdTemplate: React.FC<DynamicAdProps> = ({
  logoUrl,
  brandColor = "#e51636",
  primaryText = "¡OFERTA 2x1 SOLO POR HOY!",
  secondaryText = "Haz tu orden ahora",
}) => {
  return (
    <div
      style={{
        backgroundColor: "#0a0a0b",
        overflow: "hidden",
        background: `radial-gradient(circle at center, ${brandColor} 0%, #0a0a0b 100%)`,
        opacity: 0.4,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            transform: "scale(1)",
            background: "white",
            padding: "40px",
            borderRadius: "50px",
            boxShadow: `0px 20px 50px ${brandColor}80`,
            marginBottom: "40px",
          }}
        >
          {logoUrl && (
            <img
              src={logoUrl}
              style={{ width: "300px", height: "auto", objectFit: "contain" }}
            />
          )}
        </div>

        <div
          style={{
            transform: "translateY(0px)",
            opacity: 1,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "sans-serif",
              fontSize: "80px",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.1,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {primaryText}
          </h1>
          <p
            style={{
              fontFamily: "sans-serif",
              fontSize: "35px",
              fontWeight: 500,
              color: brandColor,
              marginTop: "20px",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: "10px 30px",
              borderRadius: "20px",
              display: "inline-block",
            }}
          >
            {secondaryText}
          </p>
        </div>
      </div>
    </div>
  );
};
