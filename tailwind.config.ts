import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060B16",
          900: "#080F1F",
          800: "#0D1830",
          700: "#132244",
          600: "#1B2E58",
        },
        gold: {
          300: "#E8CF9A",
          400: "#D8B878",
          500: "#C6A15B",
          600: "#A98443",
          700: "#83652F",
        },
        ivory: {
          50: "#FBF9F4",
          100: "#F7F3EA",
          200: "#EDE6D6",
          300: "#DDD2B8",
        },
        mist: "#8FA3C8",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(4, 10, 24, 0.45)",
        glow: "0 0 40px rgba(198, 161, 91, 0.25)",
        lift: "0 20px 60px rgba(4, 10, 24, 0.6)",
      },
      animation: {
        aurora: "aurora 18s ease-in-out infinite alternate",
        marquee: "marquee 36s linear infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
      keyframes: {
        aurora: {
          "0%": { transform: "translate(-8%, -6%) rotate(0deg) scale(1)" },
          "50%": { transform: "translate(6%, 4%) rotate(12deg) scale(1.12)" },
          "100%": { transform: "translate(-4%, 8%) rotate(-8deg) scale(1.05)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
