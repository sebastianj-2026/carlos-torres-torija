/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        naranja: {
          principal: '#F97316',
          oscuro: '#EA580C',
        }
      }
    },
  },
  plugins: [],
}