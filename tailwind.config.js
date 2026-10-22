/** @type {import('"'"'tailwindcss'"'"').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,svelte}",
  ],
  theme: {
    extend: {
      fontFamily: {
        barlow: ['"'"'Barlow Condensed'"'"', '"'"'sans-serif'"'"'],
        caveat: ['"'"'Caveat'"'"', '"'"'cursive'"'"'],
        mali: ['"'"'Mali'"'"', '"'"'sans-serif'"'"'],
        special: ['"'"'Special Elite'"'"', '"'"'cursive'"'"'],
      },
      colors: {
        antiquewhite: '"'"'#FAEBD7'"'"',
        cream: '"'"'#F5F0E1'"'"',
        graphite: '"'"'#2D2D2D'"'"',
      },
    },
  },
  plugins: [],
}
