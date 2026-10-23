/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#fdfbf7",
          50: "#ffffff",
          100: "#fdfbf7",
          200: "#f6f1e8",
          300: "#ece3d4",
          400: "#dfd0b9",
        },
        forest: {
          DEFAULT: "#1a382b",
          light: "#234938",
          dark: "#12261d",
          accent: "#2d5a44",
        },
        burgundy: {
          DEFAULT: "#722f37",
          light: "#8a3943",
          dark: "#532228",
        },
        terracotta: {
          DEFAULT: "#c85a44",
          light: "#d96f5a",
          dark: "#a64330",
        },
        ink: {
          900: "#18181b",
          800: "#27272a",
          700: "#3f3f46",
          600: "#52525b",
          500: "#71717a",
        },
      },
      fontFamily: {
        serif: ["Merriweather", "Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        book: "0 10px 25px -5px rgba(26, 56, 43, 0.08), 0 8px 10px -6px rgba(26, 56, 43, 0.04)",
        card: "0 4px 20px -2px rgba(24, 24, 27, 0.05), 0 2px 6px -1px rgba(24, 24, 27, 0.03)",
      },
    },
  },
  plugins: [],
};
