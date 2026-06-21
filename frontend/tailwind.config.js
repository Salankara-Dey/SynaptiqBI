/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#f0f4ff", 500: "#4f6ef7", 600: "#3b55e6", 700: "#2d42d4" },
      },
      fontFamily: {
        sans: ["'Syne'", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
