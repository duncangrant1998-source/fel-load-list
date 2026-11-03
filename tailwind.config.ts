import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fel: {
          bg: "#06191d",
          panel: "#0c2126",
          panel2: "#132a30",
          border: "#1f3b42",
          red: "#c72127",
          blue: "#3b8fc4",
          green: "#2e9e5b",
          amber: "#e0a30f",
        },
      },
      fontFamily: {
        sans: ["Avenir", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
