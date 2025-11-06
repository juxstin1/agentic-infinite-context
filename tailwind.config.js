/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./design-system/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Premium dark gradient palette
        bg: {
          950: '#0A0D14',
          900: '#0D1220',
          800: '#11172A',
        },
        surface: {
          900: '#0F1422',
          800: '#141B2E',
          700: '#192339',
        },
        brand: {
          300: '#A78BFA',
          400: '#9333EA',
          500: '#7C3AED',
          600: '#6D28D9',
          700: '#5B21B6',
        },
        accent: {
          400: '#22D3EE',
          500: '#06B6D4',
        },
        text: {
          primary: '#E6EAF2',
          secondary: '#A6B0C3',
          muted: '#7E89A6',
        },
        success: {
          light: '#22C55E',
          DEFAULT: '#16A34A',
        },
        warning: {
          light: '#F59E0B',
          DEFAULT: '#D97706',
        },
        error: {
          light: '#EF4444',
          DEFAULT: '#DC2626',
        },
        border: '#1E2A44',
      },
      boxShadow: {
        soft: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 8px 30px rgba(0,0,0,0.45)',
        lift: '0 8px 24px rgba(124,58,237,0.22)',
        glow: '0 0 60px rgba(124,58,237,0.15)',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.5rem',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'gradient-x': 'gradient-x 14s ease infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
