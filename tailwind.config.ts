import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#011B2C",
        card: "#04314C",
        gold: "#EBBC75",
        cream: "#F3DA98",
      },
      fontFamily: {
        display: ["'Bodoni Moda'", "serif"],
        body: ["Lato", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
