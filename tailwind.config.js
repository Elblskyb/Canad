/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg)',
        card: 'var(--card)',
        card2: 'var(--card2)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        accent: '#10B981',
        teal2: '#0D9488',
        bronze: '#C89B54',
        danger: '#E5484D',
      },
      fontFamily: {
        amiri: ['Amiri', 'serif'],
        plex: ['"IBM Plex Sans Arabic"', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.25)',
        lift: '0 14px 44px rgba(0,0,0,0.35)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        scanPulse: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.45)' },
          '50%': { boxShadow: '0 0 0 14px rgba(16,185,129,0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease both',
        pop: 'pop .22s ease both',
        scanPulse: 'scanPulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
