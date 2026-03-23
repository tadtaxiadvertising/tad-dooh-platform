import React from 'react';

export function TADLogo({
  className = "h-16",
  showText = true,
  textColor = "text-white"
}: {
  className?: string;
  showText?: boolean;
  textColor?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className} select-none`}>
      {/* 
        TAD Logo SVG
        Basado fuertemente en el branding representativo: 
        Tablet en movimiento, estilo "Speed/Motion", con la flecha Play dorada, 
        y elementos vectoriales sólidos.
      */}
      <svg 
        viewBox="0 0 140 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto text-tad-yellow drop-shadow-xl drop-shadow-tad-yellow/20"
      >
        <g stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          {/* Main Tablet Body - Sideways U shape */}
          <path d="M 55 12 H 115 A 12 12 0 0 1 127 24 V 56 A 12 12 0 0 1 115 68 H 55" />
          
          {/* Top Left cut */}
          <path d="M 40 12 H 44" />
          
          {/* Left Speed Lines penetrating the body */}
          {/* Line 2 (Longest) */}
          <path d="M 12 30 H 55" />
          <path d="M 32 30 H 34" />
          
          {/* Line 3 (Middle Bottom) */}
          <path d="M 22 45 H 55" />
          <path d="M 8 45 H 10" />

          {/* Bottom Left cut */}
          <path d="M 35 68 H 44" />
          
          {/* Independent speed bursts outside */}
          <path d="M 4 21 H 16" />
          <path d="M 28 58 H 10" />
        </g>
        
        {/* Play Button - Solid Center */}
        <polygon points="62,28 62,52 82,40" fill="currentColor" className="drop-shadow-sm" />
        
        {/* Home/Camera Button Hole Dot */}
        <circle cx="115" cy="40" r="4.5" fill="white" />
      </svg>

      {/* Typography Block */}
      {showText && (
        <div className="flex flex-col justify-center">
          <span className={`text-[2.5rem] font-black leading-none tracking-widest ${textColor} drop-shadow-md`}>
            TAD
          </span>
          <span className={`text-[0.65rem] font-medium leading-[1rem] opacity-70 tracking-[0.2em] uppercase ${textColor} ml-1`}>
            Publicidad Digital en Taxis
          </span>
        </div>
      )}
    </div>
  );
}
