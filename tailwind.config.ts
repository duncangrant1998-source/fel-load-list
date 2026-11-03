import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fel: {
          bg: "#0f1115",
          panel: "#171a21",
          panel2: "#1f232c",
          border: "#2a2f3a",
          red: "#d1272d",
          blue: "#1f6feb",
          green: "#1f8a4c",
          amber: "#e0a30f",
        },
      },
      fontFamily: {
        sans: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
