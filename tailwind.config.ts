import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: 'hsl(var(--accent) / <alpha-value>)',
      },
      boxShadow: {
        'elev-1': 'var(--elev-1)',
        'elev-2': 'var(--elev-2)',
      },
      backgroundImage: {
        'accent-radial':
          'radial-gradient(600px circle at 20% 0%, hsl(var(--accent) / 0.20), transparent 60%)',
        'accent-radial-dark':
          'radial-gradient(600px circle at 20% 0%, hsl(var(--accent) / 0.12), transparent 60%)',
        'gradient-ambient-light': 
          'linear-gradient(135deg, #ffffff 0%, #f0f9ff 25%, #e2e8f0 100%)',
        'gradient-ambient-dark':
          'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 100%)',
      },
      backdropBlur: {
        'glass': 'var(--blur)',
      },
      backdropSaturate: {
        'glass': 'var(--saturate)',
      },
    },
  },
  plugins: [],
}
export default config