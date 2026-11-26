/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Karur Gold Finance (KGF) signature brand palette
        kgf: {
          red: '#dc2626',
          crimson: '#b91c1c',
          ruby: '#991b1b',
          bright: '#ef4444',
          silver: '#e2e8f0',
          chrome: '#94a3b8',
          charcoal: '#1e293b',
          dark: '#070a14',
        },
        navy: {
          950: '#070a14',
          900: '#0c1222',
          800: '#121b33',
          700: '#1a2749',
          600: '#253766',
        },
        // Mapped to the logo's signature Crimson/Ruby Red across all amber & gold references
        amber: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        gold: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
