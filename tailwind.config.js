/** @type {import('tailwindcss').Config} */
const withOpacity = (cssVar) => {
  return ({ opacityValue } = {}) => {
    if (opacityValue === undefined) return `rgb(var(${cssVar}))`;
    return `rgb(var(${cssVar}) / ${opacityValue})`;
  };
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: withOpacity('--background'),
        card: withOpacity('--card'),
        border: withOpacity('--border'),
        text: {
          primary: withOpacity('--text-primary'),
          secondary: withOpacity('--text-secondary'),
        },
        primary: withOpacity('--primary'),
        secondary: withOpacity('--secondary'),
        success: withOpacity('--success'),
        warning: withOpacity('--warning'),
        error: withOpacity('--error'),
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgb(var(--primary) / 0.22)',
      },
      animation: {
        'gradient-x': 'gradient-x 10s ease infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-position': '0% 50%',
          },
          '50%': {
            'background-position': '100% 50%',
          },
        },
      },
    },
  },
  plugins: [],
};