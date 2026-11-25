/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070c18',
          900: '#0b1329',
          800: '#111e3f',
          700: '#1a2c5b',
          600: '#263d7a',
        },
        gold: {
          50: '#fbf8ea',
          100: '#f5eecc',
          200: '#ebdc9a',
          300: '#dfc363',
          400: '#d4af37', // signature gold
          500: '#c59d29',
          600: '#a37b1d',
          700: '#7e5a19',
          800: '#68481b',
          900: '#583c1b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

