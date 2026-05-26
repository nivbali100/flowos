/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        status: {
          green:      '#22c55e',
          yellow:     '#eab308',
          red:        '#ef4444',
          greenBg:    '#f0fdf4',
          yellowBg:   '#fefce8',
          redBg:      '#fef2f2',
          greenText:  '#15803d',
          yellowText: '#854d0e',
          redText:    '#b91c1c',
        },
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c3d3fe',
          300: '#a5b8fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#1e1b4b',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card:         '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.1)',
        'glow-brand': '0 0 0 3px rgb(99 102 241 / 0.15), 0 4px 16px rgb(99 102 241 / 0.12)',
        'glow-purple':'0 0 0 3px rgb(168 85 247 / 0.15), 0 4px 16px rgb(168 85 247 / 0.12)',
        'glow-green': '0 0 0 3px rgb(34 197 94 / 0.2),  0 2px 8px  rgb(34 197 94 / 0.15)',
      },
      animation: {
        'glow-pulse':      'glowPulse 2.5s ease-in-out infinite',
        'doing-ring':      'doingRing 1.8s ease-in-out infinite',
        'complete-flash':  'completeFlash 320ms ease-out forwards',
        'card-exit':       'cardExit 350ms cubic-bezier(0.4,0,0.6,1) forwards',
        'slide-up':        'slideUp 220ms ease-out',
        'bounce-in':       'bounceIn 300ms cubic-bezier(0.34,1.56,0.64,1)',
        'ping-slow':       'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'progress':        'progress 2s linear forwards',
      },
      keyframes: {
        progress: {
          '0%':   { width: '0%' },
          '100%': { width: '100%' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(99 102 241 / 0.25), 0 2px 8px rgb(99 102 241 / 0.08)' },
          '50%':      { boxShadow: '0 0 0 5px rgb(99 102 241 / 0),   0 4px 16px rgb(99 102 241 / 0.15)' },
        },
        doingRing: {
          '0%, 100%': { boxShadow: '0 0 0 2px rgb(168 85 247 / 0.35), 0 2px 8px rgb(168 85 247 / 0.1)' },
          '50%':      { boxShadow: '0 0 0 6px rgb(168 85 247 / 0),    0 4px 14px rgb(168 85 247 / 0.18)' },
        },
        completeFlash: {
          '0%':   { backgroundColor: 'white', transform: 'scale(1)' },
          '40%':  { backgroundColor: 'rgb(240 253 244)', transform: 'scale(1.02)' },
          '100%': { backgroundColor: 'white', transform: 'scale(1)' },
        },
        cardExit: {
          '0%':   { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.9) translateY(-4px)', maxHeight: '0', marginBottom: '0', paddingTop: '0', paddingBottom: '0' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%':   { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
