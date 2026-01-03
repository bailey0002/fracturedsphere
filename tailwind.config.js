/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#0a0a0f',
          900: '#0f0f18',
          950: '#08080c',
        },
        steel: {
          DEFAULT: '#2a2a3a',
          light: '#8a9baa',
          bright: '#c5d0da',
        },
        continuity: '#4a7c9b',
        ascendant: '#c4a35a',
        collective: '#9b4a4a',
        reclaimers: '#4a9b6b',
        warning: '#c4a35a',
      },
      fontFamily: {
        display: ['Orbitron', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
