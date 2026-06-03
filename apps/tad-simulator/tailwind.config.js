/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'tad-bg': '#0a0a0a',
        'tad-surface': 'rgba(255, 255, 255, 0.05)',
        'tad-accent': '#FFD400',
        'tad-accent-hover': '#e6be00',
        'tad-text': '#f0f0f0',
        'tad-text-muted': '#a0a0a0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin-slow 10s linear infinite',
        'scan': 'scan 3s ease-in-out infinite',
      },
      keyframes: {
        'spin-slow': {
          from: { transform: 'translate(-50%, -50%) rotate(0deg)' },
          to: { transform: 'translate(-50%, -50%) rotate(360deg)' },
        },
        scan: {
          '0%': { top: '0', opacity: '0' },
          '50%': { opacity: '0.5' },
          '100%': { top: '100%', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
