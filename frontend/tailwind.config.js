/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:    { DEFAULT: '#0A0F1E', 50: '#E8EAF0', 100: '#C5CAD9', 200: '#8895B3', 300: '#4B5980', 400: '#1E2B4F', 500: '#0A0F1E', 600: '#080C19', 700: '#060914', 800: '#04060E', 900: '#020309' },
        cyan:    { DEFAULT: '#00D4FF', 50: '#E0FAFF', 100: '#B3F3FF', 200: '#66E8FF', 300: '#1ADCFF', 400: '#00D4FF', 500: '#00BDE6', 600: '#009DBF', 700: '#007A97', 800: '#005770', 900: '#003348' },
        violet:  { DEFAULT: '#7C3AED', light: '#A78BFA' },
        amber:   { DEFAULT: '#F59E0B', light: '#FCD34D' },
        rose:    { DEFAULT: '#F43F5E', light: '#FDA4AF' },
        emerald: { DEFAULT: '#10B981', light: '#6EE7B7' },
        glass:   { DEFAULT: 'rgba(255,255,255,0.05)', hover: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.1)' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
        'radial-glow':  'radial-gradient(ellipse at top, rgba(0,212,255,0.15) 0%, transparent 60%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'glow-cyan':  '0 0 20px rgba(0,212,255,0.3)',
        'glow-rose':  '0 0 20px rgba(244,63,94,0.3)',
        'glow-amber': '0 0 20px rgba(245,158,11,0.3)',
        'glass':      '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        glow:    { from: { boxShadow: '0 0 5px rgba(0,212,255,0.2)' }, to: { boxShadow: '0 0 20px rgba(0,212,255,0.5)' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({ strategy: 'class' }),
  ],
};
