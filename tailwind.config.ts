import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        block: {
          source: '#22c55e',
          sink: '#3b82f6',
          math: '#f97316',
          linear: '#a855f7',
          nonlinear: '#ef4444',
          control: '#14b8a6',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
