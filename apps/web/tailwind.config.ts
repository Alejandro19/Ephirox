import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF7F1",
        paper: "#FFFFFF",
        ink: "#1A1712",
        "ink-soft": "#6B6058",
        "ink-secondary": "#8A867C",
        terracota: {
          DEFAULT: "#C1662F",
          soft: "#F1DDCB",
        },
        sage: {
          DEFAULT: "#6B8F71",
          soft: "#E3EDE3",
        },
        gold: "#D9A441",
        line: "#E9E1D6",
        danger: "#C1462F",
        "ring-morning": "#D9A441",
        "ring-afternoon": "#5B7A4E",
        "ring-evening": "#8A5FA0",
        neutral: {
          bg: "#F5F1E9",
          line: "#E7DFC9",
          accent: "#B8935A",
        },
        green: {
          bg: "#EFF5E8",
          line: "#D9E4CE",
          accent: "#5B7A4E",
        },
        "page-bg": "#FCFAF6",
        "hero-espresso": {
          DEFAULT: "#3D3226",
          text: "#F5EFE2",
          "text-muted": "#B8ABA0",
          accent: "#D9B77E",
        },
        "hero-piedra": {
          start: "#E8DFCE",
          end: "#C7B9A4",
          text: "#2E2618",
          "text-muted": "#5C513E",
          accent: "#6B5C42",
        },
        "border-hairline": "#EAE6DC",
        "border-input": "#E4E0D5",
        "ring-accent": "#C9A66B",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        default: "16px",
        hero: "16px",
        card: "14px",
        control: "9px",
      },
    },
  },
  plugins: [],
};

export default config;
