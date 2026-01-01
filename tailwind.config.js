/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Void/space colors
        void: {
          900: '#0a0a0f',
          950: '#050508',
        },
        // Steel/metal UI
        steel: {
          darker: '#151520',
          dark: '#1a1a24',
          DEFAULT: '#2a2a3a',
          light: '#8a9baa',
          bright: '#c4d4e4',
        },
        // Faction colors
        continuity: '#4a7c9b',
        ascendant: '#c4a35a',
        collective: '#9b4a4a',
        reclaimers: '#4a9b6b',
        // Accent colors
        primary: '#4a9bbb',
        accent: '#9b7bd9',
        warning: '#c4a855',
        danger: '#c45555',
        success: '#55a870',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'scan-line': 'scanLine 8s linear infinite',
        'hex-pulse': 'hexPulse 2s ease-in-out infinite',
        'flicker': 'flicker 0.15s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scanLine: {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        hexPulse: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.2)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(138, 155, 170, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(138, 155, 170, 0.6)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(138, 155, 170, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(138, 155, 170, 0.03) 1px, transparent 1px)',
        'radial-glow': 'radial-gradient(ellipse at center, rgba(138, 155, 170, 0.1) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(138, 155, 170, 0.2)',
        'glow-md': '0 0 20px rgba(138, 155, 170, 0.3)',
        'glow-lg': '0 0 40px rgba(138, 155, 170, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(138, 155, 170, 0.1)',
      },
    },
  },
  plugins: [],
}
