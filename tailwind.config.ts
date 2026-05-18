import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Navy — anchored on the brief's #0B1F4B
        brand: {
          50: "#eef2f9",
          100: "#d6deef",
          200: "#aebcdb",
          300: "#7e91c3",
          400: "#5269a8",
          500: "#324c8e",
          600: "#243a72",
          700: "#1a2c5a",
          800: "#122046",
          900: "#0B1F4B",
          950: "#06122e",
        },
        // Warm Gold / Amber — anchored on the brief's #D4A017
        gold: {
          50: "#fdf8e7",
          100: "#fbedb9",
          200: "#f6da7e",
          300: "#efc24b",
          400: "#e3ac28",
          500: "#D4A017",
          600: "#b07d11",
          700: "#8a5d12",
          800: "#714a15",
          900: "#5e3e17",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial"],
        serif: ["var(--font-serif)", "Georgia", "ui-serif", "serif"],
        display: ["var(--font-serif)", "Georgia", "ui-serif", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(11,31,75,0.06)",
        lift: "0 10px 30px rgba(11,31,75,0.10)",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, rgba(11,31,75,0.94) 0%, rgba(26,44,90,0.88) 100%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
