/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'lab(59.0978% -58.6621 41.2579)',
          hover: 'lab(54% -50 35)',
          light: '#E8F5EE',
        },
        sidebar: '#F7F7F7',
        border: '#EBEBEB',
        text: {
          dark: '#171717',
          gray: '#5C5C5C',
          light: '#A4A4A4',
        },
      },
    },
  },
  plugins: [],
}

