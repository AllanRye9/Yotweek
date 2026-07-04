/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sunset: {
          50: "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
        savanna: {
          800: "#3f3320",
          900: "#2a2213",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: ["Inter Variable", "sans-serif"],
      },
    },
  },
  plugins: [],
};
