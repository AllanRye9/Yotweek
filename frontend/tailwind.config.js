/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: { xs: "375px" },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
      colors: {
        brand: {
          50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd",
          300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9",
          600: "#0284c7", 700: "#0369a1", 800: "#075985", 900: "#0c4a6e",
        },
        sunset: {
          50: "#fff4ed", 100: "#ffe6d5", 200: "#fecdaa", 300: "#fdad74",
          400: "#fb8a3c", 500: "#f9711a", 600: "#ea5a10", 700: "#c24310",
          800: "#9a3615", 900: "#7c2f14",
        },
        surface: { DEFAULT: "#ffffff", muted: "#f8fafc", subtle: "#f1f5f9" },
      },
      animation: {
        "fade-in":       "fadeIn 0.4s ease-out",
        "fade-up":       "fadeUp 0.5s ease-out",
        "slide-down":    "slideDown 0.3s ease-out",
        "scale-in":      "scaleIn 0.2s ease-out",
        "slide-left":    "slideLeft 0.35s ease-out",
        shimmer:         "shimmer 1.5s ease-in-out infinite",
        ticker:          "ticker 32s linear infinite",
        "float":         "float 6s ease-in-out infinite",
        "pulse-glow":    "pulseGlow 2.5s ease-in-out infinite",
        "slide-up-fade": "slideUpFade 0.6s ease-out",
      },
      keyframes: {
        fadeIn:      { from:{ opacity:"0" }, to:{ opacity:"1" } },
        fadeUp:      { from:{ opacity:"0", transform:"translateY(20px)" }, to:{ opacity:"1", transform:"translateY(0)" } },
        slideDown:   { from:{ opacity:"0", transform:"translateY(-12px)" }, to:{ opacity:"1", transform:"translateY(0)" } },
        scaleIn:     { from:{ opacity:"0", transform:"scale(0.93)" }, to:{ opacity:"1", transform:"scale(1)" } },
        slideLeft:   { from:{ opacity:"0", transform:"translateX(20px)" }, to:{ opacity:"1", transform:"translateX(0)" } },
        shimmer:     { "0%":{ backgroundPosition:"-600px 0" }, "100%":{ backgroundPosition:"600px 0" } },
        ticker:      { "0%":{ transform:"translateX(0)" }, "100%":{ transform:"translateX(-50%)" } },
        float:       { "0%,100%":{ transform:"translateY(0)" }, "50%":{ transform:"translateY(-12px)" } },
        pulseGlow:   { "0%,100%":{ boxShadow:"0 0 0 0 rgba(14,165,233,0.35)" }, "50%":{ boxShadow:"0 0 0 10px rgba(14,165,233,0)" } },
        slideUpFade: { from:{ opacity:"0", transform:"translateY(30px)" }, to:{ opacity:"1", transform:"translateY(0)" } },
      },
      boxShadow: {
        card:          "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover":  "0 24px 48px -12px rgba(15,23,42,0.14), 0 8px 20px -6px rgba(15,23,42,0.08)",
        glow:          "0 0 24px rgba(14,165,233,0.28)",
        "glow-lg":     "0 0 48px rgba(14,165,233,0.35)",
        sunset:        "0 8px 24px -6px rgba(249,113,26,0.4)",
        "inner-top":   "inset 0 2px 4px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
