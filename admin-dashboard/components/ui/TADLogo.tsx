import React from 'react';
import clsx from 'clsx';

export function TADLogo({
  className = "h-12",
  showText = true,
  textColor = "text-white"
}: {
  className?: string;
  showText?: boolean;
  textColor?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-4 select-none", className)}>
      <svg 
        viewBox="0 0 160 100" 
        className="h-full w-auto text-tad-yellow drop-shadow-xl drop-shadow-tad-yellow/20"
      >
        <defs>
          <mask id="play-hole">
            <rect x="0" y="0" width="160" height="100" fill="white" />
            {/* Play Button Cutout (Black removes from mask) */}
            <polygon points="86,34 86,66 112,50" fill="black" stroke="black" strokeWidth="8" strokeLinejoin="round" />
          </mask>
        </defs>

        <g mask="url(#play-hole)" fill="currentColor">
          {/* Main Solid Body */}
          <rect x="55" y="16" width="90" height="68" rx="14" />
          
          {/* Speed / Motion Fingers on the left */}
          {/* Stroke linecap round naturally creates the rounded endings */}
          <g stroke="currentColor" strokeWidth="10" strokeLinecap="round">
            {/* Row 1 (Top) */}
            <line x1="42" y1="26" x2="65" y2="26" />
            
            {/* Row 2 (Dot + Dash) */}
            <line x1="22" y1="42" x2="30" y2="42" />
            <line x1="45" y1="42" x2="65" y2="42" />
            
            {/* Row 3 (Long Dash) */}
            <line x1="32" y1="58" x2="65" y2="58" />
            
            {/* Row 4 (Bottom) */}
            <line x1="42" y1="74" x2="65" y2="74" />
          </g>
        </g>
      </svg>

      {/* Typography Block */}
      {showText && (
         <div className="flex flex-col justify-center translate-y-[2px]">
          <span className={clsx("text-[2.6rem] font-black leading-none tracking-widest drop-shadow-md", textColor)}>
            TAD
          </span>
          <span className={clsx("text-[0.62rem] font-bold leading-[1rem] opacity-80 tracking-[0.22em] uppercase ml-1", textColor)}>
            Publicidad Digital en Taxis
          </span>
        </div>
      )}
    </div>
  );
}
