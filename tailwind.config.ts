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
          'radial-gradient(600px circle at 20% 0%, rgba(0,0,0,0.1), transparent 60%)',
        'accent-radial-dark':
          'radial-gradient(600px circle at 20% 0%, rgba(255,255,255,0.1), transparent 60%)',
        'gradient-ambient-light': 
          'linear-gradient(135deg, #ffffff 0%, #f3f4f6 25%, #e5e7eb 100%)',
        'gradient-ambient-dark':
          'linear-gradient(135deg, #000000 0%, #111827 25%, #1f2937 100%)',
        'gradient-radial': 
          'radial-gradient(circle at center, var(--tw-gradient-stops))',
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