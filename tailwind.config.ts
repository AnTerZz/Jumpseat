import type { Config } from 'tailwindcss';

// Palette "tour de contrôle / tableau des départs" :
// fond bleu nuit profond, accent ambre (feu de piste), accent turquoise (radar),
// vert/rouge pour les résultats d'embarquement.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0E1420',
        'navy-panel': '#161D2E',
        'navy-line': '#232B40',
        amber: '#FFB627',
        teal: '#3DD6C7',
        boarded: '#3ECB7A',
        denied: '#F2545B',
        'text-primary': '#E7ECF5',
        'text-muted': '#8792A6',
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
};

export default config;
