/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#273469',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#273469',
          600: '#273469',
          700: '#273469',
          800: '#991b1b',
          900: '#7f1d1d',
          hover: '#1D2854',
        },
        coral: {
          DEFAULT: '#f15b2a',
          500: '#f15b2a',
        },
        brand: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#e5322d',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
