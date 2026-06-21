/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        cream: {
          50:  '#FAF7F2',
          100: '#F2EDE4',
          200: '#EDE8DF',
          300: '#E0D8CC',
          400: '#C8C0B4',
          500: '#B8A898',
        },
        terra: {
          DEFAULT: '#C4532A',
          dark:    '#AE4623',
          light:   '#D4835A',
          pale:    '#F0D4C4',
        },
        sage: {
          DEFAULT: '#7A9B6A',
          dark:    '#5A7A4A',
          pale:    '#D4E4C4',
        },
        teal: {
          DEFAULT: '#4AACA8',
          dark:    '#2A7C78',
          pale:    '#C4E8E4',
        },
        navy: {
          DEFAULT: '#1E2D4E',
          light:   '#2E4068',
        },
        ink: '#2C2825',
        muted: '#8A7D72',
      },
    },
  },
  plugins: [],
}
