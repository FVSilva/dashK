/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#080808',
          secondary: '#0f0f0f',
          card: '#141414',
          elevated: '#1a1a1a',
          hover: '#1f1f1f',
        },
        brand: {
          red: '#E5173F',
          'red-dark': '#b01030',
          'red-light': '#ff3f60',
          'red-muted': '#7f0f22',
          'red-subtle': 'rgba(229, 23, 63, 0.12)',
          'red-border': 'rgba(229, 23, 63, 0.35)',
        },
        border: {
          default: '#1e1e1e',
          subtle: '#262626',
          strong: '#333333',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#8a8a8a',
          muted: '#555555',
          inverse: '#080808',
        },
        status: {
          won: '#22c55e',
          lost: '#6b7280',
          active: '#E5173F',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'red-gradient': 'linear-gradient(135deg, #E5173F 0%, #b01030 100%)',
        'card-gradient': 'linear-gradient(135deg, #141414 0%, #0f0f0f 100%)',
        'glow-red': 'radial-gradient(circle at center, rgba(229,23,63,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'red-glow': '0 0 30px rgba(229, 23, 63, 0.2)',
        'red-glow-sm': '0 0 15px rgba(229, 23, 63, 0.15)',
        card: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.7)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(229,23,63,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-red': 'pulseRed 2s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(229, 23, 63, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(229, 23, 63, 0)' },
        },
      },
    },
  },
  plugins: [],
};
