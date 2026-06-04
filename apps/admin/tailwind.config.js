/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
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
        'tad-yellow': '#fad400',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};