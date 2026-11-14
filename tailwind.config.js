/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f6f3',
          100: '#dcece3',
          200: '#bbd9cb',
          300: '#8ebfae',
          400: '#5ca08c',
          500: '#38826f',
          600: '#286857',
          700: '#1f5346',
          800: '#194633', // Primary brand color
          900: '#153a2b',
          950: '#0b2118',
        },
        gold: {
          50: '#fdfbf4',
          100: '#f9f5e6',
          200: '#f2e8c4',
          300: '#e9d799',
          400: '#dec46e',
          500: '#DDB956', // Secondary brand gold
          600: '#c59d3e',
          700: '#9d782e',
          800: '#7e602b',
          900: '#684f27',
          950: '#3b2b13',
        },
        cream: {
          50: '#ffffff',
          100: '#F8F6F0', // Brand cream background
          200: '#f1ede3',
          300: '#e5dfd1',
          400: '#d5ccb9',
          500: '#c2b59e',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(25, 70, 51, 0.06), 0 2px 6px -1px rgba(25, 70, 51, 0.04)',
        'elevated': '0 12px 32px -4px rgba(25, 70, 51, 0.12), 0 4px 12px -2px rgba(25, 70, 51, 0.08)',
      },
    },
  },
  plugins: [],
}
