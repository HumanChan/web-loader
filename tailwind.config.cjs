/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/renderer/**/*.{ts,tsx,html}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0f1115',
        panel: '#0b0d12',
        card: '#0e121a',
        border: '#1e293b',
        accent: '#7c3aed',
        ring: '#22d3ee',
        muted: '#94a3b8',
      },
      borderRadius: {
        xl: '12px',
      },
    },
  },
  plugins: [],
};


